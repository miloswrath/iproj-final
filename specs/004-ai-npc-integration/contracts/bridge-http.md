# Contract: Bridge HTTP API (Browser → Bridge)

**Feature**: 004-ai-npc-integration
**Owner**: `ai/src/server/`
**Stability**: v1 (path prefix `/api/v1/`)

All endpoints are served from the bridge process bound to `127.0.0.1:3000`. The browser (Vite-served) reaches them via same-origin proxy at `/api/v1/...`.

Common conventions:
- Request bodies are JSON (`Content-Type: application/json`). Other types → `400 invalid_content_type`.
- All success responses are JSON with a `Content-Type: application/json; charset=utf-8` header.
- Error responses use `{"error": "<machine_code>", "message": "<human readable>"}` shape.
- Time fields are ISO-8601 strings.

---

## POST /api/v1/conversation/start

Open a new conversation with an NPC archetype.

**Request body**:

```json
{
  "character": "general"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `character` | string | yes | Must be one of the names returned by `loadCharacters(PROMPTS_DIR)` (case-insensitive). |

**Response 201**:

```json
{
  "sessionId": "9c9b1c8e-9d2e-4dc6-92e9-86d0aa3a9c2e",
  "character": "general",
  "greeting": "Oh — hey. You found me. What brings you here?",
  "conversationState": {
    "phase": "ACTIVE",
    "questOffered": null,
    "terminationReason": null,
    "frozen": false,
    "assistantResponseCount": 1,
    "firstQuestOfferTurn": null
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `sessionId` | string | UUID v4. Pass to all subsequent endpoints. |
| `character` | string | Resolved character name (lower-cased). |
| `greeting` | string | The first NPC line. The bridge calls `sendMessage(session, "[system: introduce yourself briefly to the player]")` to produce this; rationale: gives the conversation a known starting move so the browser doesn't have to send a synthetic kickoff. |
| `conversationState` | object | Mirrors `ConversationState` from `ai/src/types.ts`. |

**Errors**:

| HTTP | Code | Cause |
|------|------|-------|
| 400 | `unknown_character` | `character` not in the loaded prompt set. |
| 503 | `lm_studio_unavailable` | LM Studio at `localhost:1234` is unreachable. |

**Side effects**:
- Creates a new `Session` and stores it in the registry.
- Loads `playerProfile`, `playerSummary`, `characterMemory` from `ai/memory/`.
- No memory writes occur on `/start`.

---

## POST /api/v1/conversation/{sessionId}/message

Send a player message and receive the NPC's reply.

**Path params**:

| Field | Type | Validation |
|-------|------|------------|
| `sessionId` | string | UUID v4; must exist in the registry. |

**Request body**:

```json
{
  "text": "What's been on your mind?"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `text` | string | yes | Length 1..4000 chars. Whitespace-only → `400 empty_message`. |

**Response 200**:

```json
{
  "reply": "...the NPC's text...",
  "conversationState": {
    "phase": "ESCALATION",
    "questOffered": "general_L1_clear-the-cellar",
    "terminationReason": null,
    "frozen": false,
    "assistantResponseCount": 4,
    "firstQuestOfferTurn": 4
  },
  "terminated": false
}
```

| Field | Type | Notes |
|-------|------|-------|
| `reply` | string | The NPC's textual response. |
| `conversationState` | object | Authoritative snapshot of `Session.conversationState` after this turn. |
| `terminated` | boolean | True if the bridge ran the post-conversation pipeline as a result of this turn (acceptance accepted). |

**Termination semantics**: When `terminated: true`, the response includes the NPC's final confirmation line in `reply`. The `quest_start` SSE event has already been emitted by the time this response is returned. The session is removed from the registry; a follow-up `/message` returns `410 session_terminated`.

**Errors**:

| HTTP | Code | Cause |
|------|------|-------|
| 400 | `empty_message` | `text` empty or whitespace only. |
| 404 | `session_not_found` | Unknown `sessionId`. |
| 410 | `session_terminated` | Session already ran its end pipeline. |
| 503 | `lm_studio_unavailable` | LM Studio unreachable. The user message is **rolled back** from history (matches `client.ts` behavior) so retry is safe. |

**Side effects**:
- Updates `Session.history`, `assistantResponseCount`.
- May call `detectQuestOffer` (LM-Studio-backed); on offer, transitions phase to `ESCALATION`.
- May call `detectAcceptance`; on accept, runs `runWithNotification` → triggers `notifyQuestStart` (loopback POST → SSE event), then removes the session.

---

## POST /api/v1/conversation/{sessionId}/end

Cleanly terminate a conversation without quest acceptance. Equivalent to the CLI's `/quit` handler.

**Request body**:

```json
{
  "reason": "exit"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `reason` | string | no | One of `exit` (default), `simulate`. Other values rejected. |

**Response 200**:

```json
{ "ok": true }
```

**Errors**:

| HTTP | Code | Cause |
|------|------|-------|
| 404 | `session_not_found` | Unknown `sessionId`. |
| 410 | `session_terminated` | Session already ran its end pipeline. |

**Side effects**:
- If session is not yet frozen, calls `freezeSession(session, reason)`.
- Always calls `runPostConversationPipeline` — updates memory, writes JSON files atomically.
- Removes the session from the registry on completion (success or failure).

---

## POST /api/v1/quest/complete

Browser reports a dungeon outcome to the AI side.

**Request body**:

```json
{
  "character": "general",
  "questId": "general_L1_clear-the-cellar",
  "outcome": "success",
  "rewardReceived": true,
  "playerLevel": 1
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `character` | string | yes | Existing character name. |
| `questId` | string | yes | The id from a prior `quest_start` event. |
| `outcome` | string | yes | One of `success`, `failure`, `abandoned`. |
| `rewardReceived` | boolean | yes | |
| `playerLevel` | number | no | Default 1; placeholder until authoritative state lands. |

**Response 200**:

```json
{ "applied": true, "reason": "applied" }
```

`reason` is one of `applied`, `duplicate`, `invalid` — pass-through from `runQuestCompletionPipeline`.

**Errors**:

| HTTP | Code | Cause |
|------|------|-------|
| 400 | `invalid_outcome` | `outcome` not in the allowed set. |
| 400 | `unknown_character` | `character` not in prompts. |

**Side effects**:
- Calls `runQuestCompletionPipeline` (idempotent via `processed-completions.json`).
- Calls `notifyQuestComplete` → loopback POST `/quest/complete` → emits SSE `quest_complete` event.

---

## Test cases (contract-level)

| ID | Scenario | Expected |
|----|----------|----------|
| C-1 | `POST /start` with valid character | 201, sessionId is a UUID, greeting non-empty |
| C-2 | `POST /start` with `character: "ghost"` | 400 `unknown_character` |
| C-3 | `POST /message` with valid sessionId, text="hi" | 200, reply non-empty, `assistantResponseCount` increments by 1 |
| C-4 | `POST /message` with empty text | 400 `empty_message`, registry unchanged |
| C-5 | `POST /message` after acceptance turn | 410 `session_terminated` |
| C-6 | LM Studio offline, `POST /start` | 503 `lm_studio_unavailable` |
| C-7 | `POST /end` on active session | 200, memory files written, registry cleared |
| C-8 | `POST /quest/complete` with `outcome: "magic"` | 400 `invalid_outcome` |
| C-9 | Duplicate `POST /quest/complete` for same questId | 200 `{"applied": false, "reason": "duplicate"}` |
| C-10 | `POST /message` triggers acceptance | response has `terminated: true`; SSE `quest_start` event observed within 100 ms |
