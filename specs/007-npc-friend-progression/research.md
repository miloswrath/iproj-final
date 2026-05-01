# Phase 0 Research: NPC Friendship Progression

**Feature**: 007-npc-friend-progression  
**Date**: 2026-05-01

This document resolves implementation uncertainties from the plan and records final decisions.

---

## R1. Source of truth for per-NPC friendship progression

**Decision**: Persist per-NPC friendship progression in `ai/memory/` alongside existing `CharacterMemory`, with game runtime caching the currently active NPC, unlocked NPCs, and world placement snapshot in `game/src/game/playtestProgression.js`.

**Rationale**: The AI bridge already owns durable character state and summary generation, while the game needs fast local access to placement and active-character decisions across scene changes.

**Alternatives considered**:
- Game-only progression storage (breaks alignment with existing AI memory and summaries).
- AI-only state with no local cache (more fragile around scene transitions and post-battle placement timing).

---

## R2. Third-quest friendship transition trigger

**Decision**: Treat the friendship transition as a post-quest conversation event: once the third quest is marked complete, the next conversation open with that NPC performs the one-time friendship promotion, acknowledgement line, and reward grant.

**Rationale**: This matches the spec wording, keeps battle completion deterministic, and gives the unlock a visible social payoff in the conversation layer.

**Alternatives considered**:
- Promote immediately at battle completion (less explicit, weakens the return-to-NPC payoff).
- Promote during quest hand-in only if a special dialog branch is manually chosen (unnecessarily brittle).

---

## R3. Friendship reward pool structure

**Decision**: Model each NPC reward pool as a configurable list containing guaranteed entries and chance-based entries with normalized probability values in the `0.0..1.0` range, then resolve rewards once at friendship unlock.

**Rationale**: This supports the requested guaranteed vs chance distinction while keeping validation simple and implementation-agnostic across AI and game modules.

**Alternatives considered**:
- Percentage integers `0..100` only (works, but introduces extra conversion/validation noise).
- One fixed reward bundle per NPC (fails the chance-based requirement).

---

## R4. Friend summary generation timing and failure handling

**Decision**: Generate or refresh the friend summary when the player exits the post-third-quest conversation; if summary generation fails, persist the friendship unlock first and retry summary generation on the next safe bridge interaction.

**Rationale**: The summary is useful but cannot be allowed to block progression or friend unlock visibility.

**Alternatives considered**:
- Generate summaries at battle completion (wrong trigger point and weaker conversation context).
- Block unlock completion on summary success (violates gameplay-first and resilience goals).

---

## R5. New-character unlock selection

**Decision**: For this feature pass, unlock exactly one second NPC chosen from a curated roster with a different archetype and quest set, then mark the progression loop as repeatable by data design rather than by spawning multiple new characters immediately.

**Rationale**: This meets the feature scope without inflating implementation size and keeps future NPC additions data-driven.

**Alternatives considered**:
- Randomly choose from every possible archetype at runtime with no curated roster (more variance, less authorial control for the first rollout).
- Unlock multiple NPCs at once (more clutter and higher placement complexity).

---

## R6. Non-overlapping spawn allocation

**Decision**: Define a fixed pool of valid overworld/town NPC anchor points in `overworldLayout.js` and allocate them deterministically by role priority: active NPC first, then completed/friendly NPC town anchors, then newly unlocked NPC anchor.

**Rationale**: Deterministic placement prevents overlap bugs, simplifies reload persistence, and avoids NPCs shifting unpredictably between sessions.

**Alternatives considered**:
- Random open-tile search at runtime (harder to reason about and test).
- Reusing current quest spawn point logic (causes the exact post-battle placement bug this feature must fix).

---

## R7. Post-battle NPC placement correction

**Decision**: Carry explicit return-context data from battle completion back into `OverworldScene` so the NPC is rendered directly at its resolved persistent placement instead of spawning at the quest anchor and moving to catch up.

**Rationale**: The current bug is a state handoff problem, not a movement tuning problem. Fixing the authoritative return position removes the visual snap/run artifact entirely.

**Alternatives considered**:
- Lower NPC movement speed after battle (masks but does not solve the wrong spawn source).
- Teleport the NPC after a delay (still visibly wrong and less deterministic).

---

## R8. Friend menu interface strategy

**Decision**: Reuse the existing codex-overlay pattern and add a dedicated friend-roster overlay backed by a new bridge read endpoint returning active friends plus short summaries.

**Rationale**: The codex already establishes a lightweight non-blocking UI pattern; a separate friend endpoint avoids overloading quest-history routes with unrelated semantics.

**Alternatives considered**:
- Extend the lore codex endpoint to include friend roster data inline (works, but mixes two different views and update lifecycles).
- Build the menu entirely from local game state (would drift from AI-owned summaries).

---

## R9. Initial character selection behavior

**Decision**: Replace the blank/default “general” startup with a valid randomly selected starting NPC from the supported roster, then persist that choice so reloads do not reshuffle the active character until progression explicitly advances.

**Rationale**: This satisfies the feature requirement while preserving deterministic reload behavior for testing and user continuity.

**Alternatives considered**:
- Keep `general` as a fixed starter (fails the feature requirement).
- Re-randomize on every load (violates persistence and makes debugging harder).

---

## R10. Duplicate quest-text presentation fix

**Decision**: Consolidate quest-offer and quest-status display ownership into a single UI path in the conversation/overworld flow so quest text is rendered once with one style source of truth.

**Rationale**: The bug description indicates duplicate rendering from multiple display surfaces. Centralizing ownership is safer than visual patching.

**Alternatives considered**:
- Hide one of the duplicate layers with CSS or depth tweaks (fragile and easy to regress).
- Leave both paths and try to synchronize styles (does not fix duplicate content).

---

## Final Outcome

All planning unknowns are resolved. No `NEEDS CLARIFICATION` items remain.
