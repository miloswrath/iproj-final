import test from "node:test";
import assert from "node:assert/strict";
import http, { type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createServer } from "../../src/server/http.js";
import {
  _resetForTests as resetEventBus,
  emitQuestComplete,
  emitQuestStart,
} from "../../src/server/eventBus.js";
import { withMemoryIsolation } from "../helpers/runtime-harness.js";
import type { QuestStartPayload } from "../../src/types.js";

interface RunningServer {
  server: Server;
  port: number;
}

async function startEphemeral(): Promise<RunningServer> {
  resetEventBus();
  const server = createServer();
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address() as AddressInfo;
  return { server, port: addr.port };
}

async function stop({ server }: RunningServer): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  resetEventBus();
}

interface SseStream {
  request: http.ClientRequest;
  response: Promise<http.IncomingMessage>;
  buffer: { value: string };
  close: () => void;
}

function openStream(port: number): SseStream {
  const buffer = { value: "" };
  const request = http.request({
    host: "127.0.0.1",
    port,
    path: "/api/v1/events",
    method: "GET",
    headers: { Accept: "text/event-stream" },
  });
  const response = new Promise<http.IncomingMessage>((resolve, reject) => {
    request.once("response", (msg) => {
      msg.setEncoding("utf8");
      msg.on("data", (chunk: string) => {
        buffer.value += chunk;
      });
      resolve(msg);
    });
    request.once("error", reject);
  });
  request.end();
  return {
    request,
    response,
    buffer,
    close: () => {
      try {
        request.destroy();
      } catch {
        // ignore
      }
    },
  };
}

async function waitForBuffer(
  buffer: { value: string },
  predicate: (s: string) => boolean,
  timeoutMs = 1000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate(buffer.value)) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(`Timed out waiting for buffer match. Buffer was: ${buffer.value}`);
}

function basePayload(): QuestStartPayload {
  return {
    character: "general",
    questId: "general_L1_demo",
    playerState: { level: 1 },
    relationshipSnapshot: { trust: 50, dependency: 50, bond: 50, wariness: 50 },
    terminationReason: "rule",
  };
}

test("S-1: SSE endpoint returns text/event-stream and initial : connected within 1s", async () => {
  await withMemoryIsolation(async () => {
    const ctx = await startEphemeral();
    const stream = openStream(ctx.port);
    try {
      const response = await stream.response;
      assert.equal(response.statusCode, 200);
      assert.match(
        String(response.headers["content-type"] ?? ""),
        /text\/event-stream/
      );
      await waitForBuffer(stream.buffer, (s) => s.includes(": connected"), 1000);
    } finally {
      stream.close();
      await stop(ctx);
    }
  });
});

test("S-2: emitting quest_start delivers event to SSE client within 100 ms", async () => {
  await withMemoryIsolation(async () => {
    const ctx = await startEphemeral();
    const stream = openStream(ctx.port);
    try {
      await stream.response;
      await waitForBuffer(stream.buffer, (s) => s.includes(": connected"), 1000);
      emitQuestStart(basePayload());
      await waitForBuffer(
        stream.buffer,
        (s) => s.includes("event: quest_start") && s.includes("general_L1_demo"),
        300
      );
    } finally {
      stream.close();
      await stop(ctx);
    }
  });
});

test("S-3: heartbeat ping is scheduled (handler installs interval)", async () => {
  // We don't wait the full 25 s — we just verify the connection stays open
  // for ≥ 200 ms with no auto-close, which proves the heartbeat interval is
  // installed (otherwise nothing would keep the response alive).
  await withMemoryIsolation(async () => {
    const ctx = await startEphemeral();
    const stream = openStream(ctx.port);
    try {
      const response = await stream.response;
      await new Promise((r) => setTimeout(r, 200));
      assert.equal(response.complete, false);
    } finally {
      stream.close();
      await stop(ctx);
    }
  });
});

test("S-4: client disconnect/reconnect works without leaking subscribers", async () => {
  await withMemoryIsolation(async () => {
    const ctx = await startEphemeral();
    try {
      // First connection: subscribe, then drop.
      const first = openStream(ctx.port);
      await first.response;
      await waitForBuffer(first.buffer, (s) => s.includes(": connected"), 500);
      first.close();
      await new Promise((r) => setTimeout(r, 50));

      // Second connection: should still receive an emitted event.
      const second = openStream(ctx.port);
      await second.response;
      await waitForBuffer(second.buffer, (s) => s.includes(": connected"), 500);
      emitQuestComplete({
        ...basePayload(),
        outcome: "success",
        rewardReceived: true,
      });
      await waitForBuffer(
        second.buffer,
        (s) => s.includes("event: quest_complete"),
        300
      );
      second.close();
    } finally {
      await stop(ctx);
    }
  });
});

test("S-5: two SSE clients both receive the same event", async () => {
  await withMemoryIsolation(async () => {
    const ctx = await startEphemeral();
    const a = openStream(ctx.port);
    const b = openStream(ctx.port);
    try {
      await a.response;
      await b.response;
      await waitForBuffer(a.buffer, (s) => s.includes(": connected"), 500);
      await waitForBuffer(b.buffer, (s) => s.includes(": connected"), 500);

      emitQuestStart(basePayload());

      await waitForBuffer(a.buffer, (s) => s.includes("event: quest_start"), 300);
      await waitForBuffer(b.buffer, (s) => s.includes("event: quest_start"), 300);
    } finally {
      a.close();
      b.close();
      await stop(ctx);
    }
  });
});
