import test from "node:test";
import assert from "node:assert/strict";
import { detectQuestOffer } from "../../src/lifecycle/detector.js";

test("first quest offer can be accepted on turns 3-5 only", async () => {
  const npc = "Go to the crypt and retrieve the relic for me.";
  const classifyStub = async () => ({
    offered: true,
    questSummary: "retrieve-relic-from-crypt",
  });

  const t3 = await detectQuestOffer(
    npc,
    "enabler",
    2,
    {
      assistantResponseCount: 3,
      firstQuestOfferTurn: null,
    },
    classifyStub
  );
  const t5 = await detectQuestOffer(
    npc,
    "enabler",
    2,
    {
      assistantResponseCount: 5,
      firstQuestOfferTurn: null,
    },
    classifyStub
  );
  const t6 = await detectQuestOffer(
    npc,
    "enabler",
    2,
    {
      assistantResponseCount: 6,
      firstQuestOfferTurn: null,
    },
    classifyStub
  );

  assert.equal(t3.offered, true);
  assert.match(t3.questId, /^enabler_L2_/);
  assert.equal(t5.offered, true);
  assert.equal(t6.offered, false);
  assert.equal(t6.blockedReason, "window-closed");
});
