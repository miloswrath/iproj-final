# AI API Documentation (`/ai`)

This document explains the API surface implemented in `ai/`, including every network endpoint the app calls, payload formats, expected responses, and integration requirements for downstream systems.

> Important: this project now supports **two runtime modes**:
> 1) terminal runtime (`src/index.ts`), and
> 2) inbound localhost HTTP API service (`src/server.ts`).
>
> Both modes reuse the same conversation, lifecycle detection, memory update, and outbound game notification pipeline.

---

## 1) High-Level Architecture

The runtime flow is:

1. Client uses terminal mode (`src/index.ts`) or HTTP mode (`src/server.ts`).
2. Conversation messages are sent to local LLM (`src/client.ts`).
3. Quest-offer and acceptance detection run via classifier logic (`src/lifecycle/detector.ts`).
4. On termination, post-conversation pipeline updates memory (`src/lifecycle/pipeline.ts`).
5. Accepted terminations post a quest-start notification (`src/notify/game-api.ts`).
6. Failed outbound game notifications are persisted and retried next launch.

---

## 2) Endpoint Inventory

| # | Endpoint | Method | Called By | Purpose |
|---|---|---|---|---|
| 1 | `/conversation/start` | `POST` | Inbound clients -> `src/server.ts` | Create/resume conversation session |
| 2 | `/conversation/message` | `POST` | Inbound clients -> `src/server.ts` | Send one player message, receive one NPC reply + state |
| 3 | `/conversation/end` | `POST` | Inbound clients -> `src/server.ts` | End conversation explicitly |
| 4 | `/conversation/state/:id` | `GET` | Inbound clients -> `src/server.ts` | Read conversation state |
| 5 | `http://localhost:1234/v1/chat/completions` | `POST` | `sendMessage()` in `src/client.ts` | Generate in-character NPC replies |
| 6 | `http://localhost:1234/v1/chat/completions` | `POST` | `classifyQuestOffer()` in `src/lifecycle/detector.ts` | Verify whether NPC offered a concrete quest |
| 7 | `http://localhost:1234/v1/chat/completions` | `POST` | `classifyIntent()` in `src/lifecycle/detector.ts` | Classify player intent (`accept/reject/uncertain`) |
| 8 | `http://localhost:3000/quest/start` (default) or `GAME_API_URL` | `POST` | `notifyQuestStart()` in `src/notify/game-api.ts` | Notify game system that quest conversation terminated and should transition |

---

## 3) Inbound HTTP Conversation API

Base URL: `http://localhost:${AI_API_PORT:-3001}`

### `POST /conversation/start`
- Idempotent by `conversationId`
- Creates or resumes active conversation
- Returns `409 conversation_terminated` if ID is in terminated replay window

### `POST /conversation/message`
- Idempotent by (`conversationId`, `idempotencyKey`)
- Processes exactly one player turn and returns exactly one NPC reply
- May terminate in same call when acceptance is detected

### `POST /conversation/end`
- Idempotent by (`conversationId`, `idempotencyKey`)
- Explicitly terminates conversation and runs post-conversation pipeline

### `GET /conversation/state/:id`
- Returns active or recently-terminated state snapshot
- Returns `404 conversation_not_found` for unknown IDs

### Cross-cutting behavior
- Active sessions auto-end after 10 minutes of inactivity (`terminationReason = exit`)
- Terminated replay metadata retained for 5 minutes for idempotent retry safety
- Non-2xx errors use `{ error: { code, message } }`

---

## 4) Local LLM API Endpoints

All LLM calls use OpenAI-compatible Chat Completions via the OpenAI SDK:

- **Base URL**: `http://localhost:1234/v1`
- **API Key**: `lm-studio` (placeholder, required by SDK shape)
- **Model**: `local-model`

### 3.1 Chat Completion (primary conversation)

**Endpoint**
- `POST /v1/chat/completions`

**Used by**
- `sendMessage(session, userText)` in `src/client.ts`

