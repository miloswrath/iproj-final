import path from "path";
import { fileURLToPath } from "url";
import { loadCharacters, findCharacter } from "../characters.js";
import { sendMessage } from "../client.js";
import { conflict, internalError, notFound, unsupportedCharacter } from "../errors.js";
import { detectAcceptance, detectQuestOffer } from "../lifecycle/detector.js";
import { runWithNotification, runPostConversationPipeline } from "../lifecycle/pipeline.js";
import { buildEnrichedSystemPrompt } from "../memory/context.js";
import { loadAllMemory } from "../memory/store.js";
import {
  createConversationSession,
  discardSessionHistory,
  freezeSession,
  setQuestOffered,
} from "../session.js";
import { ConversationRegistry } from "../session-registry.js";
import type {
  ConversationStateResponse,
  EndConversationRequest,
  MessageConversationRequest,
  StartConversationRequest,
} from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(__dirname, "../../docs/prompts");

function toStateResponse(conversationId: string, state: ReturnType<ConversationRegistry["getState"]>): ConversationStateResponse {
  if (!state) {
    throw notFound(`Conversation ${conversationId} does not exist`);
  }

  if (state.status === "active") {
    return {
      conversationId,
      character: state.character,
      phase: state.phase,
      questOffered: state.questOffered,
      terminationReason: state.terminationReason,
      status: "active",
      lastUpdatedAt: new Date(state.lastUpdatedAt).toISOString(),
    };
  }

  return {
    conversationId,
    character: state.character,
    phase: "TERMINATION",
    questOffered: null,
    terminationReason: state.terminationReason,
    status: "terminated",
    lastUpdatedAt: new Date(state.lastUpdatedAt).toISOString(),
  };
}

export class ConversationService {
  private registry = new ConversationRegistry();
  private characters = loadCharacters(PROMPTS_DIR);

  async start(request: StartConversationRequest): Promise<ConversationStateResponse> {
    const knownCharacter = findCharacter(this.characters, request.character);
    if (!knownCharacter) {
      throw unsupportedCharacter(request.character);
    }

    const existing = this.registry.getActive(request.conversationId);
    if (existing) {
      return {
        conversationId: request.conversationId,
        character: existing.character,
        phase: existing.session.conversationState.phase,
        questOffered: existing.session.conversationState.questOffered,
        terminationReason: existing.session.conversationState.terminationReason,
        status: "active",
      };
    }

    if (this.registry.hasTerminated(request.conversationId)) {
      throw conflict(
        "conversation_terminated",
        `Conversation ${request.conversationId} is already terminated`
      );
    }

    const { characterMemory, playerSummary } = await loadAllMemory(knownCharacter.name);
    const enrichedPrompt = buildEnrichedSystemPrompt(
      knownCharacter.systemPrompt,
      characterMemory,
      playerSummary
    );
    const session = createConversationSession({ ...knownCharacter, systemPrompt: enrichedPrompt }, characterMemory);

    this.registry.createOrGetActive({
      conversationId: request.conversationId,
      playerId: request.playerId,
      character: knownCharacter.name,
      metadata: request.metadata,
      session,
    });

    return {
      conversationId: request.conversationId,
      character: knownCharacter.name,
      phase: "ACTIVE",
      questOffered: null,
      terminationReason: null,
      status: "active",
    };
  }

