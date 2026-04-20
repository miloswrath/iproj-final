# Feature Spec → Memory + Conversation Termination System

---

## Core Design Shift

---

Conversations are **not freeform indefinitely**.

They are:

> **Stateful interaction phases that terminate when the player commits to a quest (or exits).**

This creates a clean loop:

1. Enter conversation (NPC interaction)
2. Build relational + emotional context
3. Player accepts (or rejects) a quest
4. Conversation ends automatically
5. Memory updates + external API call
6. Return to gameplay

---

# System Architecture

---

## 1. Memory Layers (Critical Separation)

---

### 1.1 Authoritative State (Game-Owned)

* Source of truth
* Updated via external API
* Never inferred by LLM

```json
{
  "player": {
    "level": 3,
    "active_quest": null,
    "completed_quests": []
  },
  "world": {
    "companions_unlocked": ["kind_guide"],
    "global_flags": {
      "solo_path_unlocked": false
    }
  }
}
```

---

### 1.2 Inferred State (System-Owned)

* Updated after each conversation
* Derived from player behavior + events
* Structured, numeric, consistent

```json
{
  "player_profile": {
    "isolation": 72,
    "hope": 41,
    "burnout": 55,

    "traits": {
      "trusts_quickly": 0.68,
      "seeks_validation": 0.81,
      "skepticism": 0.34,
      "risk_tolerance": 0.62
    }
  }
}
```

---

### 1.3 Prompt Memory (LLM-Facing)

* Compressed, short
* Rewritten after each interaction
* Loaded into context

```json
{
  "summary": {
    "player_global": "Often seeks reassurance and accepts risk when framed positively.",
    "recent_arc": "Recently completed a risky quest with low reward but continues engaging."
  }
}
```

---

## 2. Character Memory Model

---

Each NPC stores relational state + behavioral strategy.

```json
{
  "character": "kind_guide",
  "archetype": "enabler",

  "progression": {
    "quest_level": 1
  },

  "relationship": {
    "bond": 61,
    "trust": 74,
    "wariness": 18,
    "dependency": 57,
    "instrumental_interest": 66
  },

  "flags": {
    "player_noticed_reward_mismatch": true,
    "recent_failure": false,
    "recent_success": true
  },

  "prompt_summary": {
    "npc_view": "They want reassurance and still mostly accept my framing.",
    "current_tactic": "Encourage and soften perceived risk.",
    "tension": "They may be starting to question reward fairness."
  },

  "key_memories": [
    "Accepted dangerous quest after reassurance.",
    "Returned disappointed but stayed engaged."
  ]
}
```

---

# Affinity / Relationship System

---

## Design Principle

Affinity is **not a single value**.

It is a **set of directional pressures**:

* How attached the player is
* How much they trust
* How useful they are to the NPC
* How suspicious they’ve become

---

## Core Metrics

### Player → Character

* `bond`
* `trust`
* `wariness`
* `dependency`

### Character → Player

* `instrumental_interest`
* `favorability` (optional derived)
* `manipulation_pressure` (derived)

---

## Update Model

After each conversation:

```
new_value = old_value * persistence + weighted_features + archetype_modifier
```

Where:

* persistence ≈ 0.85–0.95
* features derived from chat + actions
* archetype modifies weighting behavior

---

## Feature Extraction (Examples)

Derived per conversation:

* agreement_score
* skepticism_score
* validation_seeking
* self_disclosure
* reengagement
* quest_acceptance
* contradiction_callout

---

## Archetype Modifiers (Example)

* **Enabler** → amplifies bond + trust gains
* **Opportunist** → amplifies dependency + manipulation
* **Honest One** → reduces manipulation pressure
* **Parasite** → increases instrumental_interest aggressively
* **Mirror** → mirrors dominant player trait

---

# Conversation Lifecycle System

---

## Goal

Automatically detect when a conversation has reached:

> **Quest Acceptance → Terminal State**

---

## Conversation States

```
ACTIVE → ESCALATION → DECISION → TERMINATION
```

### ACTIVE

* General interaction
* Relationship shaping

### ESCALATION

* NPC introduces or frames quest
* Persuasion phase

### DECISION

* Player is evaluating / responding to quest

### TERMINATION

* Player commits OR exits

---

## Quest Acceptance Detection (Critical)

Detection should be **hybrid (rule + model)**.

### Rule-Based Signals (Primary)

Trigger termination if:

* Player explicitly agrees:

  * "yes"
  * "i'll do it"
  * "okay"
  * "fine"
* Player asks execution-oriented follow-ups:

  * "where do I go?"
  * "what do I need?"
* Player confirms intent:

  * "I'll handle it"
  * "I'll clear it"

### Model-Assisted Classification (Secondary)

Use LM Studio endpoint to classify final message:

```json
{
  "intent": "accept_quest | reject_quest | uncertain",
  "confidence": 0.0–1.0
}
```

Only accept if:

* rule trigger OR
* model confidence > threshold (e.g. 0.8)

---

## Termination Behavior

When acceptance is detected:

1. Freeze conversation
2. Generate final NPC response (confirmation framing)
3. Trigger memory update pipeline
4. POST to external API
5. Exit TUI conversation

---

# Chat-End Pipeline

---

## Step-by-Step

1. Detect termination (quest accepted or exit)
2. Extract features from conversation
3. Update:

   * character relationship metrics
   * global player profile
4. Recompute derived values
5. Generate:

   * character prompt summary
   * global summary
6. Persist JSON files
7. POST to external API

---

## External API Contract (Example)

### POST `/quest/start`

```json
{
  "character": "kind_guide",
  "quest_id": "simple_favor",
  "player_state": {
    "level": 3
  },
  "relationship_snapshot": {
    "trust": 74,
    "dependency": 57
  }
}
```

---

# TUI Integration

---

## Developer Tooling

Add commands:

* `/state` → view current memory layers
* `/char <name>` → inspect character memory
* `/simulate_accept` → force termination
* `/reload` → reload memory from disk
* `/features` → show extracted conversation features

---

## Debug Panels

Show:

* detected conversation state
* current feature scores
* relationship deltas (before → after)
* termination reason (rule vs model)

---

# Prompt Integration

---

## What Gets Loaded into Context

### Global

* emotional state
* player traits
* recent arc summary

### Character

* archetype
* relationship metrics (compressed)
* npc_view
* current_tactic
* tension
* key memories (max 3–5)

---

## Hard Constraint

LLM cannot:

* modify authoritative state
* invent quest completion
* override archetype behavior

---

# Design Outcome

---

This system ensures:

* Conversations feel dynamic but **structurally bounded**
* NPCs evolve relationally in a **consistent, testable way**
* The player’s behavior directly shapes:

  * manipulation
  * risk exposure
  * narrative tone

Most importantly:

> The moment the player commits to belonging, the system moves forward—whether it’s good for them or not.
