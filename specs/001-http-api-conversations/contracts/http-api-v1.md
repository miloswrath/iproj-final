# Contract: HTTP API v1 - Conversation Service

**Feature**: 001-http-api-conversations  
**Base URL**: `http://localhost:${AI_API_PORT:-3001}` (localhost only)

All non-2xx errors follow:

```json
{
  "error": {
    "code": "conversation_not_found",
    "message": "Conversation <id> does not exist"
  }
}
```

---

## 1) POST `/conversation/start`

Create or resume an active conversation.

### Request

```json
{
  "conversationId": "ovw-npc-58-11-player1",
  "character": "enabler",
  "playerId": "player1",
  "metadata": {
    "scene": "overworld",
    "npcRole": "blacksmith-stall"
  }
}
```

### Success `200`

```json
{
  "conversationId": "ovw-npc-58-11-player1",
  "character": "enabler",
  "phase": "ACTIVE",
  "questOffered": null,
  "terminationReason": null,
  "status": "active"
}
```

### Rules

- Repeated start on active `conversationId` returns existing active state (idempotent start).
- Start on already terminated conversation returns `409` with `conversation_terminated`.

### Failure codes

- `400` invalid_request
- `409` conversation_terminated
- `422` unsupported_character
- `500` internal_error

---

## 2) POST `/conversation/message`

Send one player message and receive one NPC reply plus updated state.

### Request

```json
{
  "conversationId": "ovw-npc-58-11-player1",
  "text": "okay, what do you need me to get?",
  "idempotencyKey": "msg-0007"
}
```

### Success `200`

```json
{
  "conversationId": "ovw-npc-58-11-player1",
  "npcText": "Good. Head to the collapsed crypt and bring me the ledger.",
  "phase": "DECISION",
  "quest": {
    "offered": true,
    "questId": "enabler_retrieve-ledger-from-crypt"
  },
  "termination": {
    "ended": false,
    "reason": null
  },
  "uiHints": {
    "tone": "directive",
    "urgency": "medium"
  }
}
```

### Rules

- Duplicate (`conversationId`, `idempotencyKey`) returns prior response snapshot.
- Acceptance detection may produce termination in same call.
- On accepted termination, service runs post-conversation pipeline and returns `termination.ended = true`.

### Failure codes

- `400` invalid_request
- `404` conversation_not_found
- `409` invalid_state_transition
- `409` invalid_idempotency_reuse
- `500` internal_error

---

## 3) POST `/conversation/end`

Explicitly end conversation (exit/menu close/scene transition).

### Request

```json
{
  "conversationId": "ovw-npc-58-11-player1",
  "reason": "exit",
  "idempotencyKey": "end-001"
}
```

### Success `200`

```json
{
  "conversationId": "ovw-npc-58-11-player1",
  "status": "terminated",
  "phase": "TERMINATION",
  "terminationReason": "exit"
}
```

### Rules

- First valid end call runs termination pipeline when needed.
- Duplicate (`conversationId`, `idempotencyKey`) returns prior response snapshot.
- Ending unknown conversation returns `404`.

### Failure codes

- `400` invalid_request
- `404` conversation_not_found
- `409` invalid_state_transition
- `409` invalid_idempotency_reuse
- `500` internal_error

---

## 4) GET `/conversation/state/:id`

Read current state for UI recovery/debug.

### Success `200`

```json
{
  "conversationId": "ovw-npc-58-11-player1",
  "character": "enabler",
  "phase": "ACTIVE",
  "questOffered": null,
  "terminationReason": null,
  "status": "active",
  "lastUpdatedAt": "2026-04-23T14:12:00.000Z"
}
```

### Failure codes

- `404` conversation_not_found
- `500` internal_error

---

## Cross-cutting Behaviors

### Idempotency & Retries

- `start`: idempotent by `conversationId`
- `message`: idempotent by (`conversationId`, `idempotencyKey`)
- `end`: idempotent by (`conversationId`, `idempotencyKey`)
- Reusing keys on retries is required for safe replay behavior.

### Session Cleanup

- Active sessions auto-end after 10 minutes of inactivity (`reason = exit`).
- Ended sessions are removed from active map after pipeline completion.
- Minimal replay metadata retained for 5 minutes to support duplicate retry responses.

### Memory Semantics

- Conversation transcript/history is session-scoped and discarded after session end.
- Persistent player/character memory remains stored in `memory/` and reused across sessions.

### Downstream Notification

- Accepted terminations continue to trigger outbound `POST /quest/start` notification using existing retry-queue behavior.
