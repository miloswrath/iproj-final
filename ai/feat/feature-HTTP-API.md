# Feature -> HTTP API Service for AI Conversations

## Required Context Files

Read these before writing or revising requirements:

- [docs/feat/CONSTITUTION.md](../../docs/feat/CONSTITUTION.md)
- [MECHANICS-CONSTITUTION.txt](../../MECHANICS-CONSTITUTION.txt)
- [docs/game-design/game-functionality.md](../../docs/game-design/game-functionality.md)
- [ai/docs/api/README.md](../docs/api/README.md)

## Requirements

- Convert `ai/` from terminal-only orchestration into a callable HTTP service while reusing existing conversation, detection, and memory pipeline logic.
- Run as a **shared singleton AI service** that handles multiple active conversations concurrently via explicit conversation IDs.
- Keep memory semantics explicit:
  - Conversation chat history is scoped to one conversation session and is discarded when that conversation ends.
  - Persistent player/character memory remains saved in `memory/` and is reused for future conversations.
- Implement inbound HTTP endpoints:
  - `POST /conversation/start`
  - `POST /conversation/message`
  - `POST /conversation/end`
  - `GET /conversation/state/:id`
- AI service is the source-of-truth for conversation phase transitions (`ACTIVE -> ESCALATION -> DECISION -> TERMINATION`); game client consumes returned state.
- Preserve outbound game notification behavior after accepted termination (`POST /quest/start`) with existing retry queue behavior.
- Add idempotency and retry-safe behavior for game->AI calls.

## Endpoint Contracts (v1)

### `POST /conversation/start`

Create or resume an active conversation.

Request:
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

Response `200`:
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

Rules:
- If `conversationId` already exists and is active, return current active state (idempotent start).
- If `conversationId` exists but is terminated, return `409` with error `conversation_terminated`.

### `POST /conversation/message`

Send one player message and receive one NPC reply + updated state.

Request:
```json
{
  "conversationId": "ovw-npc-58-11-player1",
  "text": "okay, what do you need me to get?",
  "idempotencyKey": "msg-0007"
}
```

Response `200`:
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

Rules:
- Service applies quest-offer and acceptance detection using current logic.
- If acceptance is detected, service freezes conversation, generates final NPC confirmation, runs post-conversation pipeline, and returns `termination.ended = true`.
- Duplicate `idempotencyKey` for same `conversationId` returns the previously produced response.

### `POST /conversation/end`

Explicitly end conversation (e.g., player walks away, menu close, scene transition).

Request:
```json
{
  "conversationId": "ovw-npc-58-11-player1",
  "reason": "exit",
  "idempotencyKey": "end-001"
}
```

Response `200`:
```json
{
  "conversationId": "ovw-npc-58-11-player1",
  "status": "terminated",
  "phase": "TERMINATION",
  "terminationReason": "exit"
}
```

Rules:
- First valid end call runs pipeline if not already terminated.
- Subsequent duplicate end calls with same idempotency key return same response (idempotent end).
- Ending an unknown conversation returns `404`.

### `GET /conversation/state/:id`

Read current state for UI/debug recovery.

Response `200`:
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

## Error Model

All non-2xx responses use:
```json
{
  "error": {
    "code": "conversation_not_found",
    "message": "Conversation ovw-npc-58-11-player1 does not exist"
  }
}
```

Planned status codes:
- `400` invalid request shape
- `404` conversation not found
- `409` invalid state transition (already terminated, etc.)
- `422` unknown/unsupported character
- `500` internal error / LLM client failure

## Session, Cleanup, and Retention Decisions

- Active session store: in-memory map keyed by `conversationId`.
- Ended conversations are removed from active map immediately after termination pipeline completes.
- Minimal terminated metadata may be retained for 5 minutes for idempotent replay responses, then evicted.
- Hard timeout: inactive active-conversations auto-ended after 10 minutes with reason `exit`.

## Source-of-Truth Decision

- AI service owns lifecycle state and acceptance detection.
- Game client is consumer of returned state and should not attempt to override phase transitions.
- Game may validate transitions locally for UI purposes but must treat AI response as authoritative.

## Idempotency and Retry Behavior

- `POST /conversation/start`: idempotent by `conversationId`.
- `POST /conversation/message`: idempotent by (`conversationId`, `idempotencyKey`).
- `POST /conversation/end`: idempotent by (`conversationId`, `idempotencyKey`).
- Client retries on network/5xx are safe when idempotency keys are reused.

## Out Of Scope

- Authentication/authorization and public internet hardening.
- Multiplayer shared dialogue in one conversation stream.
- Voice/audio dialogue transport.
- Game-authoritative quest completion or reward resolution.

## Implementation Plan

### ***Checkpoint 1: HTTP skeleton + session manager***

- [ ] Add HTTP server entrypoint in `ai/src`.
- [ ] Add in-memory conversation registry keyed by `conversationId`.
- [ ] Implement `POST /conversation/start` + `GET /conversation/state/:id`.
- [ ] Add request validation and standard error responses.
- **Test**: start conversation twice with same ID returns same active state; unknown ID returns `404`.

### ***Checkpoint 2: message pipeline endpoint***

- [ ] Implement `POST /conversation/message` using existing send/detect lifecycle logic.
- [ ] Add idempotency-key cache per conversation.
- [ ] Return standardized payload including `npcText`, `phase`, `quest`, `termination`.
- **Test**: duplicate message with same idempotency key returns identical response and does not duplicate history.

### ***Checkpoint 3: explicit end + cleanup + docs***

- [ ] Implement `POST /conversation/end` with idempotent behavior.
- [ ] Trigger existing post-conversation pipeline on end.
- [ ] Add idle timeout cleanup and short terminated-session replay cache.
- [ ] Update `ai/docs/api/README.md` with inbound API + examples.
- **Test**: end conversation triggers memory persist; second end call is idempotent; idle session auto-ends and is cleaned up.

## Acceptance / Validation Scenarios

1. Start -> message -> message(acceptance) -> terminated response in one call.
2. Start -> message -> explicit end(`exit`) -> state becomes `TERMINATION`.
3. Message retry with same idempotency key does not duplicate side effects.
4. Failed outbound `/quest/start` notification is persisted to pending queue as before.

## Scope Guardrails

- Keep architecture and file structure consistent with current `ai/src` modules.
- Reuse existing detector/pipeline logic; avoid rewriting behavior unless required by transport.
- Keep endpoint surface minimal for v1 and expand only after playtest integration is stable.
- Each checkpoint should be commit-sized and independently testable.
