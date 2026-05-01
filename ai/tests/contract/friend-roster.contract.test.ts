import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createServer } from "../../src/server/http.js";
import { withMemoryIsolation, withMockedFetch } from "../helpers/runtime-harness.js";

interface RunningServer {
  server: Server;
  baseUrl: string;
}

async function startEphemeral(): Promise<RunningServer> {
  const server = createServer();
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}

async function stop({ server }: RunningServer): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
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
    const u = new URL(urlStr);
    if (u.pathname === "/quest/start" || u.pathname === "/quest/complete") {
      return new Response("", { status: 200 });
    }
    return real(input, init);
  }) as typeof globalThis.fetch;
}

test("GET /friends returns an empty roster before friendship unlocks", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(quietFetchMock(), async () => {
      const ctx = await startEphemeral();
      try {
        const res = await fetch(`${ctx.baseUrl}/api/v1/friends`);
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.deepEqual(body.friends, []);
        assert.equal(body.activeCount, 0);
      } finally {
        await stop(ctx);
      }
    });
  });
});

test("GET /friends/active-character returns stable starter state", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(quietFetchMock(), async () => {
      const ctx = await startEphemeral();
      try {
        const res = await fetch(`${ctx.baseUrl}/api/v1/friends/active-character`);
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.activeNpcId, "girl-1-east");
        assert.deepEqual(body.unlockedNpcIds, ["girl-1-east"]);
        assert.deepEqual(body.completedNpcIds, []);
      } finally {
        await stop(ctx);
      }
    });
  });
});
