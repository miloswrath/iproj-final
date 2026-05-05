# Phase 0 Research: NPC Asset & Behavior Fixes

**Feature**: 008-fix-npc-asset-behavior  
**Date**: 2026-05-05

## R1. Starter archetype selection guard

**Decision**: Resolve starter archetype from an explicit eligible-starter pool that excludes `general`, then persist the chosen starter for run stability.

**Rationale**: Guarantees the blocked archetype never appears at run start while preserving randomness and replay variety.

**Alternatives considered**:
- Hard-code one fixed starter (too deterministic, reduces coverage of archetype combinations).
- Randomize from full roster then retry on `general` (less clear and easier to regress).

---

## R2. Canonical archetype-to-character mapping source

**Decision**: Store required mappings in one authoritative NPC config map used by scene spawn/render paths.

**Rationale**: A single mapping source prevents drift between conversation, spawn, and animation systems.

**Alternatives considered**:
- Duplicate mapping in multiple systems (high mismatch risk).
- Infer mapping from filename conventions only (fragile and implicit).

---

## R3. Animation coverage validation strategy

**Decision**: Define a required animation checklist per mapped character and validate on scene load or build-time manifest pass.

**Rationale**: Ensures each mapped character can perform required movement/interaction states without runtime surprises.

**Alternatives considered**:
- Allow silent missing animations (causes broken behavior or visual freezes).
- Validate only in manual QA (slower and inconsistent).

---

## R4. Debug phrase matching behavior

**Decision**: Match only two exact strings (`"I will do it"`, `"i will do it"`) as immediate quest activation triggers.

**Rationale**: Meets spec exactly, avoids accidental activations from similar text, and keeps QA behavior deterministic.

**Alternatives considered**:
- Case-insensitive normalization of all variants (broader but deviates from exact phrase requirement).
- Prefix/substring matching (too permissive and error-prone).

---

## R5. Quest activation ordering for debug start

**Decision**: Route debug-triggered activation through the same ordered activation pipeline as normal starts, with dialogue gating bypassed but asset/setup sequencing unchanged.

**Rationale**: Preserves correctness and avoids creating a second activation path with inconsistent state.

**Alternatives considered**:
- Separate debug-only activation shortcut pipeline (high risk of divergence bugs).
- Skip some setup in debug mode (can produce non-playable quest states).

---

## R6. Overworld follower recovery after transitions

**Decision**: Persist follower intent/state across scene transitions and rebind follower targets immediately on overworld re-entry.

**Rationale**: Fixes "does not follow" regressions caused by transition handoff loss rather than movement tuning.

**Alternatives considered**:
- Increase follower speed/pathfinding aggressiveness (masks but does not fix state-loss root cause).
- Manual player reset command (poor UX and not acceptable for core behavior).

---

## Final Outcome

All planning unknowns are resolved. No `NEEDS CLARIFICATION` items remain.
