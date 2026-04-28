# Phase 0 Research: Quest Dungeon Workflow

**Feature**: 005-quest-dungeon-workflow  
**Date**: 2026-04-28

This document resolves implementation uncertainties from the plan and records final decisions.

---

## R1. Quest title uniqueness strategy

**Decision**: Keep AI-generated quest slug/title as first candidate, then enforce uniqueness with deterministic suffixing (`-ii`, `-iii`, numeric fallback) against active+completed quest records before persistence.

**Rationale**: Preserves conversational flavor while guaranteeing FR-002 uniqueness and handling collision edge cases without re-querying LM Studio.

**Alternatives considered**:
- Re-prompt AI until unique (higher latency, unstable).
- UUID-only titles (unique but poor UX).

---

## R2. Source of truth for active quest run progression

**Decision**: Add a `QuestRunState` snapshot in game runtime progression storage (`game/src/game/playtestProgression.js`) and mirror completion-critical state in bridge payloads at floor completion boundaries.

**Rationale**: Gameplay must remain resumable even if memory sync temporarily fails; local authoritative gameplay state ensures no progression loss.

**Alternatives considered**:
- AI memory as sole source of truth (too coupled to model/memory availability).
- Scene-only ephemeral state (fails mid-run resume requirement).

---

## R3. Three-floor sequencing from curated pool

**Decision**: Build floor sequence once at quest acceptance using curated pool IDs, enforcing exactly 3 floor entries and no immediate duplicate floor ID unless pool size < 3.

**Rationale**: Meets FR-005 deterministic structure and keeps run identity stable across leave/return.

**Alternatives considered**:
- Re-roll floor on each portal transition (breaks resumability/repro).
- Fully random generator-only floors (less consistent with existing curated validation tooling).

---

## R4. Floor completion gate calculation

**Decision**: A floor is complete iff `(remainingEnemies === 0 && remainingClosedChests === 0)`; on transition to complete, spawn exactly one progression portal actor for next step.

**Rationale**: Directly encodes FR-006/FR-007 and avoids ambiguous completion criteria.

**Alternatives considered**:
- Enemy-only completion (violates requirement).
- Chest-only optional completion (violates requirement).

---

## R5. Recovery path for blocked objectives

**Decision**: Add a player-triggered floor objective recheck/reset action that revalidates enemy/chest registries and respawns missing interactables for the current floor only.

**Rationale**: Satisfies edge-case requirement that unreachable enemy/chest cannot permanently block quest completion.

**Alternatives considered**:
- Auto-complete on timeout (abusable, opaque).
- Full run reset only (too punitive).

---

## R6. Quest completion and memory sync reliability

**Decision**: Mark gameplay quest completion immediately in game state at floor-3 exit, then call `/api/v1/quest/complete`; on sync failure, queue retry with existing notify retry mechanics and explicit `memorySyncPending` marker in quest record.

**Rationale**: Keeps gameplay progression authoritative while preserving eventual consistency to AI memory (spec edge case).

**Alternatives considered**:
- Block completion on memory write success (bad UX, violates assumption).
- Fire-and-forget without retry marker (possible silent data drift).

---

## R7. Lore codex data contract

**Decision**: Introduce codex read endpoints returning normalized active + completed quest lore entries sorted reverse-chronologically by accepted/completed timestamps.

**Rationale**: FR-011 requires current and historical entries in a codex UI; explicit server contract avoids client parsing of raw memory files.

**Alternatives considered**:
- Client reads local JSON files directly (breaks module boundary).
- Lore maintained game-side only (loses continuity with AI memory context).

---

## R8. Conversation continuity and repeat-session bug fix

**Decision**: Preserve per-character short-term topic context in AI memory summary fields and ensure bridge conversation session teardown always clears terminated sessions while permitting immediate fresh `/start` calls.

**Rationale**: Fixes restart-required bug and supports FR-010/FR-014 repeated conversations.

**Alternatives considered**:
- Long-lived single session for all conversations (state leakage, brittle).
- Stateless per-turn prompts only (loses topic continuity).

---

## R9. Companion follow behavior post quest generation

**Decision**: Add lightweight follower state machine in `OverworldScene` that activates after quest generation event and uses higher speed + tighter follow radius than enemy chase profile.

**Rationale**: FR-013 requires companion stay close during normal traversal.

**Alternatives considered**:
- Reuse enemy chase values unchanged (observed lag distance too large).
- Teleport-to-player follower (jarring movement).

---

## R10. Completion feedback timing

**Decision**: Trigger completion toast from the same state transition that marks quest complete (floor 3 success) and maintain existing toast stack constraints.

**Rationale**: Ensures SC-003 ≤2s visibility target with minimal additional event latency.

**Alternatives considered**:
- Toast only after memory sync response (risk delayed feedback).
- Polling completion status before toast (unnecessary delay).

---

## Final Outcome

All planning unknowns are resolved. No `NEEDS CLARIFICATION` items remain.
