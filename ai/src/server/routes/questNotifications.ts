import type { Server, IncomingMessage, ServerResponse } from "node:http";
import type { QuestCompletionPayload, QuestStartPayload } from "../../types.js";
import { emitQuestComplete, emitQuestStart } from "../eventBus.js";
import { readJsonBody } from "../http.js";

function hasField(obj: unknown, key: string): boolean {
  return typeof obj === "object" && obj !== null && key in obj;
}

function logIncomplete(kind: string, body: unknown): void {
  if (!body || typeof body !== "object") {
    console.warn(`[bridge] ${kind} loopback received non-object body — ignored`);
    return;
  }
  const expected = ["character", "questId", "playerState", "relationshipSnapshot"];
  const missing = expected.filter((k) => !hasField(body, k));
  if (missing.length) {
    console.warn(
      `[bridge] ${kind} loopback received body missing fields: ${missing.join(", ")}`
    );
  }
}

async function handleQuestStart(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    body = null;
  }

  if (!body || typeof body !== "object" || !hasField(body, "character")) {
    logIncomplete("quest_start", body);
    res.writeHead(200);
    res.end();
    return;
  }

  logIncomplete("quest_start", body);
  emitQuestStart(body as QuestStartPayload);
  res.writeHead(200);
  res.end();
}

async function handleQuestComplete(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    body = null;
  }

  if (!body || typeof body !== "object" || !hasField(body, "character")) {
    logIncomplete("quest_complete", body);
    res.writeHead(200);
    res.end();
    return;
  }

  logIncomplete("quest_complete", body);
  emitQuestComplete(body as QuestCompletionPayload);
  res.writeHead(200);
  res.end();
}

export function register(server: Server): void {
  server.addRoute("POST", "/quest/start", handleQuestStart);
  server.addRoute("POST", "/quest/complete", handleQuestComplete);
}
