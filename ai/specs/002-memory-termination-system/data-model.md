# Data Model: NPC Memory and Conversation Termination System

**Feature**: 002-memory-termination-system
**Date**: 2026-04-16

---

## Entities

### PlayerProfile

Global inferred emotional and behavioral state. Updated after every conversation.

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `isolation` | number | 0–100 | Degree of social withdrawal |
| `hope` | number | 0–100 | Optimism / forward-looking orientation |
| `burnout` | number | 0–100 | Fatigue with ongoing demands |
| `traits.trustsQuickly` | number | 0.0–1.0 | Speed at which player extends trust |
| `traits.seeksValidation` | number | 0.0–1.0 | Tendency to seek reassurance |
| `traits.skepticism` | number | 0.0–1.0 | Tendency to question or push back |
| `traits.riskTolerance` | number | 0.0–1.0 | Willingness to accept uncertain outcomes |

**File**: `memory/player-profile.json`

---

### PlayerSummary

Compressed LLM-facing representation of the player's global state. Regenerated after each conversation.

| Field | Type | Description |
|-------|------|-------------|
| `playerGlobal` | string | One-sentence dominant trait summary |
| `recentArc` | string | One-sentence summary of the last interaction's significance |

**File**: `memory/player-summary.json`

---

### CharacterMemory

Per-NPC relational state. One file per character. Updated after every conversation with that character.

**Relationship metrics** (player → NPC):

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `relationship.bond` | number | 0–100 | Emotional attachment |
| `relationship.trust` | number | 0–100 | Confidence in the NPC's reliability |
| `relationship.wariness` | number | 0–100 | Suspicion or caution toward the NPC |
| `relationship.dependency` | number | 0–100 | Reliance on the NPC's framing or approval |

**NPC → player metrics**:

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `relationship.instrumentalInterest` | number | 0–100 | NPC's perceived utility of the player |

**Derived metrics** (computed, not stored raw):

| Field | Derivation |
|-------|-----------|
| `manipulationPressure` | `dependency * instrumentalInterest / 100` |
| `favorability` | `(bond + trust - wariness) / 2` |

**NPC behavioral state**:

| Field | Type | Description |
|-------|------|-------------|
| `archetype` | string | NPC class: "enabler" \| "opportunist" \| "honest_one" \| "parasite" \| "mirror" |
| `progression.questLevel` | number | Integer; increases as higher-risk quests are offered |
| `flags.playerNoticedRewardMismatch` | boolean | Player flagged fairness concern |
| `flags.recentFailure` | boolean | Last quest failed |
| `flags.recentSuccess` | boolean | Last quest succeeded |
| `promptSummary.npcView` | string | NPC's current read of the player |
| `promptSummary.currentTactic` | string | NPC's intended persuasion approach |
| `promptSummary.tension` | string | Active unresolved dynamic |
| `keyMemories` | string[] | Up to 5 notable player actions or moments |

**File**: `memory/characters/<character-name>.json`

---

### AuthoritativeState

Read-only snapshot of game-owned state. Loaded at session start, never written by this system.

| Field | Type | Description |
|-------|------|-------------|
| `player.level` | number | Player's current game level |
| `player.activeQuest` | string \| null | Currently active quest ID |
| `player.completedQuests` | string[] | List of completed quest IDs |
| `world.companionsUnlocked` | string[] | Characters the player has access to |
| `world.globalFlags` | Record<string, boolean> | Arbitrary world state flags |

**Source**: Provided by the external game system at session start (read from a file or injected via CLI arg).

---

### ConversationState

In-memory only (not persisted). Tracks the current lifecycle phase.

| Field | Type | Description |
|-------|------|-------------|
| `phase` | enum | "ACTIVE" \| "ESCALATION" \| "DECISION" \| "TERMINATION" |
| `questOffered` | string \| null | Quest ID introduced by NPC, if any |
| `terminationReason` | string \| null | "rule" \| "model" \| "exit" |
| `frozen` | boolean | Whether player input is accepted |

---

### ConversationFeatures

Extracted from transcript at session end. Used as input to metric update formula.

| Field | Type | Description |
|-------|------|-------------|
| `agreementRatio` | number | Affirmative responses / total player turns |
| `questionCount` | number | Player messages containing "?" |
| `hedgingFrequency` | number | Count of hedging phrases |
| `validationSeeking` | number | Count of validation-seeking phrases |
| `selfDisclosureDepth` | number | Keyword-matched self-disclosure mentions |
| `contradictionCount` | number | Player correction patterns detected |
| `engagementLength` | number | Mean word count per player message |

---

## State Transitions

```
ConversationState.phase transitions:

  ACTIVE
    → ESCALATION  when NPC introduces a quest (detected by NPC response classifier)
    → TERMINATION when player types exit command

  ESCALATION
    → DECISION    when player responds to quest offer
    → TERMINATION when player rejects or exits

  DECISION
    → TERMINATION when acceptance detected (rule OR high-confidence model)
    → ESCALATION  when player asks for more information (NPC re-frames)

  TERMINATION
    (terminal — no further transitions)
    triggers: post-conversation pipeline
```

---

## Relationships Between Entities

```
Session (runtime)
  ├── ConversationState       (in-memory, 1 per session)
  ├── AuthoritativeState      (read-only, loaded at start)
  └── CharacterMemory         (loaded at start, written at end)

Post-conversation pipeline
  ├── ConversationFeatures    (extracted from history)
  ├── CharacterMemory         (updated and persisted)
  ├── PlayerProfile           (updated and persisted)
  └── PlayerSummary           (regenerated and persisted)
```

---

## Validation Rules

- All numeric 0–100 fields must be clamped to [0, 100] after every update
- All 0.0–1.0 trait fields must be clamped to [0.0, 1.0]
- `keyMemories` must never exceed 5 entries (oldest dropped when full)
- `questLevel` is monotonically non-decreasing within a character
- `terminationReason` must be set before `frozen` becomes true
- Derived metrics (`manipulationPressure`, `favorability`) are never stored — always computed on read