  async message(request: MessageConversationRequest): Promise<unknown> {
    try {
      const replay = this.registry.getMessageSnapshot(
        request.conversationId,
        request.idempotencyKey,
        request
      );
      if (replay) return replay;
    } catch {
      throw conflict("invalid_idempotency_reuse", "Idempotency key reused with different request payload");
    }

    const active = this.registry.getActive(request.conversationId);
    if (!active) {
      if (this.registry.hasTerminated(request.conversationId)) {
        throw conflict("invalid_state_transition", `Conversation ${request.conversationId} is terminated`);
      }
      throw notFound(`Conversation ${request.conversationId} does not exist`);
    }

    if (active.session.conversationState.frozen) {
      throw conflict("invalid_state_transition", `Conversation ${request.conversationId} is terminated`);
    }

    this.registry.touch(request.conversationId);

    const phaseBefore = active.session.conversationState.phase;
    const reply = await sendMessage(active.session, request.text);
    if (reply === "__CONNECTION_ERROR__") {
      throw internalError("LLM service unavailable");
    }

    if (active.session.conversationState.phase === "ACTIVE") {
      const { offered, questId } = await detectQuestOffer(
        reply,
        active.session.activeCharacter.name,
        active.session.activeMemory.progression.questLevel
      );
      if (offered) {
        setQuestOffered(active.session, questId);
      }
    }

    let ended = false;
    let reason: string | null = null;

    if (phaseBefore === "ESCALATION" || phaseBefore === "DECISION" || active.session.conversationState.phase === "ESCALATION") {
      const questContext = active.session.conversationState.questOffered ?? "the task";
      const result = await detectAcceptance(request.text, questContext);

      if (result.accepted) {
        freezeSession(active.session, result.reason === "none" ? null : result.reason);
        reason = active.session.conversationState.terminationReason ?? "rule";

        const confirmReply = await sendMessage(
          active.session,
          "[system: player accepted the quest. Give a brief, in-character confirmation.]"
        );
        if (confirmReply === "__CONNECTION_ERROR__") {
          throw internalError("LLM service unavailable during termination confirmation");
        }

        const questId = active.session.conversationState.questOffered ?? "unknown_quest";
        await runWithNotification(active.session, questId);
        discardSessionHistory(active.session);
        this.registry.markTerminated(request.conversationId, reason);
        ended = true;
      } else if (phaseBefore === "ESCALATION") {
        active.session.conversationState.phase = "DECISION";
      }
    }

    const response = {
      conversationId: request.conversationId,
      npcText: reply,
      phase: ended ? "TERMINATION" : active.session.conversationState.phase,
      quest: {
        offered: active.session.conversationState.questOffered !== null,
        questId: active.session.conversationState.questOffered,
      },
      termination: {
        ended,
        reason,
      },
      uiHints: {
        tone: active.session.conversationState.phase === "DECISION" ? "directive" : "neutral",
        urgency: active.session.conversationState.phase === "DECISION" ? "medium" : "low",
      },
    };

    this.registry.saveMessageSnapshot(
      request.conversationId,
      request.idempotencyKey,
      request,
      response
    );

    return response;
  }

  async end(request: EndConversationRequest): Promise<unknown> {
    try {
      const replay = this.registry.getEndSnapshot(
        request.conversationId,
        request.idempotencyKey,
        request
      );
      if (replay) return replay;
    } catch {
      throw conflict("invalid_idempotency_reuse", "Idempotency key reused with different request payload");
    }

    const active = this.registry.getActive(request.conversationId);
    if (!active) {
      if (this.registry.hasTerminated(request.conversationId)) {
        throw conflict("invalid_state_transition", `Conversation ${request.conversationId} is terminated`);
      }
      throw notFound(`Conversation ${request.conversationId} does not exist`);
    }

    if (!active.session.conversationState.frozen) {
      freezeSession(active.session, "exit");
      await runPostConversationPipeline(active.session);
    }

    const response = {
      conversationId: request.conversationId,
      status: "terminated",
      phase: "TERMINATION",
      terminationReason: active.session.conversationState.terminationReason ?? request.reason,
    };

    this.registry.saveEndSnapshot(
      request.conversationId,
      request.idempotencyKey,
      request,
      response
    );

    discardSessionHistory(active.session);
    this.registry.markTerminated(
      request.conversationId,
      active.session.conversationState.terminationReason ?? request.reason
    );

    return response;
  }

  state(conversationId: string): ConversationStateResponse {
    const state = this.registry.getState(conversationId);
    return toStateResponse(conversationId, state);
  }

  async autoEndInactive(timeoutMs: number): Promise<void> {
    const stale = this.registry.getIdleConversationIds(timeoutMs);
    for (const conversationId of stale) {
      const active = this.registry.getActive(conversationId);
      if (!active || active.session.conversationState.frozen) continue;

      freezeSession(active.session, "exit");
      try {
        await runPostConversationPipeline(active.session);
      } catch {
        // keep going, timeout sweeper should not crash server
      }
      discardSessionHistory(active.session);
      this.registry.markTerminated(conversationId, "exit");
    }
  }
}
