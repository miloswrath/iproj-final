import test from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { MEMORY_DIR, readJson } from "../../src/memory/store.js";
import { notifyQuestStart } from "../../src/notify/game-api.js";
import { withMemoryIsolation, withMockedFetch } from "../helpers/runtime-harness.js";
import type { PendingNotificationRecord } from "../../src/types.js";

const pendingPath = path.join(MEMORY_DIR, "pending-notifications.json");

test("pending notification records include required type discriminator", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(async () => {
      throw new Error("network down");
    }, async () => {
      await notifyQuestStart({
        character: "enabler",
        questId: "enabler_L1_small-errand",
        playerState: { level: 1 },
        relationshipSnapshot: { trust: 10, dependency: 10, bond: 10, wariness: 10 },
        terminationReason: "rule",
      });
    });

    const pending = await readJson<PendingNotificationRecord[]>(pendingPath);
    assert.ok(pending && pending.length === 1);
    assert.equal(pending[0]?.type, "quest_start");
    assert.ok(typeof pending[0]?.attemptCount === "number");
  });
});
