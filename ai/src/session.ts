import type {
  Character,
  CharacterMemory,
  AuthoritativeState,
  ConversationPhase,
  ConversationState,
  HistoryEntry,
  Message,
  Session,
} from "./types.js";
import { defaultCharacterMemory } from "./memory/store.js";

export function createSession(
  character: Character,
  characterMemory?: CharacterMemory,
  authoritativeState?: AuthoritativeState
): Session {
  return {
    activeCharacter: character,
    activeMemory: characterMemory ?? defaultCharacterMemory(),
    authoritativeState,
    history: [],
    conversationState: {
      phase: "ACTIVE",
      questOffered: null,
      terminationReason: null,
      frozen: false,
      assistantResponseCount: 0,
      firstQuestOfferTurn: null,
    },
  };
}

export function appendMessage(
  session: Session,
  role: "user" | "assistant",
  content: string
): void {
  session.history.push({
    kind: "message",
    role,
    characterName: session.activeCharacter.name,
    content,
    timestamp: new Date(),
  });

  if (role === "assistant") {
    session.conversationState.assistantResponseCount += 1;
  }
}

export function appendSwitch(
  session: Session,
  newCharacter: Character
): void {
  const from = session.activeCharacter.name;
  session.history.push({
    kind: "switch",
    from,
    to: newCharacter.name,
    timestamp: new Date(),
  });
  session.activeCharacter = newCharacter;
}

export function clearSession(session: Session): void {
  session.history = [];
}

export function getHistoryMessages(session: Session): Message[] {
  return session.history
    .filter((e): e is Extract<HistoryEntry, { kind: "message" }> => e.kind === "message")
    .map(({ role, content }) => ({ role, content }));
}

export function setPhase(session: Session, phase: ConversationPhase): void {
  session.conversationState.phase = phase;
}

export function setQuestOffered(session: Session, questId: string): void {
  session.conversationState.questOffered = questId;

  if (session.conversationState.firstQuestOfferTurn === null) {
    session.conversationState.firstQuestOfferTurn =
      session.conversationState.assistantResponseCount;
  }

  if (session.conversationState.phase === "ACTIVE") {
    session.conversationState.phase = "ESCALATION";
  }
}

export function freezeSession(
  session: Session,
  reason: ConversationState["terminationReason"]
): void {
  session.conversationState.terminationReason = reason;
  session.conversationState.frozen = true;
  session.conversationState.phase = "TERMINATION";
}