**Request shape (effective)**
```json
{
  "model": "local-model",
  "messages": [
    { "role": "system", "content": "<active character system prompt>" },
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Behavior notes**
- The first message is always the active character’s enriched system prompt.
- Full session history is appended after system prompt.
- On success, assistant text is appended to session history and rendered in terminal.

**Failure handling**
- If connection fails (`ECONNREFUSED`, fetch/connect errors), function returns sentinel string:
  - `"__CONNECTION_ERROR__"`
- Caller prints user-friendly error:
  - `LM Studio is not running at localhost:1234...`

---

### 3.2 Quest Offer Classification

**Endpoint**
- `POST /v1/chat/completions`

**Used by**
- `classifyQuestOffer(npcText)` in `src/lifecycle/detector.ts`

**When called**
- Only after lightweight rule check passes (contains both location + retrieval cues).

**Prompt contract**
- Model is asked to return JSON only:
```json
{"offered": true | false, "questSummary": "<slug>"}
```

**Post-processing**
- Response is parsed by extracting first `{ ... }` block.
- Final quest ID format:
  - `<characterName>_<questSummarySlug>`
  - fallback slug: `q<questLevel>`

**Failure handling**
- Any parse/model error => `{ offered: false, questSummary: "" }`

---

### 3.3 Player Intent Classification

**Endpoint**
- `POST /v1/chat/completions`

**Used by**
- `classifyIntent(text, questContext)` in `src/lifecycle/detector.ts`

**Prompt contract**
- Model must return JSON only:
```json
{"intent":"accept"|"reject"|"uncertain","confidence":0-100}
```

**Decision logic**
- Rule trigger is checked first (`checkRuleTrigger`);
- If no rule-trigger acceptance, model result is evaluated:
  - accepted if `intent === "accept"` and confidence >= threshold.

**Threshold config**
- Env var: `ACCEPT_CONFIDENCE_THRESHOLD`
- Default: `75`

**Failure handling**
- Any parse/model error => `{ intent: "uncertain", confidence: 0 }`

---

## 4) External Game API Endpoint

### 4.1 Quest Start Notification

**Endpoint**
- `POST /quest/start`
- Default absolute URL: `http://localhost:3000/quest/start`
- Overridable via `GAME_API_URL`

**Used by**
- `notifyQuestStart(payload)` in `src/notify/game-api.ts`
- Triggered after `runWithNotification()` in `src/lifecycle/pipeline.ts`

**Request headers**
```http
Content-Type: application/json
```

**Request body schema**
```json
{
  "character": "string",
  "questId": "string",
  "playerState": {
    "level": 1
  },
  "relationshipSnapshot": {
    "trust": 0,
    "dependency": 0,
    "bond": 0,
    "wariness": 0
  },
  "terminationReason": "rule | model | simulate | exit"
}
```

**Example payload**
```json
{
  "character": "enabler",
  "questId": "enabler_retrieve-relic-from-crypt",
  "playerState": { "level": 1 },
  "relationshipSnapshot": {
    "trust": 74,
    "dependency": 57,
    "bond": 61,
    "wariness": 18
  },
  "terminationReason": "rule"
}
```

**Response handling rules**
- `2xx`: success, no retry needed.
- `4xx`: treated as permanent client error, payload dropped.
- `5xx`: treated as transient server error, payload saved for retry.
- Network/transport failure: payload saved for retry.

**Retry behavior**
- Pending payloads stored in:
  - `memory/pending-notifications.json` (resolved from `MEMORY_DIR`)
- Retries are run automatically at startup via `retrySavedNotifications()`.
- On successful replay, pending list is reduced/cleared.

---

## 5) Environment Variables

| Variable | Default | Used In | Description |
|---|---|---|---|
| `GAME_API_URL` | `http://localhost:3000/quest/start` | `src/notify/game-api.ts` | Full URL for quest start notifications |
| `ACCEPT_CONFIDENCE_THRESHOLD` | `75` | `src/lifecycle/detector.ts` | Minimum model confidence to auto-accept quest intent |

---

## 6) Integration Notes for Game/API Developers

If you are implementing the receiving game service:

1. Expose `POST /quest/start`.
2. Accept the JSON payload shown above.
3. Return:
   - `200/201/204` for success,
   - `4xx` for invalid payloads (client bug),
   - `5xx` for temporary server failures (will be retried).
4. Make endpoint idempotent if possible (retries can resend same payload).

Recommended idempotency key candidate:
- `character + questId + terminationReason + timestamp-at-receiver` policy.

---

## 7) Non-HTTP API Surface (Terminal Commands)

For completeness, developers can also drive behavior through CLI commands in `src/index.ts`:

- `/switch <name>`
- `/list`
- `/history`
- `/clear`
- `/quest <id>`
- `/state`
- `/char <name>`
- `/features`
- `/reload`
- `/simulate_accept`
- `/quit`

These commands are documented contractually in:
- `specs/001-local-llm-chat-api/contracts/cli-commands.md`
- `specs/002-memory-termination-system/contracts/cli-commands.md`

---

## 8) Source of Truth

- Conversation call path: `src/client.ts`
- Lifecycle detection/classification: `src/lifecycle/detector.ts`
- Notification client + retry queue: `src/notify/game-api.ts`
- Pipeline trigger point: `src/lifecycle/pipeline.ts`
- Runtime orchestration/command handling: `src/index.ts`
