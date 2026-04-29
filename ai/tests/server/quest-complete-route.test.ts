import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createServer } from "../../src/server/http.js";
import { _resetForTests as resetEventBus } from "../../src/server/eventBus.js";
import { MEMORY_DIR, readJson } from "../../src/memory/store.js";
import { withMemoryIsolation, withMockedFetch } from "../helpers/runtime-harness.js";
import type { PlayerProfile } from "../../src/types.js";

interface RunningServer {
  server: Server;
  baseUrl: string;
}

async function startEphemeral(): Promise<RunningServer> {
  resetEventBus();
  const server = createServer();
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}

async function stop({ server }: RunningServer): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  resetEventBus();
}

function quietFetchMock(): typeof globalThis.fetch {
  const real = globalThis.fetch;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;
    // Only intercept the loopback notify endpoints (no /api/v1/ prefix).
    // The bridge route /api/v1/quest/complete must reach the real test server.
    const u = new URL(urlStr);
    if (u.pathname === "/quest/start" || u.pathname === "/quest/complete") {
      return new Response("", { status: 200 });
    }
    return real(input, init);
  }) as typeof globalThis.fetch;
}

test("C-8: POST /quest/complete with invalid outcome returns 400 invalid_outcome", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(quietFetchMock(), async () => {
      const ctx = await startEphemeral();
      try {
        const res = await fetch(`${ctx.baseUrl}/api/v1/quest/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            character: "general",
            questId: "general_L1_demo",
            outcome: "magic",
            rewardReceived: false,
            playerLevel: 1,
          }),
        });
        assert.equal(res.status, 400);
        const body = (await res.json()) as { error: string };
        assert.equal(body.error, "invalid_outcome");
      } finally {
        await stop(ctx);
      }
    });
  });
});

test("C-9: duplicate POST /quest/complete returns applied:false reason:duplicate", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(quietFetchMock(), async () => {
      const ctx = await startEphemeral();
      try {
        const payload = {
          character: "general",
          questId: "general_L1_dupe_test",
          outcome: "success",
          rewardReceived: true,
          playerLevel: 1,
          eventTimestamp: "2026-04-29T12:00:00.000Z",
        };

        const first = await fetch(`${ctx.baseUrl}/api/v1/quest/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        assert.equal(first.status, 200);
        const firstBody = (await first.json()) as {
          applied: boolean;
          reason: string;
        };
        assert.equal(firstBody.applied, true);
        assert.equal(firstBody.reason, "applied");

        const second = await fetch(`${ctx.baseUrl}/api/v1/quest/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        assert.equal(second.status, 200);
        const secondBody = (await second.json()) as {
          applied: boolean;
          reason: string;
        };
        assert.equal(secondBody.applied, false);
        assert.equal(secondBody.reason, "duplicate");
      } finally {
        await stop(ctx);
      }
    });
  });
});

test("C-9 sibling: POST /quest/complete with unknown character returns 400 unknown_character", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(quietFetchMock(), async () => {
      const ctx = await startEphemeral();
      try {
        const res = await fetch(`${ctx.baseUrl}/api/v1/quest/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            character: "ghost",
            questId: "ghost_L1_demo",
            outcome: "success",
            rewardReceived: true,
            playerLevel: 1,
          }),
        });
        assert.equal(res.status, 400);
        const body = (await res.json()) as { error: string };
        assert.equal(body.error, "unknown_character");
      } finally {
        await stop(ctx);
      }
    });
  });
});

test("C-10: POST /quest/complete increments and persists globalCharacterLevel on success", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(quietFetchMock(), async () => {
      const ctx = await startEphemeral();
      try {
        const profilePath = path.join(MEMORY_DIR, "player-profile.json");
        const before = await readJson<PlayerProfile>(profilePath);

        const res = await fetch(`${ctx.baseUrl}/api/v1/quest/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            character: "general",
            questId: "general_L1_level_up",
            outcome: "success",
            rewardReceived: true,
            playerLevel: 1,
          }),
        });

        assert.equal(res.status, 200);
        const body = (await res.json()) as {
          applied: boolean;
          reason: string;
          memorySyncPending: boolean;
        };
        assert.equal(body.applied, true);
        assert.equal(body.reason, "applied");
        assert.equal(body.memorySyncPending, false);

        const after = await readJson<PlayerProfile>(profilePath);
        assert.ok(after);
        assert.equal(
          after.globalCharacterLevel,
          (before?.globalCharacterLevel ?? 1) + 1
        );
      } finally {
        await stop(ctx);
      }
    });
  });
});
