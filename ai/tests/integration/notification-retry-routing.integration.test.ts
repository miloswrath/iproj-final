import test from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { MEMORY_DIR, readJson, writeJsonAtomic } from "../../src/memory/store.js";
import { retrySavedNotifications } from "../../src/notify/game-api.js";
import { withMemoryIsolation, withMockedFetch } from "../helpers/runtime-harness.js";
import type { PendingNotificationRecord } from "../../src/types.js";

const pendingPath = path.join(MEMORY_DIR, "pending-notifications.json");

test("retry routes quest_start and quest_complete by type", async () => {
  await withMemoryIsolation(async () => {
    const seed: PendingNotificationRecord[] = [
      {
        type: "quest_start",
        payload: {
          character: "enabler",
          questId: "enabler_L1_small-errand",
          playerState: { level: 1 },
          relationshipSnapshot: { trust: 1, dependency: 1, bond: 1, wariness: 1 },
          terminationReason: "rule",
        },
      },
      {
        type: "quest_complete",
        payload: {
          character: "enabler",
          questId: "enabler_L1_small-errand",
          outcome: "success",
          playerState: { level: 2 },
          relationshipSnapshot: { trust: 1, dependency: 1, bond: 1, wariness: 1 },
          rewardReceived: true,
          eventTimestamp: "1",
        },
      },
    ];

    await writeJsonAtomic(pendingPath, seed);

    const urls: string[] = [];
    await withMockedFetch(
      async (input) => {
        urls.push(String(input));
        return new Response("{}", { status: 200 });
      },
      async () => {
        await retrySavedNotifications();
      }
    );

    const pendingAfter = await readJson<PendingNotificationRecord[]>(pendingPath);
    assert.ok(pendingAfter);
    assert.equal(pendingAfter.length, 0);
    assert.equal(urls.some((u) => u.endsWith("/quest/start")), true);
    assert.equal(urls.some((u) => u.endsWith("/quest/complete")), true);
  });
});
