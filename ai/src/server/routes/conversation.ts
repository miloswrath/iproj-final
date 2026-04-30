import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Server, IncomingMessage, ServerResponse } from "node:http";
import { findCharacter, loadCharacters } from "../../characters.js";
import { sendMessage } from "../../client.js";
import { buildEnrichedSystemPrompt } from "../../memory/context.js";
import {
  loadAllMemory,
  getAllQuestTitles,
  saveQuestRecord,
  getCompletedQuestIds,
} from "../../memory/store.js";
import {
  detectAcceptance,
  detectQuestOffer,
  enforceUniqueQuestTitle,
  generateQuestLore,
} from "../../lifecycle/detector.js";
import {
  runPostConversationPipeline,
  runWithNotification,
} from "../../lifecycle/pipeline.js";
import {
  createSession,
  freezeSession,
  setQuestOffered,
} from "../../session.js";
import type { AuthoritativeState, Character, ConversationState, QuestRecord } from "../../types.js";
import { readJsonBody, sendError, sendJson } from "../http.js";
import * as registry from "../sessionRegistry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(__dirname, "../../../docs/prompts");

let cachedCharacters: Character[] | null = null;
function getCharacters(): Character[] {
  if (!cachedCharacters) cachedCharacters = loadCharacters(PROMPTS_DIR);
  return cachedCharacters;
}

function isConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { constructor?: { name?: string } }).constructor?.name ?? "";
  if (name === "APIConnectionError" || name === "APIConnectionTimeoutError") return true;
  const msg = (err as { message?: unknown }).message;
  if (typeof msg !== "string") return false;
  const lower = msg.toLowerCase();
  return (
    lower.includes("connection error") ||
    lower.includes("econnrefused") ||
    lower.includes("fetch failed")
  );
}

function snapshotState(state: ConversationState): ConversationState {
  return {
    phase: state.phase,
    questOffered: state.questOffered,
    terminationReason: state.terminationReason,
    frozen: state.frozen,
    assistantResponseCount: state.assistantResponseCount,
    firstQuestOfferTurn: state.firstQuestOfferTurn,
  };
}

function parsePlayerLevel(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.floor(value))
    : 1;
}

function createAuthoritativeState(playerLevel: number): AuthoritativeState {
  return {
    player: {
      level: playerLevel,
      activeQuest: null,
      completedQuests: [],
    },
    world: {
      companionsUnlocked: [],
      globalFlags: {},
    },
  };
}

async function handleStart(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: { character?: unknown; playerLevel?: unknown };
  try {
    body = (await readJsonBody(req)) as { character?: unknown; playerLevel?: unknown };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "invalid_json") {
      sendError(res, 400, "invalid_json", "Request body is not valid JSON.");
      return;
    }
    throw err;
  }

  const characterName = typeof body.character === "string" ? body.character.trim() : "";
  if (!characterName) {
    sendError(res, 400, "unknown_character", "Field 'character' is required.");
    return;
  }

  const characters = getCharacters();
  const character = findCharacter(characters, characterName);
  if (!character) {
    sendError(res, 400, "unknown_character", `Unknown character: ${characterName}`);
    return;
  }

  const { playerProfile, playerSummary, characterMemory } = await loadAllMemory(
    character.name
  );
  const recentQuestIds = await getCompletedQuestIds(character.name, 3).catch(() => [] as string[]);
  const enrichedPrompt = buildEnrichedSystemPrompt(
    character.systemPrompt,
    characterMemory,
    playerSummary,
    recentQuestIds
  );
  const enriched: Character = { ...character, systemPrompt: enrichedPrompt };

  const session = createSession(enriched, characterMemory);
  session.authoritativeState = createAuthoritativeState(parsePlayerLevel(body.playerLevel));

  let greeting: string;
  try {
    greeting = await sendMessage(
      session,
      "[system: introduce yourself briefly to the player]"
    );
  } catch (err) {
    if (isConnectionError(err)) {
      sendError(
        res,
        503,
        "lm_studio_unavailable",
        "LM Studio is not running at localhost:1234."
      );
      return;
    }
    throw err;
  }

  if (greeting === "__CONNECTION_ERROR__") {
    sendError(
      res,
      503,
      "lm_studio_unavailable",
      "LM Studio is not running at localhost:1234."
    );
    return;
  }

  const sessionId = randomUUID();
  registry.create(sessionId, session, playerProfile, playerSummary);

  sendJson(res, 201, {
    sessionId,
    character: character.name,
    greeting,
    conversationState: snapshotState(session.conversationState),
  });
}

