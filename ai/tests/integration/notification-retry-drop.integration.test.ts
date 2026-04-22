import test from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { MEMORY_DIR, readJson } from "../../src/memory/store.js";
import { notifyQuestComplete } from "../../src/notify/game-api.js";
import { withMemoryIsolation, withMockedFetch } from "../helpers/runtime-harness.js";
import type { PendingNotificationRecord } from "../../src/types.js";

const pendingPath = path.join(MEMORY_DIR, "pending-notifications.json");

test("non-retryable 4xx responses are dropped", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(
      async () => new Response("{}", { status: 400 }),
      async () => {
        await notifyQuestComplete({
          character: "enabler",
          questId: "enabler_L1_small-errand",
          outcome: "failure",
          playerState: { level: 2 },
          relationshipSnapshot: { trust: 1, dependency: 1, bond: 1, wariness: 1 },
          rewardReceived: true,
          eventTimestamp: "1",
        });
      }
    );

    const pending = await readJson<PendingNotificationRecord[]>(pendingPath);
    assert.ok(Array.isArray(pending));
    assert.equal(pending.length, 0);
  });
});
