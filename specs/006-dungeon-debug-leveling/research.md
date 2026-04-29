# Phase 0 Research: Dungeon Debug Tools and Global Leveling

**Feature**: 006-dungeon-debug-leveling  
**Date**: 2026-04-29

This document resolves planning decisions needed before implementation.

---

## R1. Debug action trigger surface

**Decision**: Add three temporary keyboard-triggered debug actions scoped to `DungeonScene` only, with labels/messages in existing dungeon HUD context.

**Rationale**: Keeps controls local, fast to exercise during playtesting, and straightforward to remove later (single-scene wiring).

**Alternatives considered**:
- Dedicated debug menu overlay (heavier UI work, harder to remove quickly).
- AI/HTTP-triggered debug command endpoint (unnecessary cross-module coupling).

---

## R2. Invalid-state behavior for debug actions

**Decision**: If no valid active dungeon floor context exists, debug actions perform safe no-op behavior and produce non-fatal feedback.

**Rationale**: Satisfies edge-case requirements while preventing corruption of run state.

**Alternatives considered**:
- Throw runtime errors/assertions (breaks playtest flow).
- Attempt implicit scene/state creation (introduces hidden side effects).

---

## R3. Preventing duplicate rewards when opening all chests

**Decision**: Reuse existing chest-open semantics (`chest.opened` guard + reward claim path) and iterate only unopened chests for floor-wide open action.

**Rationale**: Uses established reward logic and guarantees idempotence for repeated triggers.

**Alternatives considered**:
- Separate debug-only reward path (risk divergence from real reward behavior).
- Force reward grants independent of chest state (violates FR-003).

---

## R4. Skip-floor transition correctness

**Decision**: Route skip-floor behavior through the same floor-complete and progression transition path used after normal objective completion.

**Rationale**: Ensures deterministic run-state updates and avoids bypass bugs.

**Alternatives considered**:
- Directly increment floor index only (misses completion side-effects).
- Hard restart at next floor with regenerated state (breaks run continuity).

---

## R5. Global level storage contract and legacy migration

**Decision**: Add `globalCharacterLevel` to `ai/memory/player-profile.json`, defaulting to `1` when missing/invalid during profile load.

**Rationale**: Backward-compatible, deterministic default aligns with feature assumptions, and keeps progression in existing persistent profile.

**Alternatives considered**:
- New standalone level file (unnecessary fragmentation).
- Defaulting to `0` (less user-friendly and inconsistent with current progression conventions).

---

## R6. Quest completion trigger for level increment

**Decision**: Increment global character level by +1 only when quest outcome is `success` in quest completion processing.

**Rationale**: Interprets “completes a quest” as successful completion and avoids rewarding failed/abandoned outcomes.

**Alternatives considered**:
- Increment on all terminal outcomes (`success|failure|abandoned`) (progression signal becomes noisy).
- Increment from game client before server acknowledgement (weaker persistence guarantees).

---

## R7. Idempotency and duplicate completion events

**Decision**: Keep level increment behind existing completion dedupe handling (processed completion key) so replayed duplicate completion payloads do not apply extra levels.

**Rationale**: Prevents accidental over-leveling from retries/network duplication.

**Alternatives considered**:
- Blind increment on every completion POST (breaks deterministic progression).
- Separate level-specific dedupe table (redundant with existing completion idempotency).

---

## Final Outcome

All planning questions are resolved. No `NEEDS CLARIFICATION` items remain.
