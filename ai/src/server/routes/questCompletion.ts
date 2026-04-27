import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Server, IncomingMessage, ServerResponse } from "node:http";
import { findCharacter, loadCharacters } from "../../characters.js";
import { runQuestCompletionPipeline } from "../../lifecycle/pipeline.js";
import { loadAllMemory } from "../../memory/store.js";
import { notifyQuestComplete } from "../../notify/game-api.js";
import { createSession } from "../../session.js";
import type {
  Character,
  QuestCompletionPayload,
  QuestOutcome,
} from "../../types.js";
import { readJsonBody, sendError, sendJson } from "../http.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(__dirname, "../../../docs/prompts");

let cachedCharacters: Character[] | null = null;
function getCharacters(): Character[] {
  if (!cachedCharacters) cachedCharacters = loadCharacters(PROMPTS_DIR);
  return cachedCharacters;
}

const VALID_OUTCOMES: ReadonlyArray<QuestOutcome> = ["success", "failure", "abandoned"];

async function handleQuestComplete(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  let body: {
    character?: unknown;
    questId?: unknown;
    outcome?: unknown;
    rewardReceived?: unknown;
    playerLevel?: unknown;
  };
  try {
    body = (await readJsonBody(req)) as typeof body;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "invalid_json") {
      sendError(res, 400, "invalid_json", "Request body is not valid JSON.");
      return;
    }
    throw err;
  }

  const characterName =
    typeof body.character === "string" ? body.character.trim() : "";
  const questId = typeof body.questId === "string" ? body.questId.trim() : "";
  const outcome = body.outcome;
  const rewardReceived = Boolean(body.rewardReceived);
  const playerLevel =
    typeof body.playerLevel === "number" && Number.isFinite(body.playerLevel)
      ? body.playerLevel
      : 1;

  if (
    typeof outcome !== "string" ||
    !(VALID_OUTCOMES as readonly string[]).includes(outcome)
  ) {
    sendError(
      res,
      400,
      "invalid_outcome",
      "Field 'outcome' must be one of success | failure | abandoned."
    );
    return;
  }

  if (!characterName) {
    sendError(res, 400, "unknown_character", "Field 'character' is required.");
    return;
  }

  const character = findCharacter(getCharacters(), characterName);
  if (!character) {
    sendError(res, 400, "unknown_character", `Unknown character: ${characterName}`);
    return;
  }

  if (!questId) {
    sendError(res, 400, "invalid_quest_id", "Field 'questId' is required.");
    return;
  }

  const { characterMemory } = await loadAllMemory(character.name);
  const rel = characterMemory.relationship;
  const synthSession = createSession(character, characterMemory);

  const payload: QuestCompletionPayload = {
    character: character.name,
    questId,
    outcome: outcome as QuestOutcome,
    playerState: { level: playerLevel },
    relationshipSnapshot: {
      trust: rel.trust,
      dependency: rel.dependency,
      bond: rel.bond,
      wariness: rel.wariness,
    },
    rewardReceived,
  };

  const result = await runQuestCompletionPipeline(synthSession, payload);

  if (result.applied) {
    try {
      await notifyQuestComplete({
        ...payload,
        eventTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[bridge] notifyQuestComplete failed:", err);
    }
  }

  sendJson(res, 200, { applied: result.applied, reason: result.reason });
}

export function register(server: Server): void {
  server.addRoute("POST", "/api/v1/quest/complete", handleQuestComplete);
}
