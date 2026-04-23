import http from "http";
import { URL } from "url";
import { API_PORT, INACTIVITY_TIMEOUT_MS, SWEEP_INTERVAL_MS } from "./config.js";
import { ApiError, badRequest, internalError } from "./errors.js";
import { readJsonBody, sendJson } from "./http-utils.js";
import { ConversationService } from "./routes/conversation.js";
import { validateEndRequest, validateMessageRequest, validateStartRequest } from "./validators.js";
import { ensureMemoryDirs } from "./memory/store.js";
import { retrySavedNotifications } from "./notify/game-api.js";

const service = new ConversationService();

function sendError(res: http.ServerResponse, err: unknown): void {
  if (err instanceof ApiError) {
    sendJson(res, err.status, {
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const unknown = internalError(err instanceof Error ? err.message : "Unknown error");
  sendJson(res, unknown.status, {
    error: {
      code: unknown.code,
      message: unknown.message,
    },
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url || !req.method) {
      throw badRequest("Invalid request");
    }

    const url = new URL(req.url, `http://${req.headers.host ?? `localhost:${API_PORT}`}`);

    if (req.method === "POST" && url.pathname === "/conversation/start") {
      const body = await readJsonBody(req);
      const payload = validateStartRequest(body);
      const result = await service.start(payload);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/conversation/message") {
      const body = await readJsonBody(req);
      const payload = validateMessageRequest(body);
      const result = await service.message(payload);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/conversation/end") {
      const body = await readJsonBody(req);
      const payload = validateEndRequest(body);
      const result = await service.end(payload);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/conversation/state/")) {
      const id = decodeURIComponent(url.pathname.replace("/conversation/state/", "")).trim();
      if (!id) throw badRequest("Missing conversation id");
      const result = service.state(id);
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, {
      error: {
        code: "not_found",
        message: `Route ${req.method} ${url.pathname} not found`,
      },
    });
  } catch (err) {
    sendError(res, err);
  }
});

setInterval(() => {
  void service.autoEndInactive(INACTIVITY_TIMEOUT_MS);
}, SWEEP_INTERVAL_MS).unref();

async function bootstrap(): Promise<void> {
  await ensureMemoryDirs();
  await retrySavedNotifications();

  server.listen(API_PORT, () => {
    console.log(`[ai-api] listening on http://localhost:${API_PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("[ai-api] bootstrap failed", err);
  process.exit(1);
});
