import { badRequest } from "./errors.js";
import type {
  EndConversationRequest,
  MessageConversationRequest,
  StartConversationRequest,
} from "./types.js";

function expectObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw badRequest("Request body must be a JSON object");
  }
  return input as Record<string, unknown>;
}

function expectString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw badRequest(`Missing or invalid '${key}'`);
  }
  return value.trim();
}

export function validateStartRequest(input: unknown): StartConversationRequest {
  const obj = expectObject(input);
  const conversationId = expectString(obj, "conversationId");
  const character = expectString(obj, "character");
  const playerId = expectString(obj, "playerId");
  const metadata = obj["metadata"] && typeof obj["metadata"] === "object" ? obj["metadata"] as Record<string, unknown> : undefined;

  return { conversationId, character, playerId, metadata };
}

export function validateMessageRequest(input: unknown): MessageConversationRequest {
  const obj = expectObject(input);
  return {
    conversationId: expectString(obj, "conversationId"),
    text: expectString(obj, "text"),
    idempotencyKey: expectString(obj, "idempotencyKey"),
  };
}

export function validateEndRequest(input: unknown): EndConversationRequest {
  const obj = expectObject(input);
  return {
    conversationId: expectString(obj, "conversationId"),
    reason: expectString(obj, "reason"),
    idempotencyKey: expectString(obj, "idempotencyKey"),
  };
}
