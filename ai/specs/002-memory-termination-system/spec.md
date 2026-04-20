# Feature Spec: NPC Memory and Conversation Termination System

**Feature Directory**: `specs/002-memory-termination-system`
**Created**: 2026-04-16
**Status**: Draft

---

## Overview

A persistent memory and conversation lifecycle system that tracks the state of each player–NPC relationship across interactions, detects when a conversation has reached its natural conclusion (quest acceptance or exit), and triggers downstream updates to both the local memory store and the broader game system.

---

## Problem Statement

Conversations between the player and companion NPCs currently have no structured memory. Each interaction is stateless — NPCs cannot behave differently based on the player's history, and quest outcomes are not recorded or communicated back to the game. Additionally, conversations have no defined endpoint: they continue indefinitely rather than terminating naturally once a quest is accepted, which breaks the expected gameplay loop.

---

## Goals

- Maintain persistent, layered memory for each player–NPC relationship
- Track multi-dimensional relational metrics (trust, dependency, wariness, etc.) that evolve after each conversation
- Detect when a player has accepted a quest and automatically terminate the conversation
- Run a post-conversation pipeline that updates memory and notifies the external game system
- Expose developer tools for inspecting memory state and simulating termination during testing

---

## Non-Goals

- The game's authoritative state (player level, completed quests, unlocked companions) is read-only from this system's perspective — it is owned and updated by the external game system, not here
- This system does not simulate full gameplay or quest resolution outcomes
- Real-time multiplayer or shared session memory is out of scope
- The NPC's dialogue is not authored manually — the memory system shapes and informs the LLM's behavior, but does not replace it

---

## User Scenarios & Testing

### Primary Actor: Game System (automated) and Developer (testing)

**Scenario 1 — Conversation reaches quest acceptance**
1. Player is in conversation with an NPC
2. NPC introduces a quest and attempts to persuade the player
3. Player responds affirmatively (explicitly or through intent-consistent phrasing)
4. System detects acceptance, freezes the conversation
5. NPC delivers a final confirmation response
6. Memory is updated and the game system is notified
7. The terminal conversation view closes and returns to gameplay

**Scenario 2 — Player exits without accepting**
1. Player is in conversation and types an exit command or leaves
2. System detects the exit as a termination event
3. Memory is updated to reflect the partial interaction (relationship metrics still evolve)
4. Game system is notified of the non-acceptance outcome
5. Conversation closes

**Scenario 3 — Relationship metrics update after interaction**
1. After any conversation ends (acceptance or exit), the system extracts behavioral signals from the exchange
2. Relational metrics (bond, trust, wariness, dependency, instrumental interest) are recalculated
3. NPC's internal view of the player and current persuasion strategy are rewritten
4. A compressed summary is generated for injection into the next conversation's context

**Scenario 4 — Developer inspects memory state**
1. During a test session, developer invokes `/state`
2. The system displays all active memory layers for the current player and NPC
3. Developer can inspect per-character metrics with `/char <name>` and force a termination event with `/simulate_accept`

**Scenario 5 — Memory informs next conversation**
1. Player re-enters a conversation with an NPC they've spoken to before
2. The system loads the stored relationship metrics and compressed summaries
3. The NPC's prompt context includes the player's behavioral history and the NPC's current strategy
4. The NPC responds in a way consistent with the established relationship arc

---

## Functional Requirements

### Memory Layers

1. The system must maintain three distinct memory layers: authoritative game state (read-only), inferred player profile (system-updated), and compressed prompt summaries (LLM-facing)
2. The authoritative state layer must be read-only — the system may never modify player level, quest completion records, or companion unlock flags
3. The inferred player profile must store numeric scores for emotional states (isolation, hope, burnout) and behavioral traits (trust speed, validation-seeking, skepticism, risk tolerance)
4. The prompt summary layer must be regenerated after each conversation and kept short enough to fit within a single context injection
5. All memory layers must be persisted to disk after each conversation ends

### Character Memory

6. Each NPC must maintain its own relational memory, independent of other NPCs
7. Character memory must include multi-dimensional relationship metrics: bond, trust, wariness, dependency (player → NPC) and instrumental interest (NPC → player)
8. Character memory must include the NPC's current behavioral strategy and its interpretation of the player's state
9. Character memory must retain a short list of key player events from past interactions (maximum 5 entries)
10. Character memory must include a conversation phase progression counter (quest difficulty level)

### Relationship Update Model

