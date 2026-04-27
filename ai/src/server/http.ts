import http, { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCharacters } from "../characters.js";
import { ensureMemoryDirs } from "../memory/store.js";
import { retrySavedNotifications } from "../notify/game-api.js";
import { register as registerConversation } from "./routes/conversation.js";
import { register as registerEvents } from "./routes/events.js";
import { register as registerQuestNotifications } from "./routes/questNotifications.js";
import { register as registerQuestCompletion } from "./routes/questCompletion.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(__dirname, "../../docs/prompts");
const EXPECTED_ARCHETYPES = [
  "general",
  "enabler",
  "opportunist",
  "honest",
  "mirror",
  "parasite",
];

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
) => void | Promise<void>;

interface RouteEntry {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

declare module "node:http" {
  interface Server {
    addRoute(method: string, path: string, handler: RouteHandler): void;
  }
}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host);
}

function compilePath(path: string): { pattern: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const escaped = path.replace(/[.+*?^${}()|[\]\\]/g, "\\$&");
  const re = escaped.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  return { pattern: new RegExp(`^${re}$`), paramNames };
}

export async function readJsonBody(req: IncomingMessage, maxBytes = 1_000_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data).toString(),
  });
  res.end(data);
}

export function sendError(
  res: ServerResponse,
  status: number,
  code: string,
  message: string
): void {
  sendJson(res, status, { error: code, message });
}

export function createServer(): http.Server {
  const routes: RouteEntry[] = [];
  const server = http.createServer();

  server.addRoute = (method: string, path: string, handler: RouteHandler) => {
    const { pattern, paramNames } = compilePath(path);
    routes.push({ method: method.toUpperCase(), pattern, paramNames, handler });
  };

  server.on("request", async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://internal");
      const method = (req.method ?? "GET").toUpperCase();
      for (const route of routes) {
        if (route.method !== method) continue;
        const match = route.pattern.exec(url.pathname);
        if (!match) continue;
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]!);
        });
        await route.handler(req, res, params);
        return;
      }

      sendError(res, 404, "not_found", `No route for ${method} ${url.pathname}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "invalid_json") {
        sendError(res, 400, "invalid_json", "Request body is not valid JSON.");
        return;
      }
      if (msg === "body_too_large") {
        sendError(res, 413, "body_too_large", "Request body exceeds size limit.");
        return;
      }
      console.error("[bridge] unhandled route error:", err);
      if (!res.headersSent) {
        sendError(res, 500, "internal_error", "Unexpected server error.");
      } else {
        res.end();
      }
    }
  });

  registerConversation(server);
  registerEvents(server);
  registerQuestNotifications(server);
  registerQuestCompletion(server);

  return server;
}

export interface BridgeStartOptions {
  host?: string;
  port?: number;
}

export async function startServer(options: BridgeStartOptions = {}): Promise<http.Server> {
  const host = options.host ?? process.env["BRIDGE_HOST"] ?? "127.0.0.1";
  const port = options.port ?? Number(process.env["BRIDGE_PORT"] ?? 3000);

  if (!isLoopbackHost(host)) {
    throw new Error(
      `[bridge] refusing to bind non-loopback host "${host}". Constitution V mandates 127.0.0.1.`
    );
  }

  await ensureMemoryDirs();

  const server = createServer();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  console.log(`[bridge] listening on http://${host}:${port}`);
  console.log(`[bridge] LM Studio target: http://localhost:1234/v1`);

  try {
    const characters = loadCharacters(PROMPTS_DIR);
    const names = characters.map((c) => c.name);
    console.log(`[bridge] characters loaded: ${characters.length} [${names.join(", ")}]`);
    const missing = EXPECTED_ARCHETYPES.filter((name) => !names.includes(name));
    if (missing.length > 0) {
      console.log(`[bridge] WARNING: missing archetype prompt files: ${missing.join(", ")}`);
    }
  } catch (err) {
    console.error("[bridge] loadCharacters failed:", err);
  }

  try {
    await retrySavedNotifications();
    console.log(`[bridge] retried pending notifications: 0`);
  } catch (err) {
    console.error("[bridge] retrySavedNotifications failed:", err);
  }

  return server;
}

const isMain =
  typeof process.argv[1] === "string" &&
  import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
