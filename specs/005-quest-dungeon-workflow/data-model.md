# Phase 1 Data Model: Quest Dungeon Workflow

**Feature**: 005-quest-dungeon-workflow  
**Date**: 2026-04-28

## Entity: Quest

Represents a single accepted NPC quest.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `questId` | string | Stable key (`<character>_L<level>_<slug>`), unique across all quests |
| `title` | string | Human-friendly unique title shown on portal/codex |
| `character` | string | NPC archetype/source character |
| `status` | `active \| completed \| failed \| abandoned` | Lifecycle state |
| `acceptedAt` | ISO timestamp | Required |
| `completedAt` | ISO timestamp \| null | Required when status terminal |
| `lore` | string \| null | Optional generated lore text |
| `sourceConversationId` | string | Bridge conversation session id or derived thread id |
| `memorySyncPending` | boolean | True if gameplay completion happened but AI memory sync retry pending |
| `completionOutcome` | `success \| failure \| abandoned \| null` | Mirrors completion contract |

**Relationships**:
- 1 Quest ↔ 1 DungeonRun
- 1 Quest ↔ 0..1 LoreEntry (active) + historical codex representation

---

## Entity: DungeonRun

Three-floor run linked to one quest.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `runId` | string | Unique ID, usually derived from questId |
| `questId` | string | FK to Quest |
| `floorIds` | string[3] | Exactly 3 floor map IDs |
| `currentFloorIndex` | `0 \| 1 \| 2` | Active floor pointer |
| `state` | `in_progress \| complete \| failed \| abandoned` | Overall run state |
| `floors` | `FloorObjectiveState[3]` | Objective state per floor |
| `startedAt` | ISO timestamp | Required |
| `lastCheckpointAt` | ISO timestamp | Updated on floor clear/portal transition |

**Validation**:
- `floorIds.length === 3`
- `floors.length === 3`
- no floor transition unless prior floor `isComplete=true`

---

## Entity: FloorObjectiveState

Tracks completion logic for a single floor.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `floorIndex` | `0 \| 1 \| 2` | Required |
| `mapId` | string | Curated pool identifier |
| `totalEnemies` | number | `>= 0` |
| `defeatedEnemyIds` | string[] | deduped set semantics |
| `totalChests` | number | `>= 0` |
| `openedChestIds` | string[] | deduped set semantics |
| `isComplete` | boolean | Computed gate (`enemies && chests clear`) |
| `portalSpawned` | boolean | Exactly one progression portal per completed floor |
| `recoveryInvocations` | number | Count of objective reset/recheck usage |

**Derived field**:
- `remainingEnemies = totalEnemies - defeatedEnemyIds.length`
- `remainingChests = totalChests - openedChestIds.length`

---

## Entity: LoreEntry

Codex-facing narrative metadata for active/completed quests.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `questId` | string | FK to Quest |
| `title` | string | Same display title as quest |
| `summary` | string | Lore body or fallback summary |
| `status` | `active \| completed \| failed \| abandoned` | Mirrors quest status |
| `acceptedAt` | ISO timestamp | For chronology |
| `completedAt` | ISO timestamp \| null | For chronology |
| `npcName` | string | Display companion/NPC |

**Sort order**:
- primary: `completedAt` desc for terminal quests
- secondary: `acceptedAt` desc

---

## Entity: ConversationMemoryContext

Persisted conversation continuity data used across repeat sessions.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `character` | string | NPC key |
| `recentTopic` | string | Last active quest/topic thread |
| `completedQuestRefs` | string[] | Recent completed quest IDs |
| `lastTerminationReason` | string \| null | Existing memory field used for context |
| `updatedAt` | ISO timestamp | freshness marker |

**Purpose**:
- Keeps follow-up conversation on-topic unless user changes it.
- Eliminates restart-required conversation regression by cleanly restoring context on new sessions.

---

## Entity: CompanionFollowState

Runtime-only behavior state for post-generation companion following.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `enabled` | boolean | On once quest generated |
| `targetPlayerId` | string | player entity reference |
| `desiredDistancePx` | number | tighter than enemy chase distance |
| `followSpeed` | number | > enemy chase speed baseline |
| `mode` | `idle \| catchup \| maintain` | state machine |

---

## Key State Transitions

```text
Quest: draft/none
  -> active (acceptance)
  -> completed (floor 3 clear + exit)
  -> failed/abandoned (explicit outcome)

DungeonRun:
  in_progress floor0 -> in_progress floor1 -> in_progress floor2 -> complete

FloorObjectiveState:
  active -> complete (all enemies + all chests)
  active -> active (recovery recheck/reset)

LoreEntry:
  active entry created at acceptance
  active -> terminal status update at quest completion/failure/abandon
```

## Cross-Module Invariants

1. Game runtime is authoritative for floor objective truth and transition timing.
2. AI bridge is authoritative for memory persistence and codex retrieval interfaces.
3. `questId`/`title` identity remains stable across game scene transitions and memory retries.
4. Completion feedback to player is not blocked by eventual memory synchronization.
