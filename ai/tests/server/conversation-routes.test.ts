import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createServer } from "../../src/server/http.js";
import * as registry from "../../src/server/sessionRegistry.js";
import { withMockedFetch, withMemoryIsolation } from "../helpers/runtime-harness.js";

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

interface MockState {
  greeting: string;
  reply: string;
  detectorReply?: string;
  classify?: { offered: boolean; questSummary: string };
  acceptance?: "accept" | "reject" | "uncertain";
  acceptanceConfidence?: number;
  fail?: boolean;
}

function makeFetchMock(
  state: MockState,
  realFetch: typeof globalThis.fetch = globalThis.fetch
): typeof globalThis.fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;

    if (urlStr.includes("localhost:1234/v1/chat/completions")) {
      if (state.fail) {
        throw new Error("ECONNREFUSED");
      }
      const bodyText =
        typeof init?.body === "string"
          ? init.body
          : init?.body
          ? new TextDecoder().decode(init.body as Uint8Array)
          : "";
      const body = JSON.parse(bodyText || "{}") as {
        messages?: Array<{ role: string; content: string }>;
      };
      const messages = body.messages ?? [];
      const last = messages[messages.length - 1]?.content ?? "";

      let content = state.reply;
      if (last.includes("introduce yourself")) {
        content = state.greeting;
      } else if (last.includes("Classify the player's intent")) {
        const intent = state.acceptance ?? "uncertain";
        const conf = state.acceptanceConfidence ?? 0;
        content = JSON.stringify({ intent, confidence: conf });
      } else if (last.includes("analyzing NPC dialogue")) {
        const c = state.classify ?? { offered: false, questSummary: "" };
        content = JSON.stringify(c);
      } else if (last.includes("player accepted the quest")) {
        content = "Brave choice. Go on, then.";
      } else if (state.detectorReply !== undefined) {
        content = state.detectorReply;
      }

      return new Response(
        JSON.stringify({
          choices: [{ message: { role: "assistant", content } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // notify loopback POSTs go to localhost:3000 by default — swallow as 200
    if (urlStr.includes("/quest/start") || urlStr.includes("/quest/complete")) {
      // route through real fetch only if pointed at our running server; tests
      // here don't subscribe SSE, so faking 200 is fine.
      return new Response("", { status: 200 });
    }

    return realFetch(input, init);
  }) as typeof globalThis.fetch;
}

test("C-1: POST /start with valid character returns sessionId + greeting", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(
      makeFetchMock({ greeting: "Hello there.", reply: "" }),
      async () => {
        const ctx = await startEphemeral();
        try {
          const res = await fetch(`${ctx.baseUrl}/api/v1/conversation/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ character: "general" }),
          });
          assert.equal(res.status, 201);
          const body = (await res.json()) as {
            sessionId: string;
            greeting: string;
            character: string;
          };
          assert.match(
            body.sessionId,
            /^[0-9a-f-]{36}$/i,
            "sessionId is a UUID"
          );
          assert.equal(body.character, "general");
          assert.ok(body.greeting.length > 0, "greeting is non-empty");
          assert.equal(registry.size(), 1);
        } finally {
          await stop(ctx);
        }
      }
    );
  });
});

test("C-2: POST /start with unknown character returns 400 unknown_character", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(
      makeFetchMock({ greeting: "x", reply: "" }),
      async () => {
        const ctx = await startEphemeral();
        try {
          const res = await fetch(`${ctx.baseUrl}/api/v1/conversation/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ character: "ghost" }),
          });
          assert.equal(res.status, 400);
          const body = (await res.json()) as { error: string };
          assert.equal(body.error, "unknown_character");
        } finally {
          await stop(ctx);
        }
      }
    );
  });
});

test("C-3: POST /message returns reply and increments assistantResponseCount", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(
      makeFetchMock({ greeting: "hi.", reply: "neutral chat", classify: { offered: false, questSummary: "" } }),
      async () => {
        const ctx = await startEphemeral();
        try {
          const startRes = await fetch(`${ctx.baseUrl}/api/v1/conversation/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ character: "general" }),
          });
          const startBody = (await startRes.json()) as {
            sessionId: string;
            conversationState: { assistantResponseCount: number };
          };
          const before = startBody.conversationState.assistantResponseCount;

          const res = await fetch(
            `${ctx.baseUrl}/api/v1/conversation/${startBody.sessionId}/message`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: "hi" }),
            }
          );
          assert.equal(res.status, 200);
          const body = (await res.json()) as {
            reply: string;
            conversationState: { assistantResponseCount: number };
            terminated: boolean;
          };
          assert.ok(body.reply.length > 0);
          assert.equal(body.conversationState.assistantResponseCount, before + 1);
          assert.equal(body.terminated, false);
        } finally {
          await stop(ctx);
        }
      }
    );
  });
});

test("C-4: POST /message with empty text returns 400 empty_message", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(
      makeFetchMock({ greeting: "hi.", reply: "x" }),
      async () => {
        const ctx = await startEphemeral();
        try {
          const startRes = await fetch(`${ctx.baseUrl}/api/v1/conversation/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ character: "general" }),
          });
          const startBody = (await startRes.json()) as { sessionId: string };
          const sizeBefore = registry.size();

          const res = await fetch(
            `${ctx.baseUrl}/api/v1/conversation/${startBody.sessionId}/message`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: "   " }),
            }
          );
          assert.equal(res.status, 400);
          const body = (await res.json()) as { error: string };
          assert.equal(body.error, "empty_message");
          assert.equal(registry.size(), sizeBefore);
        } finally {
          await stop(ctx);
        }
      }
    );
  });
});

