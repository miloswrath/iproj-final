# Phase 1 Data Model: NPC Asset & Behavior Fixes

**Feature**: 008-fix-npc-asset-behavior  
**Date**: 2026-05-05

## Entity: StarterArchetypePool

Eligible archetypes for first-run NPC progression selection.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `poolId` | string | Stable identifier for the starter pool |
| `eligibleArchetypes` | string[] | Non-empty; MUST NOT include `general` |
| `selectionMode` | `random_uniform` | Random selection across eligible entries |
| `version` | number | Increment on intentional pool edits |

**Rules**:
- `general` is always excluded for initial selection.
- Selected starter is persisted for run stability.

---

## Entity: ArchetypeCharacterMapping

Canonical mapping from archetype to presentation character identity.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `archetype` | string | Required supported archetype |
| `characterId` | string | Required assigned character asset identity |
| `required` | boolean | Must be `true` for targeted mappings in this feature |

**Required mappings**:
- `parasite -> Countess_Vampire`
- `enabler -> Converted_Vampire`
- `honest_one -> girl-1`
- `mirror -> girl-2`
- `opportunist -> girl-3`

---

## Entity: CharacterAnimationProfile

Required animation coverage metadata for each mapped character.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `characterId` | string | FK to mapping target |
| `requiredAnimations` | string[] | Must include all required movement/interaction states |
| `availableAnimations` | string[] | Source-discovered animation set |
| `coverageStatus` | `pass \| fail` | `pass` only when all required animations exist |

**Rules**:
- Feature acceptance requires `coverageStatus = pass` for all mapped characters.
- Missing optional animations may be tolerated if required set passes.

---

## Entity: DebugQuestTrigger

Phrase definition and handling behavior for immediate quest activation.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `triggerId` | string | Stable identifier |
| `phrase` | string | Exact phrase match only |
| `bypassDialogueGating` | boolean | Must be `true` |
| `activationRoute` | string | References standard quest activation workflow |

**Allowed phrases**:
- `I will do it`
- `i will do it`

---

## Entity: QuestActivationBundle

Ordered setup package required before a quest is considered active.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `bundleId` | string | Stable activation run identifier |
| `triggerSource` | `normal_dialogue \| debug_phrase` | Distinguishes activation origin |
| `orderedSteps` | string[] | Deterministic setup order; all steps required |
| `completedSteps` | string[] | Runtime completion tracking |
| `ready` | boolean | True only when all required steps complete |

**Rules**:
- Debug triggers must use the same ordered steps as normal activation.
- Quest start is valid only when `ready = true`.

---

## Entity: OverworldFollowState

Runtime/persisted follower tracking state for designated follower NPCs.

| Field | Type | Validation / Notes |
|------|------|---------------------|
| `npcId` | string | Follower-capable NPC identifier |
| `shouldFollow` | boolean | True when NPC is designated to follow |
| `followTarget` | string | Usually player entity id |
| `followMode` | `active \| recovering \| paused` | Transition-aware follow state |
| `lastSyncedAt` | ISO timestamp | Last successful follow state sync |
| `transitionResumePending` | boolean | True while waiting to rebind after scene change |

**Rules**:
- `shouldFollow=true` NPCs must return to `active` mode after transition recovery.
- Transition recovery must not require manual user reset.

## Key State Transitions

```text
StarterArchetypePool:
  initialized -> random selection (non-general) -> persisted starter

CharacterAnimationProfile:
  discovered -> validated -> pass/fail

QuestActivationBundle:
  created -> ordered setup steps complete -> ready

OverworldFollowState:
  active -> recovering (on transition) -> active (on successful rebind)
```

## Cross-Module Invariants

1. Initial progression starter selection must never resolve to `general`.
2. Required archetypes must always resolve to their fixed mapped character identities.
3. Debug phrase triggers cannot bypass activation setup order requirements.
4. Quest activation is invalid until all required setup bundle steps complete.
5. Follower-designated NPCs must recover follow state after scene/battle transitions.
