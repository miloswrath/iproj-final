# AI API Documentation (`/ai`)

This document explains the API surface implemented in `ai/`, including every network endpoint the app calls, payload formats, expected responses, and integration requirements for downstream systems.

> Important: this project is currently an **API client + terminal runtime**, not an HTTP server. It does not expose inbound REST routes itself. Instead, it sends requests to:
> 1) a local LLM endpoint, and
> 2) an external game endpoint.

---

## 1) High-Level Architecture

The runtime flow is:

1. User chats in terminal (`src/index.ts`).
2. The app sends conversation context to local LLM (`src/client.ts`).
3. The app may run additional classifier calls (quest offer + acceptance intent) via the same LLM API (`src/lifecycle/detector.ts`).
4. On conversation termination, the app posts a quest-start notification to a game API endpoint (`src/notify/game-api.ts`).
5. On quest resolution, the app can post a quest-complete notification and apply outcome updates (`src/lifecycle/pipeline.ts`, `src/notify/game-api.ts`).
6. Failed outbound game notifications are persisted and retried next launch.

---

## 2) Endpoint Inventory

| # | Endpoint | Method | Called By | Purpose |
|---|---|---|---|---|
| 1 | `http://localhost:1234/v1/chat/completions` | `POST` | `sendMessage()` in `src/client.ts` | Generate in-character NPC replies |
| 2 | `http://localhost:1234/v1/chat/completions` | `POST` | `classifyQuestOffer()` in `src/lifecycle/detector.ts` | Verify whether NPC offered a concrete quest |
| 3 | `http://localhost:1234/v1/chat/completions` | `POST` | `classifyIntent()` in `src/lifecycle/detector.ts` | Classify player intent (`accept/reject/uncertain`) |
| 4 | `http://localhost:3000/quest/start` (default) or `GAME_API_URL` | `POST` | `notifyQuestStart()` in `src/notify/game-api.ts` | Notify game system that quest conversation terminated and should transition |
| 5 | `http://localhost:3000/quest/complete` (default) or `GAME_API_URL_COMPLETE` | `POST` | `notifyQuestComplete()` in `src/notify/game-api.ts` | Notify game system that a quest resolved (success/failure/abandoned) |

---

## 3) Local LLM API Endpoints

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
- First-offer pacing gate is enforced before classification is used:
  - first quest offer cannot be on assistant turn 1-2,
  - first quest offer is only eligible on assistant turns 3-5,
  - quest-summary slugs should be context-specific (avoid repetitive stock phrasing).
- Final quest ID format:
  - `<characterName>_L<questLevel>_<questSummarySlug>`
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
  "questId": "enabler_L2_prove-you-listened",
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
- Queue schema is typed:
```json
{
  "type": "quest_start | quest_complete",
  "payload": {},
  "attemptCount": 1,
  "lastAttemptAt": "2026-04-22T12:00:00.000Z"
}
```
- Retries are run automatically at startup via `retrySavedNotifications()`.
- Replay routing is based on `type`:
  - `quest_start` -> `/quest/start`
  - `quest_complete` -> `/quest/complete`
- Legacy untyped records are migrated as `quest_start` during replay.
- On successful replay, pending list is reduced/cleared.

### 4.2 Quest Complete Notification

**Endpoint**
- `POST /quest/complete`
- Default absolute URL: `http://localhost:3000/quest/complete`
- Overridable via `GAME_API_URL_COMPLETE`

**Used by**
- `notifyQuestComplete(payload)` in `src/notify/game-api.ts`
- Can be triggered by `/complete` runtime command and quest completion pipeline in `src/lifecycle/pipeline.ts`

**Request headers**
```http
Content-Type: application/json
```

**Request body schema**
```json
{
  "character": "string",
  "questId": "string",
  "outcome": "success | failure | abandoned",
  "playerState": {
    "level": 1
  },
  "relationshipSnapshot": {
    "trust": 0,
    "dependency": 0,
    "bond": 0,
    "wariness": 0
  },
  "rewardReceived": true,
  "eventTimestamp": "2026-04-22T12:00:00.000Z"
}
```

**Response handling rules**
- `2xx`: success, no retry needed.
- `4xx`: treated as permanent client error, payload dropped.
- `5xx`: treated as transient server error, payload saved for retry as `type: "quest_complete"`.
- Network/transport failure: payload saved for retry as `type: "quest_complete"`.

---

## 5) Environment Variables

| Variable | Default | Used In | Description |
|---|---|---|---|
| `GAME_API_URL` | `http://localhost:3000/quest/start` | `src/notify/game-api.ts` | Full URL for quest start notifications |
| `GAME_API_URL_COMPLETE` | `http://localhost:3000/quest/complete` | `src/notify/game-api.ts` | Full URL for quest complete notifications |
| `ACCEPT_CONFIDENCE_THRESHOLD` | `75` | `src/lifecycle/detector.ts` | Minimum model confidence to auto-accept quest intent |

---

## 6) Integration Notes for Game/API Developers

If you are implementing the receiving game service:

1. Expose both `POST /quest/start` and `POST /quest/complete`.
2. Accept the JSON payloads shown above.
3. Return:
   - `200/201/204` for success,
   - `4xx` for invalid payloads (client bug),
   - `5xx` for temporary server failures (will be retried).
4. Make endpoints idempotent (retries can resend the same payload).

Recommended idempotency key candidates:
- Quest start: `character + questId + terminationReason + timestamp-at-receiver`
- Quest complete: `character + questId + outcome + eventTimestamp` (or equivalent server-side request id)

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
- `/complete <success|failure|abandoned> [rewardReceived]`
- `/quit`

These commands are documented contractually in:
- `specs/001-local-llm-chat-api/contracts/cli-commands.md`
- `specs/002-memory-termination-system/contracts/cli-commands.md`

---

## 8) Source of Truth

- Conversation call path: `src/client.ts`
- Lifecycle detection/classification: `src/lifecycle/detector.ts`
- Notification client + retry queue: `src/notify/game-api.ts`
- Pipeline trigger points (termination + quest completion): `src/lifecycle/pipeline.ts`
- Runtime orchestration/command handling: `src/index.ts`
