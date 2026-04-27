import { EventEmitter } from "node:events";
import type { QuestCompletionPayload, QuestStartPayload } from "../types.js";

export type QuestNotificationEvent =
  | { kind: "quest_start"; payload: QuestStartPayload; receivedAt: string }
  | { kind: "quest_complete"; payload: QuestCompletionPayload; receivedAt: string };

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export function emitQuestStart(payload: QuestStartPayload): void {
  const event: QuestNotificationEvent = {
    kind: "quest_start",
    payload,
    receivedAt: new Date().toISOString(),
  };
  emitter.emit("quest_start", event);
  emitter.emit("event", event);
}

export function emitQuestComplete(payload: QuestCompletionPayload): void {
  const event: QuestNotificationEvent = {
    kind: "quest_complete",
    payload,
    receivedAt: new Date().toISOString(),
  };
  emitter.emit("quest_complete", event);
  emitter.emit("event", event);
}

export function subscribe(
  listener: (event: QuestNotificationEvent) => void
): () => void {
  emitter.on("event", listener);
  return () => {
    emitter.off("event", listener);
  };
}

export function _resetForTests(): void {
  emitter.removeAllListeners();
}
