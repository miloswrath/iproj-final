import type { IncomingMessage, Server, ServerResponse } from "node:http";
import {
  getActiveCharacterState,
  listFriendRoster,
  markPendingUnlockDiscovered,
  refreshFriendSummary,
} from "../../memory/friendship.js";
import { readJsonBody, sendError, sendJson } from "../http.js";

async function handleFriends(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const roster = await listFriendRoster();
  sendJson(res, 200, roster);
}

async function handleActiveCharacter(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const activeCharacter = await getActiveCharacterState();
  sendJson(res, 200, activeCharacter);
}

async function handleSummaryRefresh(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = (await readJsonBody(req)) as {
    npcId?: unknown;
    trigger?: unknown;
  };
  const npcId = typeof body.npcId === "string" ? body.npcId.trim() : "";
  const trigger = typeof body.trigger === "string" ? body.trigger.trim() : "";

  if (!npcId) {
    sendError(res, 400, "unknown_npc", "Field 'npcId' is required.");
    return;
  }
  if (trigger && trigger !== "post_friendship_conversation_exit") {
    sendError(res, 400, "invalid_trigger", "Unsupported summary refresh trigger.");
    return;
  }

  const result = await refreshFriendSummary(npcId);
  if (!result.applied) {
    sendError(res, 400, "friend_not_unlocked", "Friend summary is only available after friendship unlock.");
    return;
  }

  await markPendingUnlockDiscovered(npcId);
  sendJson(res, 200, result);
}

export function register(server: Server): void {
  server.addRoute("GET", "/api/v1/friends", handleFriends);
  server.addRoute("GET", "/api/v1/friends/active-character", handleActiveCharacter);
  server.addRoute("POST", "/api/v1/friends/summary/refresh", handleSummaryRefresh);
}
