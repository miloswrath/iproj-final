# Contract: Quest Workflow HTTP API (Game ↔ AI Bridge)

**Feature**: 005-quest-dungeon-workflow  
**Owner**: `ai/src/server/routes/*`  
**Base**: `http://127.0.0.1:3000/api/v1`

This contract extends the existing conversation/quest bridge surface introduced in feature 004.

---

## 1) Existing conversation routes (unchanged)

- `POST /conversation/start`
- `POST /conversation/{sessionId}/message`
- `POST /conversation/{sessionId}/end`

Behavior and error contracts remain compatible with `specs/004-ai-npc-integration/contracts/bridge-http.md`.

---

## 2) POST /quest/complete (extended payload)

Reports quest completion from gameplay after floor-3 exit.

### Request body

```json
{
  "character": "general",
  "questId": "general_L1_clear-the-cellar",
  "outcome": "success",
  "rewardReceived": true,
  "playerLevel": 1,
  "runSummary": {
    "floorsCleared": 3,
    "totalEnemiesDefeated": 9,
    "totalChestsOpened": 5,
    "completedAt": "2026-04-28T17:25:00.000Z"
  }
}
```

### Validation

- `character`: required known archetype.
- `questId`: required known quest string.
- `outcome`: one of `success | failure | abandoned`.
- `rewardReceived`: required boolean.
- `runSummary`: optional in wire contract, required by game client in this feature for analytics and codex details.

### Response 200

```json
{
  "applied": true,
  "reason": "applied",
  "memorySyncPending": false
}
```

`reason` values: `applied | duplicate | invalid`.

If memory persistence is deferred/retryable, bridge may return:

```json
{
  "applied": true,
  "reason": "applied",
  "memorySyncPending": true
}
```

---

## 3) GET /quests/active

Returns the currently active quest (if any) for portal label + HUD/codex context.

### Response 200

```json
{
  "quest": {
    "questId": "general_L1_clear-the-cellar",
    "title": "Clear the Cellar",
    "character": "general",
    "status": "active",
    "acceptedAt": "2026-04-28T17:10:00.000Z",
    "lore": "A damp cellar where lanternlight drowns in spores..."
  }
}
```

If no active quest:

```json
{ "quest": null }
```

---

## 4) GET /quests/history

Returns codex-ready historical entries (completed/failed/abandoned + optional active).

### Query params

- `limit` (optional, default 20, max 100)
- `includeActive` (optional boolean, default `true`)

### Response 200

```json
{
  "entries": [
    {
      "questId": "general_L1_clear-the-cellar",
      "title": "Clear the Cellar",
      "character": "general",
      "status": "completed",
      "acceptedAt": "2026-04-28T17:10:00.000Z",
      "completedAt": "2026-04-28T17:25:00.000Z",
      "lore": "A damp cellar where lanternlight drowns in spores..."
    }
  ]
}
```

Sorted newest-first by completion timestamp, then acceptance timestamp.

---

## Error format (all routes)

```json
{
  "error": "machine_code",
  "message": "human readable"
}
```

Common codes:
- `invalid_json`
- `unknown_character`
- `invalid_outcome`
- `session_not_found`
- `session_terminated`
- `lm_studio_unavailable`

---

## Contract tests (minimum)

1. Completion payload with `runSummary` accepted and persisted.
2. Duplicate completion returns `applied=false, reason=duplicate`.
3. `GET /quests/active` returns null when no active quest.
4. `GET /quests/history` returns stable sorted order.
5. Bridge compatibility with legacy completion body (no `runSummary`) remains non-breaking.
