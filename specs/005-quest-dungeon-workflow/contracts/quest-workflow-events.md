# Contract: Quest Workflow Event Stream (Bridge SSE)

**Feature**: 005-quest-dungeon-workflow  
**Endpoint**: `GET /api/v1/events`  
**Transport**: Server-Sent Events (`text/event-stream`)

This feature keeps the existing SSE channel and extends quest payload fields used by `game/`.

---

## Event: `quest_start`

Dispatched when quest acceptance is finalized in conversation flow.

### SSE frame

```text
event: quest_start
id: 1714321000000-0
data: {"character":"general","questId":"general_L1_clear-the-cellar","questTitle":"Clear the Cellar","lore":"A damp cellar where lanternlight drowns in spores...","playerState":{"level":1},"relationshipSnapshot":{"trust":52,"dependency":48,"bond":50,"wariness":50},"terminationReason":"rule"}
```

### Required fields

- `character: string`
- `questId: string`
- `questTitle: string` (unique, player-facing)
- `playerState.level: number`
- `relationshipSnapshot.{trust,dependency,bond,wariness}: number`
- `terminationReason: string`

### Optional fields

- `lore: string | null`

### Game usage

- Set active quest metadata.
- Rename/retitle single quest portal UI.
- Enable companion follow behavior.
- Seed lore codex current-entry panel.

---

## Event: `quest_complete`

Dispatched after completion processing (or retry registration) for a quest.

### SSE frame

```text
event: quest_complete
id: 1714321900000-0
data: {"character":"general","questId":"general_L1_clear-the-cellar","questTitle":"Clear the Cellar","outcome":"success","rewardReceived":true,"eventTimestamp":"2026-04-28T17:25:00.000Z","memorySyncPending":false}
```

### Required fields

- `character: string`
- `questId: string`
- `outcome: success | failure | abandoned`
- `rewardReceived: boolean`

### Optional fields

- `questTitle: string`
- `eventTimestamp: ISO string`
- `memorySyncPending: boolean`

### Game usage

- Trigger completion toast feedback.
- Mark quest terminal in codex.
- Show pending-sync non-blocking indicator if `memorySyncPending=true`.

---

## Connection behavior

- Initial connect heartbeat comment: `: connected`
- Periodic heartbeat: `: ping`
- EventSource auto-reconnect supported.
- No persistent replay buffer; durability remains via existing notification retry pipeline.

---

## Compatibility note

Clients that only consume legacy fields (`questId`, `character`, `outcome`) remain valid. New fields are additive.