11. After each conversation ends, the system must extract behavioral signals from the exchange — including agreement frequency, skepticism, validation-seeking, self-disclosure, quest acceptance, and contradiction callouts
12. Each relational metric must be updated using a weighted formula that incorporates the previous value, extracted signals, and the NPC's archetype modifier
13. Each NPC archetype must apply a distinct weighting bias to metric updates (e.g., enabler NPCs amplify bond and trust gains; opportunist NPCs amplify dependency)
14. Derived metrics (manipulation pressure, favorability) must be recomputed after each update

### Conversation Lifecycle

15. Every conversation must progress through defined states: Active → Escalation → Decision → Termination
16. The system must detect when the NPC has introduced a quest (Escalation) and when the player is evaluating it (Decision)
17. Quest acceptance must be detected using a combination of rule-based keyword matching and model-assisted intent classification
18. Rule-based triggers must include explicit affirmations ("yes", "okay", "I'll do it") and execution-oriented follow-ups ("where do I go?", "what do I need?")
19. Model-assisted classification must assign an intent label (accept, reject, uncertain) with a confidence score; acceptance is confirmed only when confidence exceeds a defined threshold
20. If either a rule-based trigger or high-confidence model classification fires, the conversation must transition to Termination
21. Upon termination, the conversation must be frozen — no further player input is accepted
22. The NPC must deliver one final response before the conversation closes (a confirmation or acknowledgment framing)

### Post-Conversation Pipeline

23. After termination, the system must run the full update pipeline before closing: extract features → update character metrics → update global player profile → recompute derived values → regenerate summaries → persist to disk → notify external system
24. The system must send a structured notification to the external game system including the character name, quest identifier, and a snapshot of key relationship metrics at the time of acceptance
25. If the external notification fails, the system must log the failure and retain the payload locally for retry — it must not silently drop the data

### Developer Tooling

26. The terminal interface must support `/state` to display all active memory layers
27. The terminal interface must support `/char <name>` to inspect a specific character's memory
28. The terminal interface must support `/simulate_accept` to force a termination event without genuine quest acceptance
29. The terminal interface must support `/reload` to reload memory from disk without restarting
30. The terminal interface must support `/features` to display extracted behavioral signals from the current conversation
31. A debug display must show the current conversation state, active feature scores, relationship metric deltas, and the reason for termination (rule-triggered vs. model-triggered)

---

## Success Criteria

1. After any conversation ends, all memory layers are updated and written to disk before the interface closes
2. An NPC's behavior is observably influenced by prior interactions — relationship metrics shift measurably across at least 3 consecutive conversations
3. Quest acceptance is detected and conversation termination triggered within one player turn of a clear acceptance signal, with no false positives on ambiguous phrasing
4. The external game system receives a complete, accurate notification within 2 seconds of conversation termination under normal conditions
5. A developer can view all memory state for any character and the global player profile using only in-terminal commands — no file inspection required
6. Forced termination via `/simulate_accept` produces the same memory update and notification behavior as a genuine acceptance

---

## Key Entities

| Entity | Description |
|--------|-------------|
| Player Profile | Global inferred state: emotional scores and behavioral traits derived from all past interactions |
| Character Memory | Per-NPC relational state: relationship metrics, behavioral strategy, key event log, and quest progression level |
| Prompt Summary | Compressed, LLM-facing representation of player profile and character memory; regenerated after each conversation |
| Authoritative State | Read-only game truth: player level, active quest, completed quests, unlocked companions, and world flags |
| Conversation State | The current lifecycle phase of an active interaction (Active / Escalation / Decision / Termination) |
| Behavioral Features | Signals extracted from a completed conversation used to compute metric updates |
| Archetype | An NPC's behavioral classification that determines how it weights and responds to relationship metric changes |

---

## Dependencies

- The existing terminal conversation interface (`001-local-llm-chat-api`) — memory and lifecycle events are integrated into that session model
- The locally running LLM service — used for model-assisted intent classification at conversation end
- The external game system — must expose an endpoint to receive quest acceptance notifications; this system is a client of that API

---

## Assumptions

- The external game system API is already defined and accessible during the conversation session; this feature implements the client side only
- Authoritative state is provided to this system at session start and is not expected to change mid-conversation
- A single active NPC per conversation session is sufficient; simultaneous multi-NPC conversations are not required
- Behavioral feature extraction is performed over the full conversation transcript at session end, not in real time turn-by-turn
- The model-assisted intent classifier uses the same local LLM service as the conversation engine; no additional external service is required
- Memory files for each character are stored as structured documents on the local filesystem in a dedicated directory
- The confidence threshold for model-assisted acceptance can be tuned by the developer without a code change