async function handleMessage(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const sessionId = params["sessionId"] ?? "";
  const entry = registry.get(sessionId);
  if (!entry) {
    sendError(res, 404, "session_not_found", "Unknown sessionId.");
    return;
  }
  if (entry.terminated) {
    sendError(res, 410, "session_terminated", "Session has already terminated.");
    return;
  }

  let body: { text?: unknown };
  try {
    body = (await readJsonBody(req)) as { text?: unknown };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "invalid_json") {
      sendError(res, 400, "invalid_json", "Request body is not valid JSON.");
      return;
    }
    throw err;
  }

  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) {
    sendError(res, 400, "empty_message", "Field 'text' must be non-empty.");
    return;
  }
  if (text.length > 4000) {
    sendError(res, 400, "message_too_long", "Field 'text' exceeds 4000 chars.");
    return;
  }

  registry.touch(sessionId);
  const { session } = entry;
  const phaseBeforeReply = session.conversationState.phase;
  let reply: string;
  try {
    reply = await sendMessage(session, text);
  } catch (err) {
    if (isConnectionError(err)) {
      sendError(
        res,
        503,
        "lm_studio_unavailable",
        "LM Studio is not running at localhost:1234."
      );
      return;
    }
    throw err;
  }

  if (reply === "__CONNECTION_ERROR__") {
    sendError(
      res,
      503,
      "lm_studio_unavailable",
      "LM Studio is not running at localhost:1234."
    );
    return;
  }

  if (phaseBeforeReply === "ACTIVE") {
    const offerResult = await detectQuestOffer(
      reply,
      session.activeCharacter.name,
      session.activeMemory.progression.questLevel,
      {
        assistantResponseCount: session.conversationState.assistantResponseCount,
        firstQuestOfferTurn: session.conversationState.firstQuestOfferTurn,
      }
    );
    if (offerResult.offered) {
      setQuestOffered(session, offerResult.questId);
      // Stash title for use at acceptance time
      (entry as any)._pendingQuestTitle = offerResult.questTitle;
      (entry as any)._pendingQuestNpcText = reply;
    }
  }

  if (
    phaseBeforeReply === "ESCALATION" ||
    phaseBeforeReply === "DECISION"
  ) {
    const questContext = session.conversationState.questOffered ?? "the task";
    const { accepted, reason } = await detectAcceptance(text, questContext);

    if (accepted) {
      freezeSession(session, reason === "none" ? null : reason);
      const confirmReply = await sendMessage(
        session,
        "[system: player accepted the quest. Give a brief, in-character confirmation.]"
      );
      const finalReply =
        confirmReply === "__CONNECTION_ERROR__" ? reply : confirmReply;
      const questId = session.conversationState.questOffered ?? "unknown_quest";

      // Build unique title and optionally generate lore
      let questTitle: string = (entry as any)._pendingQuestTitle ?? questId;
      let lore: string | null = null;
      try {
        const existingTitles = await getAllQuestTitles();
        questTitle = enforceUniqueQuestTitle(questTitle, existingTitles);
        const npcText = (entry as any)._pendingQuestNpcText ?? "";
        if (npcText) {
          lore = await generateQuestLore(questTitle, npcText, session.activeCharacter.name);
        }
      } catch (err) {
        console.error("[bridge] title/lore generation failed:", err);
      }

      // Persist quest record
      try {
        const questRecord: QuestRecord = {
          questId,
          title: questTitle,
          character: session.activeCharacter.name,
          status: "active",
          acceptedAt: new Date().toISOString(),
          completedAt: null,
          lore,
          sourceConversationId: sessionId,
          memorySyncPending: false,
          completionOutcome: null,
        };
        await saveQuestRecord(questRecord);
      } catch (err) {
        console.error("[bridge] quest record save failed:", err);
      }

      try {
        await runWithNotification(session, questId, questTitle, lore);
      } catch (err) {
        console.error("[bridge] runWithNotification failed:", err);
      }
      entry.terminated = true;
      const stateSnapshot = snapshotState(session.conversationState);
      registry.remove(sessionId);
      sendJson(res, 200, {
        reply: finalReply,
        conversationState: stateSnapshot,
        terminated: true,
      });
      return;
    }

    if (phaseBeforeReply === "ESCALATION") {
      session.conversationState.phase = "DECISION";
    }
  }

  sendJson(res, 200, {
    reply,
    conversationState: snapshotState(session.conversationState),
    terminated: false,
  });
}

async function handleEnd(
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
): Promise<void> {
  const sessionId = params["sessionId"] ?? "";
  const entry = registry.get(sessionId);
  if (!entry) {
    sendError(res, 404, "session_not_found", "Unknown sessionId.");
    return;
  }
  if (entry.terminated) {
    sendError(res, 410, "session_terminated", "Session has already terminated.");
    return;
  }

  let body: { reason?: unknown };
  try {
    body = (await readJsonBody(req)) as { reason?: unknown };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "invalid_json") {
      sendError(res, 400, "invalid_json", "Request body is not valid JSON.");
      return;
    }
    throw err;
  }

  const reasonRaw = typeof body.reason === "string" ? body.reason : "exit";
  if (reasonRaw !== "exit" && reasonRaw !== "simulate") {
    sendError(res, 400, "invalid_reason", "Field 'reason' must be 'exit' or 'simulate'.");
    return;
  }

  const { session } = entry;
  if (!session.conversationState.terminationReason) {
    freezeSession(session, reasonRaw);
  }
  try {
    await runPostConversationPipeline(session);
  } catch (err) {
    console.error("[bridge] runPostConversationPipeline failed:", err);
  } finally {
    entry.terminated = true;
    registry.remove(sessionId);
  }

  sendJson(res, 200, { ok: true });
}

export function register(server: Server): void {
  server.addRoute("POST", "/api/v1/conversation/start", handleStart);
  server.addRoute("POST", "/api/v1/conversation/:sessionId/message", handleMessage);
  server.addRoute("POST", "/api/v1/conversation/:sessionId/end", handleEnd);
}
