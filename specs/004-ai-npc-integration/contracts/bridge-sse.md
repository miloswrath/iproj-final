# Contract: Bridge SSE Event Stream (Bridge → Browser)

**Feature**: 004-ai-npc-integration
**Owner**: `ai/src/server/routes/events.ts`
**Stability**: v1 (path `/api/v1/events`)

The bridge exposes a single Server-Sent Events stream that the browser subscribes to via `EventSource`. The stream relays `quest_start` and `quest_complete` notifications received over the loopback POST endpoints.

---

## GET /api/v1/events

**Headers**:

```
Accept: text/event-stream
Cache-Control: no-cache
Last-Event-ID: <id>     # optional, sent by EventSource on auto-reconnect
```

**Response (200)**:

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

The connection is held open. The bridge sends:

1. **An initial comment heartbeat** within 1 s of connect: `: connected\n\n` — gives the browser a fast confirmation that the stream is live and prevents early reconnect.
2. **A periodic comment heartbeat** every 25 s: `: ping\n\n` — keeps proxies and `EventSource`'s implicit timeout happy.
3. **Quest events** as described below, one per notification.

**Disconnect handling**:
- If the browser tab closes, the bridge's `req.on("close", ...)` removes the listener from the eventBus.
- If the bridge process restarts, `EventSource` auto-reconnects after a default 3 s delay; the browser sends `Last-Event-ID` of the last received event. The bridge does **not** keep an event replay buffer — events emitted while the client was disconnected are not redelivered. Loss is recovered by the existing `pending-notifications.json` retry on the AI side, which re-POSTs to `/quest/start` on bridge restart, which re-emits to live SSE clients.

---

## Event: quest_start

```
event: quest_start
id: 1714123456789-0
data: {"character":"general","questId":"general_L1_clear-the-cellar","playerState":{"level":1},"relationshipSnapshot":{"trust":52,"dependency":48,"bond":50,"wariness":50},"terminationReason":"rule"}
```

**Field-by-field** (matches `QuestStartPayload` from `ai/src/types.ts`):

| Field | Type | Notes |
|-------|------|-------|
| `character` | string | NPC archetype name. |
| `questId` | string | Format `<character>_L<level>_<slug>`. |
| `playerState.level` | number | Currently always 1 (placeholder until authoritative state). |
| `relationshipSnapshot` | object | `trust`, `dependency`, `bond`, `wariness` (0..100). |
| `terminationReason` | string | One of `rule`, `model`, `simulate`, `exit`. |

**Browser handling**: spawn a `QuestToast` with kind `quest_start`. No game-state mutation beyond UI.

---

## Event: quest_complete

```
event: quest_complete
id: 1714123456790-0
data: {"character":"general","questId":"general_L1_clear-the-cellar","outcome":"success","playerState":{"level":1},"relationshipSnapshot":{...},"rewardReceived":true,"eventTimestamp":"2026-04-26T18:25:00.000Z"}
```

**Field-by-field** (matches `QuestCompletionPayload`):

| Field | Type | Notes |
|-------|------|-------|
| `character` | string | |
| `questId` | string | |
| `outcome` | string | One of `success`, `failure`, `abandoned`. |
| `playerState.level` | number | |
| `relationshipSnapshot` | object | |
| `rewardReceived` | boolean | |
| `eventTimestamp` | string | ISO-8601. |

**Browser handling**: spawn a `QuestToast` with kind `quest_complete`. No game-state mutation beyond UI in this feature pass — actual reward/inventory effects are out of scope.

---

## Test cases (contract-level)

| ID | Scenario | Expected |
|----|----------|----------|
| S-1 | Browser connects to `/api/v1/events` | Response is `200 text/event-stream`, first chunk arrives within 1 s with `: connected` |
| S-2 | After connect, bridge receives `POST /quest/start` from `notify` module | SSE client observes `event: quest_start` within 100 ms |
| S-3 | Bridge sends 25 s of silence | Heartbeat `: ping` arrives at ~25 s |
| S-4 | Connection drops, reconnects | New connection works without server-side cleanup of subscribers |
| S-5 | Two browser tabs both subscribe | Both receive every event |
| S-6 | Malformed JSON in `data:` field | Never happens — the bridge always JSON-stringifies the validated payload type |

---

## Why SSE, not WebSocket

(See research.md R1.) Recap: events are unidirectional, EventSource is native to browsers, no extra deps, automatic reconnection with `Last-Event-ID`. WebSocket would add a dep and a protocol surface for no feature-driven gain.
