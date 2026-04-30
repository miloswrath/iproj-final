# Phase 1 Data Model: Dungeon Debug Tools and Global Leveling

**Feature**: 006-dungeon-debug-leveling  
**Date**: 2026-04-29

## Entity: PlayerProfile

Persistent player identity and progression record stored in `ai/memory/player-profile.json`.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `isolation` | number | Existing bounded profile metric |
| `hope` | number | Existing bounded profile metric |
| `burnout` | number | Existing bounded profile metric |
| `traits` | object | Existing trait object with 0..1 values |
| `globalCharacterLevel` | integer | New persistent level field; minimum 1; defaults to 1 when missing/invalid |

**Validation Rules**:
- `globalCharacterLevel` must be a finite integer >= 1.
- On load, missing/null/invalid values are normalized to `1`.

---

## Entity: QuestCompletionEvent

Canonical quest completion signal processed by AI completion pipeline.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `character` | string | Known character key |
| `questId` | string | Non-empty quest identifier |
| `outcome` | `success \| failure \| abandoned` | Required terminal outcome |
| `eventTimestamp` | ISO timestamp | Used for dedupe key |
| `runSummary` | object \| undefined | Optional run telemetry |

**Progression Rule**:
- When `outcome === success` and completion event is newly applied (not duplicate), `PlayerProfile.globalCharacterLevel += 1`.

---

## Entity: DungeonDebugAction

Runtime-only action model for temporary playtest controls in dungeon scenes.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `actionType` | `kill_all_enemies \| open_all_chests \| skip_to_next_floor` | Exactly three supported actions |
| `invokedAt` | timestamp (runtime) | Optional diagnostic use |
| `targetFloorId` | string \| null | Current floor identity when available |
| `applied` | boolean | True only if action executed against a valid floor state |

**Behavior Rules**:
- Actions are scoped to current active floor only.
- `open_all_chests` only opens unopened chests.
- `skip_to_next_floor` reuses normal floor completion transition behavior.

---

## Entity: DungeonFloorState (existing, debug-augmented behavior)

Represents current floor objective state used by quest runs.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `enemyCount` | integer | >= 0 |
| `defeatedEnemyIds` | string[] | Deduped set semantics |
| `chests[]` | list | Each chest has `opened` state |
| `encounterCompleted` | boolean | True when floor objective criteria met |
| `questPortalZone` | runtime object | Used for progression interaction |

**State transitions influenced by debug**:
- `kill_all_enemies` transitions all active enemies to defeated state.
- `open_all_chests` transitions unopened chest records to opened state.
- `skip_to_next_floor` advances quest run floor index through existing completion pathway.

---

## Key State Transitions

```text
PlayerProfile.globalCharacterLevel:
  missing/invalid -> 1 (normalization)
  N -> N+1 (on newly applied successful quest completion)

DungeonDebugAction:
  requested -> applied (valid active floor)
  requested -> no-op (invalid/non-dungeon context)

DungeonFloorState:
  objective_incomplete -> objective_complete
    via normal play OR debug-assisted completion actions
```

## Cross-Module Invariants

1. `game/` runtime debug actions never write directly to AI memory files.
2. `ai/` completion pipeline remains sole writer for `globalCharacterLevel` persistence.
3. Duplicate quest completion events cannot produce multiple level increments.
4. Debug actions do not change non-debug gameplay behavior when not invoked.
