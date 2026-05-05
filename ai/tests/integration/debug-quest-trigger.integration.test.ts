import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createServer } from "../../src/server/http.js";
import * as registry from "../../src/server/sessionRegistry.js";
import { withMemoryIsolation, withMockedFetch } from "../helpers/runtime-harness.js";

interface RunningServer {
  server: Server;
  baseUrl: string;
}

async function startEphemeral(): Promise<RunningServer> {
  registry._resetForTests();
  const server = createServer();
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}

async function stop({ server }: RunningServer): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  registry._resetForTests();
}

test("debug trigger starts quest activation in one turn from mixed conversation state", async () => {
  await withMemoryIsolation(async () => {
    let questStartCalls = 0;
    const previousFetch = globalThis.fetch;
    const mock = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as Request).url;

      if (urlStr.includes("localhost:1234/v1/chat/completions")) {
        const bodyText =
          typeof init?.body === "string"
            ? init.body
            : init?.body
            ? new TextDecoder().decode(init.body as Uint8Array)
            : "";
        const body = JSON.parse(bodyText || "{}") as {
          messages?: Array<{ content: string }>;
        };
        const last = body.messages?.at(-1)?.content ?? "";
        let content = "Neutral reply.";
        if (last.includes("introduce yourself")) {
          content = "Hello.";
        } else if (last.includes("analyzing NPC dialogue")) {
          content = JSON.stringify({ offered: true, questSummary: "prove-you-listened" });
        } else if (last.includes("Classify the player's intent")) {
          content = JSON.stringify({ intent: "uncertain", confidence: 0 });
        }
        return new Response(
          JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (urlStr.endsWith("/quest/start")) {
        questStartCalls += 1;
        return new Response("", { status: 200 });
      }

      return previousFetch(input, init);
    }) as typeof globalThis.fetch;

    await withMockedFetch(mock, async () => {
      const ctx = await startEphemeral();
      try {
        const startRes = await fetch(`${ctx.baseUrl}/api/v1/conversation/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ character: "general" }),
        });
        const { sessionId } = (await startRes.json()) as { sessionId: string };

        await fetch(`${ctx.baseUrl}/api/v1/conversation/${sessionId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "tell me more" }),
        });

        const debugRes = await fetch(`${ctx.baseUrl}/api/v1/conversation/${sessionId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "i will do it" }),
        });
        assert.equal(debugRes.status, 200);
        const body = await debugRes.json() as {
          terminated: boolean;
          questActivation?: { triggered: boolean; source: string; phrase: string; bundleReady: boolean };
        };
        assert.equal(body.terminated, true);
        assert.equal(body.questActivation?.triggered, true);
        assert.equal(body.questActivation?.source, "debug_phrase");
        assert.equal(body.questActivation?.phrase, "i will do it");
        assert.equal(body.questActivation?.bundleReady, true);
        assert.equal(questStartCalls, 1);
      } finally {
        await stop(ctx);
      }
    });
  });
});
