# Phase 0 Research: Quest Completion and Offer Pacing

## Decision 1: Add a first-class quest completion notification payload

**Decision**: Introduce a distinct quest completion payload with fields for `character`, `questId`, `outcome`, `playerState`, `relationshipSnapshot`, and `rewardReceived`.

**Rationale**: Completion outcome is authoritative game-state input and should not be inferred from conversation text. Explicit outcome and reward fields are required to update memory flags and progression correctly.

**Alternatives considered**:
- Reuse quest-start payload shape and infer completion intent from context (rejected: ambiguous and lossy).
- Encode outcome in free-text metadata (rejected: not safely testable or contract-stable).

## Decision 2: Add queue item type discriminator for reliable replay routing

**Decision**: Persist queued notifications with a required `type` discriminator (`quest_start` or `quest_complete`) and route retries by type.

**Rationale**: A single pending queue file currently risks replaying mixed payloads to the wrong endpoint. Typed routing prevents silent state corruption and keeps retry behavior extensible.

**Alternatives considered**:
- Separate queue files per endpoint (rejected: duplicate retry logic and higher operational complexity).
- Infer type from payload shape only (rejected: brittle and risky when payloads evolve).

## Decision 3: Enforce quest offer timing window using assistant turn count

**Decision**: Track assistant response index per session and apply offer eligibility gate: no offer detection before turn 3; first offer allowed only on turns 3-5.

**Rationale**: The spec requires removing abrupt first/second-response quest offers while preserving a natural early-game pacing window.

**Alternatives considered**:
- Randomized timer-based delay (rejected: not aligned with conversation turn semantics).
- Soft prompting without hard gate (rejected: does not guarantee elimination of early offers).
- Fixed offer at exactly turn 3 (rejected: too predictable and less natural than 3-5 range).

## Decision 4: Keep progression monotonic and clamp profile shifts

**Decision**: Increase `progression.questLevel` only on success; keep unchanged on failure/abandoned. Apply bounded profile nudges and clamp to valid ranges after every update.

**Rationale**: Preserves deterministic progression while still reflecting outcome sentiment in player profile trends.

**Alternatives considered**:
- Decrease quest level on failure (rejected: violates monotonic progression requirement).
- Unbounded profile updates (rejected: eventually invalid state and unstable behavior).

## Decision 5: Handle duplicate completion events with idempotency guard

**Decision**: Apply duplicate detection on completion events using stable event identity (`character`, `questId`, `outcome`, and event timestamp/id if available) before mutating memory.

**Rationale**: Prevents double increments and duplicate memory entries when retries or upstream replays deliver repeated completion events.

**Alternatives considered**:
- Trust upstream uniqueness only (rejected: unsafe under network retry conditions).
- Accept duplicates and reconcile later (rejected: introduces avoidable inconsistency).

## Validation Results (Implementation Run)

- `npm test` passed with 11/11 tests.
- `npm run build` (TypeScript compile) passed.
- Verified behaviors:
  - quest completion success/failure/abandoned updates mutate memory correctly;
  - duplicate completion events are ignored by idempotency ledger;
  - retry queue replays `quest_start` and `quest_complete` by explicit `type`;
  - first quest offer is blocked on assistant turns 1-2 and allowed only on 3-5.
