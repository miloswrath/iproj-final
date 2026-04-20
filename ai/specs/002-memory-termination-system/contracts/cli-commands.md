# CLI Command Contracts: Memory and Termination System

**Feature**: 002-memory-termination-system
**Date**: 2026-04-16

These contracts extend the existing command set from `001-local-llm-chat-api`. All new commands follow the same `/command [args]` pattern used by the existing TUI.

---

## New Commands

### `/state`

Display all active memory layers for the current session.

**Usage**: `/state`

**Output format**:
```
=== Memory State ===
[Global Player Profile]
  isolation:     72
  hope:          41
  burnout:       55
  trustsQuickly: 0.68
  ...

[Active Character: kind_guide]
  bond:          61  trust: 74  wariness: 18  dependency: 57
  instrumentalInterest: 66
  questLevel:    1
  phase:         ESCALATION

[Prompt Summaries]
  playerGlobal:  "Often seeks reassurance and accepts risk when framed positively."
  recentArc:     "Recently completed a risky quest with low reward but continues engaging."
  npcView:       "They want reassurance and still mostly accept my framing."
  currentTactic: "Encourage and soften perceived risk."
  tension:       "They may be starting to question reward fairness."
```

**Error cases**: None (safe read-only display).

---

### `/char <name>`

Inspect the full stored memory for a specific character.

**Usage**: `/char <character-name>`

**Arguments**:
- `name` — character name (case-insensitive, matches character file names)

**Output format**:
```
=== Character Memory: kind_guide ===
Archetype: enabler
Quest Level: 1

Relationship
  bond: 61  trust: 74  wariness: 18
  dependency: 57  instrumentalInterest: 66
  manipulationPressure: 40  (derived)
  favorability: 58  (derived)

Flags
  playerNoticedRewardMismatch: true
  recentFailure: false  recentSuccess: true

Key Memories
  1. Accepted dangerous quest after reassurance.
  2. Returned disappointed but stayed engaged.

Prompt Summary
  npcView:       "They want reassurance and still mostly accept my framing."
  currentTactic: "Encourage and soften perceived risk."
  tension:       "They may be starting to question reward fairness."
```

**Error cases**:
- Unknown character name → `Unknown character: "<name>". Use /list to see available characters.`
- No memory file exists for character → `No memory recorded for "<name>" yet.`

---

### `/simulate_accept`

Force the conversation into TERMINATION state as if the player accepted a quest. Triggers the full post-conversation pipeline.

**Usage**: `/simulate_accept`

**Behavior**:
1. Sets `conversationState.terminationReason = "simulate"`
2. Sets `conversationState.frozen = true`
3. Generates and displays the NPC's final confirmation response
4. Runs post-conversation pipeline (feature extraction → metric update → summary generation → persist → notify)
5. Exits the conversation view

**Output**: Same as genuine acceptance termination, with a `[SIMULATED]` prefix on the status line.

**Error cases**: None — always succeeds regardless of current phase.

---

### `/reload`

Reload all memory files from disk without restarting the session.

**Usage**: `/reload`

**Behavior**:
- Re-reads `player-profile.json`, `player-summary.json`, and the active character's memory file
- Does not reset conversation history or state machine phase
- Prints confirmation with timestamps of loaded files

**Output**:
```
Memory reloaded.
  player-profile.json  — 2026-04-16T14:32:01Z
  player-summary.json  — 2026-04-16T14:32:01Z
  characters/kind_guide.json — 2026-04-16T14:30:44Z
```

**Error cases**:
- File missing → `Warning: memory/player-profile.json not found. Using defaults.`

---

### `/features`

Display the behavioral signals extracted from the current conversation so far.

**Usage**: `/features`

**Output format**:
```
=== Conversation Features (current session) ===
  agreementRatio:     0.62  (8 / 13 turns)
  questionCount:      4
  hedgingFrequency:   3
  validationSeeking:  2
  selfDisclosureDepth: 1
  contradictionCount: 0
  engagementLength:   18.4 words/turn (avg)

Conversation Phase: DECISION
Termination Trigger: none yet
```

**Notes**: Features shown here are the in-progress values; final values used for metric update are computed at session end over the complete transcript.

**Error cases**: None.

---

## Debug Panel

When any debug command is run (`/state`, `/features`, `/char`), the bottom status line shows:

```
[phase: ESCALATION] [trigger: —] [char: kind_guide] [bond: 61→? trust: 74→?]
```

After termination and pipeline run:

```
[phase: TERMINATION] [trigger: rule] [bond: 61→67 trust: 74→79 wariness: 18→14]
```

---

## External API Notification Contract

### POST `/quest/start`

Sent by this system to the external game API upon quest acceptance.

**Request body**:
```json
{
  "character": "kind_guide",
  "questId": "simple_favor",
  "playerState": {
    "level": 3
  },
  "relationshipSnapshot": {
    "trust": 74,
    "dependency": 57,
    "bond": 61,
    "wariness": 18
  },
  "terminationReason": "rule" | "model" | "simulate"
}
```

**Expected responses**:
- `200 OK` — quest accepted by game system; conversation exits
- `4xx` — malformed request; log error, do not exit conversation
- `5xx` / network error — log failure, persist payload to `memory/pending-notifications.json` for retry

**Retry behavior**: On next session start, check for pending notifications and resend before loading memory.