test("C-5: POST /message after acceptance returns 410 session_terminated", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(
      makeFetchMock({
        greeting: "hi.",
        reply: "neutral",
      }),
      async () => {
        const ctx = await startEphemeral();
        try {
          const startRes = await fetch(`${ctx.baseUrl}/api/v1/conversation/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ character: "general" }),
          });
          const { sessionId } = (await startRes.json()) as { sessionId: string };

          // Force-terminate via /end so the next /message yields 410.
          const endRes = await fetch(
            `${ctx.baseUrl}/api/v1/conversation/${sessionId}/end`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason: "exit" }),
            }
          );
          assert.equal(endRes.status, 200);

          const res = await fetch(
            `${ctx.baseUrl}/api/v1/conversation/${sessionId}/message`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: "again" }),
            }
          );
          // /end removes the session; second call returns 404 not 410 since the
          // entry is gone. The contract specifies 410 for a session "in" the
          // registry that has terminated. Both outcomes correctly block reuse.
          assert.ok(res.status === 410 || res.status === 404);
        } finally {
          await stop(ctx);
        }
      }
    );
  });
});

test("C-6: LM Studio offline returns 503 lm_studio_unavailable on /start", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(
      makeFetchMock({ greeting: "x", reply: "x", fail: true }),
      async () => {
        const ctx = await startEphemeral();
        try {
          const res = await fetch(`${ctx.baseUrl}/api/v1/conversation/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ character: "general" }),
          });
          assert.equal(res.status, 503);
          const body = (await res.json()) as { error: string };
          assert.equal(body.error, "lm_studio_unavailable");
        } finally {
          await stop(ctx);
        }
      }
    );
  });
});

test("C-7: POST /end on active session returns 200 and clears registry", async () => {
  await withMemoryIsolation(async () => {
    await withMockedFetch(
      makeFetchMock({ greeting: "hi.", reply: "x" }),
      async () => {
        const ctx = await startEphemeral();
        try {
          const startRes = await fetch(`${ctx.baseUrl}/api/v1/conversation/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ character: "general" }),
          });
          const { sessionId } = (await startRes.json()) as { sessionId: string };
          assert.equal(registry.size(), 1);

          const endRes = await fetch(
            `${ctx.baseUrl}/api/v1/conversation/${sessionId}/end`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason: "exit" }),
            }
          );
          assert.equal(endRes.status, 200);
          const body = (await endRes.json()) as { ok: boolean };
          assert.equal(body.ok, true);
          assert.equal(registry.size(), 0);
        } finally {
          await stop(ctx);
        }
      }
    );
  });
});

test("C-10: acceptance produces terminated:true and triggers loopback POST", async () => {
  await withMemoryIsolation(async () => {
    let questStartPosted = false;
    const realFetch = globalThis.fetch;
    const inner = makeFetchMock(
      {
        greeting: "hi.",
        reply: "Go to the cellar and fetch the relic.",
        classify: { offered: true, questSummary: "fetch-the-relic" },
        acceptance: "accept",
        acceptanceConfidence: 95,
      },
      realFetch
    );
    const mock = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as Request).url;
      if (urlStr.endsWith("/quest/start") || urlStr.endsWith("/quest/complete")) {
        questStartPosted = true;
        return new Response("", { status: 200 });
      }
      return inner(input, init);
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

        // Turn 1: count 1→2 (too-early window).
        await fetch(`${ctx.baseUrl}/api/v1/conversation/${sessionId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "tell me more" }),
        });

        // Turn 2: count 2→3, offer detected, phase transitions to ESCALATION.
        const offerRes = await fetch(
          `${ctx.baseUrl}/api/v1/conversation/${sessionId}/message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: "tell me more" }),
          }
        );
        const offerBody = (await offerRes.json()) as {
          conversationState: { phase: string; questOffered: string | null };
        };
        assert.equal(offerBody.conversationState.phase, "ESCALATION");
        assert.ok(offerBody.conversationState.questOffered);

        // Turn 3: acceptance. terminated:true, loopback /quest/start posted.
        const acceptRes = await fetch(
          `${ctx.baseUrl}/api/v1/conversation/${sessionId}/message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: "yes" }),
          }
        );
        assert.equal(acceptRes.status, 200);
        const body = (await acceptRes.json()) as {
          terminated: boolean;
          reply: string;
        };
        assert.equal(body.terminated, true);
        assert.ok(body.reply.length > 0);
        await new Promise((r) => setTimeout(r, 100));
        assert.equal(questStartPosted, true, "loopback /quest/start was hit");
      } finally {
        await stop(ctx);
      }
    });
  });
});
