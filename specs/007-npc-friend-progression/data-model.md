# Phase 1 Data Model: NPC Friendship Progression

**Feature**: 007-npc-friend-progression  
**Date**: 2026-05-01

## Entity: NpcProgressionRecord

Represents the durable progression state for one NPC relationship.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `npcId` | string | Stable unique NPC key |
| `archetype` | string | Required supported archetype |
| `questCompletionCount` | number | Integer, `>= 0` |
| `friendshipState` | `locked \| eligible \| unlocked` | `eligible` means third quest complete, unlock pending on next conversation |
| `friendshipUnlockedAt` | ISO timestamp \| null | Required when state is `unlocked` |
| `friendshipRewardGranted` | boolean | One-time grant guard |
| `activeQuestSetId` | string | Quest set currently assigned to this NPC |
| `homePlacementId` | string | Resolved persistent world/town placement |
| `friendSummaryId` | string \| null | Link to latest friend summary record |

**Validation**:
- `questCompletionCount >= 3` is required before `friendshipState` can become `eligible` or `unlocked`.
- `friendshipRewardGranted` cannot become `true` before `friendshipState` becomes `unlocked`.

---

## Entity: FriendshipRewardPool

Configurable reward set granted when a specific NPC friendship unlock occurs.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `poolId` | string | Stable unique pool key |
| `npcId` | string | FK to `NpcProgressionRecord` / NPC config |
| `entries` | `RewardPoolEntry[]` | At least one guaranteed or chance entry |
| `version` | number | Increment when pool contents are intentionally changed |

**Rules**:
- Pool resolution runs exactly once per NPC unlock.
- A pool may contain both guaranteed and chance-based entries.

---

## Entity: RewardPoolEntry

Single reward definition inside a friendship reward pool.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `itemId` | string | Must map to a known inventory item definition |
| `quantity` | number | Integer, `>= 1` |
| `grantMode` | `guaranteed \| chance` | Required |
| `chance` | number \| null | Required for `chance`, null for `guaranteed`; normalized range `0.0..1.0` |

**Validation**:
- `chance` must be present only when `grantMode = chance`.
- Total chance across entries is not required to sum to `1.0`; each entry resolves independently.

---

## Entity: FriendSummary

Short recap shown in the friend-tracking menu.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `summaryId` | string | Stable unique key |
| `npcId` | string | FK to NPC progression |
| `displayName` | string | Required |
| `archetype` | string | Required supported archetype |
| `summaryText` | string | Non-empty concise recap |
| `questHighlights` | string[] | 0..N short quest milestone bullets |
| `lastConversationAt` | ISO timestamp | Required |
| `updatedAt` | ISO timestamp | Required |

**Purpose**:
- Supports a lightweight friend roster UI separate from quest lore history.
- Can be refreshed when new post-friendship conversations happen.

---

## Entity: FriendRoster

Player-facing collection of active friends available to the friend menu.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `friends` | `FriendSummary[]` | Sorted newest-updated first |
| `activeCount` | number | Derived from `friends.length` |
| `lastUpdatedAt` | ISO timestamp | For UI freshness indicator / cache invalidation |

---

## Entity: ActiveCharacterState

Tracks which NPC is currently active in the progression loop.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `activeNpcId` | string | Required once a starter NPC is chosen |
| `starterNpcId` | string | Persisted first-roll selection |
| `unlockedNpcIds` | string[] | Ordered progression list |
| `completedNpcIds` | string[] | NPCs with unlocked friendship state |
| `pendingUnlockNpcId` | string \| null | Newly unlocked NPC awaiting player discovery |
| `lastAdvancedAt` | ISO timestamp | Required after first unlock |

**Rules**:
- `activeNpcId` must be present in either starter or unlocked roster.
- `pendingUnlockNpcId` must be null once the player has discovered/spoken to that NPC.

---

## Entity: WorldNpcPlacement

Resolved placement assignment for active, completed, and unlocked NPCs.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `placementId` | string | Stable unique anchor key |
| `mapRegion` | `field \| town` | Required |
| `tile` | `{ x: number, y: number }` | Must reference a valid walkable anchor |
| `occupantNpcId` | string \| null | Null when unclaimed |
| `placementRole` | `active \| unlocked \| completed` | Explains why this anchor is used |

**Validation**:
- No two live placements may share the same `placementId`.
- Completed/friendly NPCs must use `town` anchors.

---

## Entity: PostBattleReturnContext

Runtime-only handoff used to restore the overworld state correctly after combat.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `playerSpawn` | `{ x: number, y: number }` | Required return point |
| `npcPlacementId` | string | Required resolved NPC anchor |
| `questCompleted` | boolean | Indicates whether progression updates should run |
| `friendshipEligibilityTriggered` | boolean | True when the third quest just completed |

**Purpose**:
- Prevents the NPC from spawning at the wrong quest-start point and visually running into place after battle.

---

## Key State Transitions

```text
NpcProgressionRecord:
  locked -> eligible -> unlocked

ActiveCharacterState:
  starter selected -> active NPC progresses -> pending unlock created -> new NPC discovered -> active NPC advances

FriendSummary:
  absent -> generated on post-third-quest conversation exit -> refreshed on later eligible updates

WorldNpcPlacement:
  unclaimed -> assigned(active/unlocked/completed) -> reassigned only by explicit progression transition
```

## Cross-Module Invariants

1. Quest completion count per NPC and friendship unlock eligibility must stay consistent between `ai/memory/` and game progression cache.
2. Friendship rewards can be granted at most once per NPC, regardless of reloads or repeated conversations.
3. Active, unlocked, and completed NPC placements must always resolve to distinct anchors.
4. Friend summary generation failure cannot roll back a successfully unlocked friendship state.
5. The active NPC selection must remain stable across reloads until progression explicitly advances.
