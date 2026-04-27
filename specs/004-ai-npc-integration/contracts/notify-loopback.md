# Contract: Notify Loopback (ai/notify → Bridge)

**Feature**: 004-ai-npc-integration
**Owner**: `ai/src/server/routes/questNotifications.ts` (receiver) — `ai/src/notify/game-api.ts` (sender, **unchanged**)
**Stability**: Pre-existing contract, preserved verbatim.

This contract documents the existing HTTP POST surface that `notify/game-api.ts` already targets. The bridge **terminates** these POSTs on its own port and re-emits them as SSE events. **No code changes are made to `ai/src/notify/game-api.ts`** — it continues to POST as it always has.

---

## POST /quest/start

**Sender**: `notifyQuestStart` in `ai/src/notify/game-api.ts`.
**Receiver**: bridge handler `routes/questNotifications.ts`.
**URL**: `process.env.GAME_API_URL ?? "http://localhost:3000/quest/start"` (existing default).

**Request body** — `QuestStartPayload` (`ai/src/types.ts`):

```json
{
  "character": "general",
  "questId": "general_L1_clear-the-cellar",
  "playerState": { "level": 1 },
  "relationshipSnapshot": {
    "trust": 52,
    "dependency": 48,
    "bond": 50,
    "wariness": 50
  },
  "terminationReason": "rule"
}
```

**Response 200** with empty body. Anything 2xx is treated as success by `postNotification`.

**Receiver behavior**:
1. Validate the body shape (best-effort — log warning on unknown fields, do not reject).
2. Emit `{kind: "quest_start", payload, receivedAt: new Date().toISOString()}` on the process-wide `eventBus`.
3. Respond 200 immediately.

**Failure modes** (handled by existing `notify/game-api.ts` retry):

| HTTP | Sender behavior |
|------|-----------------|
| 4xx | Drop payload (logged) — no retry. |
| 5xx | Append to `pending-notifications.json` for retry on next bridge run. |
| Network error | Same as 5xx — retry on next run. |

---

## POST /quest/complete

**Sender**: `notifyQuestComplete` in `ai/src/notify/game-api.ts`.
**Receiver**: same bridge handler module.
**URL**: `process.env.GAME_API_URL_COMPLETE ?? "http://localhost:3000/quest/complete"` (existing default).

**Request body** — `QuestCompletionPayload`:

```json
{
  "character": "general",
  "questId": "general_L1_clear-the-cellar",
  "outcome": "success",
  "playerState": { "level": 1 },
  "relationshipSnapshot": { ... },
  "rewardReceived": true,
  "eventTimestamp": "2026-04-26T18:25:00.000Z"
}
```

**Response 200** with empty body.

**Receiver behavior**: same as `/quest/start` but emits `kind: "quest_complete"`.

---

## Test cases

| ID | Scenario | Expected |
|----|----------|----------|
| L-1 | Bridge running, `notifyQuestStart` invoked from a unit test in the same process | POST hits `/quest/start`, returns 200, eventBus emits once |
| L-2 | Bridge running, `notifyQuestComplete` invoked | POST hits `/quest/complete`, returns 200, eventBus emits once |
| L-3 | Bridge stopped, `notifyQuestStart` invoked | POST fails (network error, retryable), `pending-notifications.json` accrues an entry |
| L-4 | Bridge restarts after L-3 | `retrySavedNotifications()` re-POSTs the pending entry, bridge handles it, queue empties |
| L-5 | Receiver gets a malformed body (no `character` field) | Logs warning, returns 200, no eventBus emit |

---

## Versioning notes

This contract is **frozen** at the existing payload shape. If `QuestStartPayload` or `QuestCompletionPayload` ever change, both the sender (`notify/game-api.ts`) and receiver (`questNotifications.ts`) MUST be updated together, and the SSE contract (`bridge-sse.md`) MUST be reviewed for downstream consumers.
