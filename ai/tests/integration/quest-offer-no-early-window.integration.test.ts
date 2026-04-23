import test from "node:test";
import assert from "node:assert/strict";
import { detectQuestOffer } from "../../src/lifecycle/detector.js";

test("quest offer detection is blocked on assistant turns 1 and 2", async () => {
  const npc = "Go to the crypt and retrieve the relic for me.";

  const t1 = await detectQuestOffer(npc, "enabler", 1, {
    assistantResponseCount: 1,
    firstQuestOfferTurn: null,
  });
  const t2 = await detectQuestOffer(npc, "enabler", 1, {
    assistantResponseCount: 2,
    firstQuestOfferTurn: null,
  });

  assert.equal(t1.offered, false);
  assert.equal(t1.blockedReason, "too-early");
  assert.equal(t2.offered, false);
  assert.equal(t2.blockedReason, "too-early");
});
