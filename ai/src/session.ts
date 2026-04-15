import type { Character, HistoryEntry, Message, Session } from "./types.js";

export function createSession(character: Character): Session {
  return {
    activeCharacter: character,
    history: [],
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
