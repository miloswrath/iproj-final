import test from "node:test";
import assert from "node:assert/strict";
import { evaluateQuestOfferWindow } from "../../src/lifecycle/detector.js";
import { appendMessage, createSession } from "../../src/session.js";
import { defaultCharacterMemory } from "../../src/memory/store.js";

const character = {
  name: "enabler",
  promptPath: "",
  systemPrompt: "",
};

test("assistant response counting increments on assistant messages only", () => {
  const session = createSession(character, defaultCharacterMemory());
  appendMessage(session, "user", "hey");
  appendMessage(session, "assistant", "hello");
  appendMessage(session, "assistant", "I have a task");
  assert.equal(session.conversationState.assistantResponseCount, 2);
});

test("offer window eligibility is 3-5 only for first offer", () => {
  assert.equal(evaluateQuestOfferWindow(1, null).reason, "too-early");
  assert.equal(evaluateQuestOfferWindow(2, null).reason, "too-early");
  assert.equal(evaluateQuestOfferWindow(3, null).reason, "eligible");
  assert.equal(evaluateQuestOfferWindow(5, null).reason, "eligible");
  assert.equal(evaluateQuestOfferWindow(6, null).reason, "window-closed");
  assert.equal(evaluateQuestOfferWindow(4, 4).reason, "already-offered");
});
