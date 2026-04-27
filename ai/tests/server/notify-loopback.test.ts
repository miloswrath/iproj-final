import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { promises as fs } from "node:fs";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createServer } from "../../src/server/http.js";
import { _resetForTests as resetEventBus, subscribe } from "../../src/server/eventBus.js";
import {
  notifyQuestComplete,
  notifyQuestStart,
  retrySavedNotifications,
} from "../../src/notify/game-api.js";
import { MEMORY_DIR } from "../../src/memory/store.js";
import { withMemoryIsolation } from "../helpers/runtime-harness.js";
import type { QuestCompletionPayload, QuestStartPayload } from "../../src/types.js";

const PENDING_PATH = path.join(MEMORY_DIR, "pending-notifications.json");

interface RunningServer {
  server: Server;
  baseUrl: string;
  port: number;
}

async function startEphemeral(): Promise<RunningServer> {
  resetEventBus();
  const server = createServer();
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${addr.port}`, port: addr.port };
}

async function stop({ server }: RunningServer): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  resetEventBus();
}

function startPayload(overrides: Partial<QuestStartPayload> = {}): QuestStartPayload {
  return {
    character: "general",
    questId: "general_L1_demo",
    playerState: { level: 1 },
    relationshipSnapshot: { trust: 50, dependency: 50, bond: 50, wariness: 50 },
    terminationReason: "rule",
    ...overrides,
  };
}

function completePayload(
  overrides: Partial<QuestCompletionPayload> = {}
): QuestCompletionPayload {
  return {
    character: "general",
    questId: "general_L1_demo",
    outcome: "success",
    playerState: { level: 1 },
    relationshipSnapshot: { trust: 50, dependency: 50, bond: 50, wariness: 50 },
    rewardReceived: true,
    eventTimestamp: new Date().toISOString(),
    ...overrides,
  };
}

async function waitForEvent<T = unknown>(
  predicate: (payload: any) => boolean,
  timeoutMs = 200
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error("timeout"));
    }, timeoutMs);
    const unsubscribe = subscribe((event) => {
      if (predicate(event)) {
        clearTimeout(timer);
        unsubscribe();
        resolve(event as T);
      }
    });
  });
}

test("L-1: notifyQuestStart triggers eventBus emission via loopback", async () => {
  await withMemoryIsolation(async () => {
    const ctx = await startEphemeral();
    const previousUrl = process.env["GAME_API_URL"];
    process.env["GAME_API_URL"] = `${ctx.baseUrl}/quest/start`;
    try {
      const payload = startPayload();
      const eventP = waitForEvent((e) => e.kind === "quest_start");
      await notifyQuestStart(payload);
      const event = (await eventP) as { kind: string; payload: QuestStartPayload };
      assert.equal(event.kind, "quest_start");
      assert.equal(event.payload.questId, payload.questId);
    } finally {
      if (previousUrl === undefined) delete process.env["GAME_API_URL"];
      else process.env["GAME_API_URL"] = previousUrl;
      await stop(ctx);
    }
  });
});

test("L-2: notifyQuestComplete triggers eventBus emission via loopback", async () => {
  await withMemoryIsolation(async () => {
    const ctx = await startEphemeral();
    const previous = process.env["GAME_API_URL_COMPLETE"];
    process.env["GAME_API_URL_COMPLETE"] = `${ctx.baseUrl}/quest/complete`;
    try {
      const payload = completePayload();
      const eventP = waitForEvent((e) => e.kind === "quest_complete");
      await notifyQuestComplete(payload);
      const event = (await eventP) as {
        kind: string;
        payload: QuestCompletionPayload;
      };
      assert.equal(event.kind, "quest_complete");
      assert.equal(event.payload.outcome, "success");
    } finally {
      if (previous === undefined) delete process.env["GAME_API_URL_COMPLETE"];
      else process.env["GAME_API_URL_COMPLETE"] = previous;
      await stop(ctx);
    }
  });
});

test("L-3: bridge stopped — notifyQuestStart accrues pending entry", async () => {
  await withMemoryIsolation(async () => {
    const previousUrl = process.env["GAME_API_URL"];
    // Point at a port that's not bound — connection will refuse.
    process.env["GAME_API_URL"] = "http://127.0.0.1:1/quest/start";
    try {
      const payload = startPayload({ questId: "general_L1_pending" });
      await notifyQuestStart(payload);
      const raw = await fs.readFile(PENDING_PATH, "utf8");
      const queue = JSON.parse(raw) as Array<{ type: string; payload: QuestStartPayload }>;
      assert.equal(queue.length, 1);
      assert.equal(queue[0]!.type, "quest_start");
      assert.equal(queue[0]!.payload.questId, "general_L1_pending");
    } finally {
      if (previousUrl === undefined) delete process.env["GAME_API_URL"];
      else process.env["GAME_API_URL"] = previousUrl;
    }
  });
});

test("L-4: bridge restarts — retrySavedNotifications drains the queue exactly once", async () => {
  await withMemoryIsolation(async () => {
    const previousUrl = process.env["GAME_API_URL"];
    // First, accrue a pending notification with the bridge offline.
    process.env["GAME_API_URL"] = "http://127.0.0.1:1/quest/start";
    await notifyQuestStart(startPayload({ questId: "general_L1_replay" }));

    // Now bring up the bridge and retry.
    const ctx = await startEphemeral();
    process.env["GAME_API_URL"] = `${ctx.baseUrl}/quest/start`;
    try {
      const eventP = waitForEvent(
        (e) =>
          e.kind === "quest_start" && e.payload?.questId === "general_L1_replay",
        500
      );
      await retrySavedNotifications();
      await eventP;
      const raw = await fs.readFile(PENDING_PATH, "utf8");
      assert.equal(JSON.parse(raw).length, 0);
    } finally {
      if (previousUrl === undefined) delete process.env["GAME_API_URL"];
      else process.env["GAME_API_URL"] = previousUrl;
      await stop(ctx);
    }
  });
});

test("L-5: malformed body returns 200 and does not emit", async () => {
  await withMemoryIsolation(async () => {
    const ctx = await startEphemeral();
    try {
      let emitted = false;
      const unsub = subscribe(() => {
        emitted = true;
      });
      const res = await fetch(`${ctx.baseUrl}/quest/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "no character field here" }),
      });
      assert.equal(res.status, 200);
      await new Promise((r) => setTimeout(r, 50));
      unsub();
      assert.equal(emitted, false);
    } finally {
      await stop(ctx);
    }
  });
});
