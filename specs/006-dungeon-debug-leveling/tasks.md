# Tasks: Dungeon Debug Tools and Global Leveling

**Input**: Design documents from `/home/zak/school/sp26/cs/final/specs/006-dungeon-debug-leveling/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Include targeted test tasks for AI-side quest completion and profile persistence because the feature spec defines explicit persistence, idempotency, and legacy-compatibility validation requirements. Game-side dungeon debug controls use manual runtime verification plus existing dungeon validation.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label for story-specific work (`[US1]`, `[US2]`, `[US3]`)
- Every task includes exact file path(s)

## Phase 1: Setup (Shared Preparation)

**Purpose**: Align fixtures, validation notes, and shared type surface before feature work branches into `game/` and `ai/`.

- [X] T001 Update feature validation steps and expected debug/leveling checks in `/home/zak/school/sp26/cs/final/specs/006-dungeon-debug-leveling/quickstart.md`
- [X] T002 [P] Extend quest completion test fixture builders for leveling scenarios in `/home/zak/school/sp26/cs/final/ai/tests/helpers/outcome-builders.ts`
- [X] T003 [P] Add `globalCharacterLevel` to shared profile typings in `/home/zak/school/sp26/cs/final/ai/src/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared persistence and normalization behavior required by the leveling stories before story-specific implementation.

**⚠️ CRITICAL**: Complete this phase before implementing User Stories 2 or 3.

- [X] T004 Normalize `globalCharacterLevel` defaults and persistence reads/writes in `/home/zak/school/sp26/cs/final/ai/src/memory/store.ts`
- [X] T005 [P] Implement success-only global level mutation rules in `/home/zak/school/sp26/cs/final/ai/src/memory/updater.ts`
- [X] T006 [P] Seed isolated test memory with compatible profile defaults in `/home/zak/school/sp26/cs/final/ai/tests/helpers/runtime-harness.ts`

**Checkpoint**: AI memory/profile infrastructure is ready for leveling stories.

---

## Phase 3: User Story 1 - Fast Dungeon Debug Progression (Priority: P1) 🎯 MVP

**Goal**: Give developers and playtesters temporary dungeon-scene controls to clear blockers and advance floors without replaying full encounters.

**Independent Test**: Start a dungeon floor with enemies and unopened chests, trigger each debug action individually, and verify immediate floor-wide effects with no crashes, duplicate rewards, or broken floor transitions.

### Implementation for User Story 1

- [X] T007 [US1] Add temporary debug keybind registration and HUD/help text for dungeon actions in `/home/zak/school/sp26/cs/final/game/src/game/scenes/DungeonScene.js`
- [X] T008 [US1] Implement `kill_all_enemies` using existing enemy defeat and floor-objective pathways in `/home/zak/school/sp26/cs/final/game/src/game/scenes/DungeonScene.js`
- [X] T009 [US1] Implement `open_all_chests` with unopened-chest guards and reward application through `/home/zak/school/sp26/cs/final/game/src/game/scenes/DungeonScene.js` and `/home/zak/school/sp26/cs/final/game/src/game/playtestProgression.js`
- [X] T010 [US1] Implement `skip_to_next_floor` through normal quest floor completion/advance flow in `/home/zak/school/sp26/cs/final/game/src/game/scenes/DungeonScene.js` and `/home/zak/school/sp26/cs/final/game/src/game/playtestProgression.js`
- [X] T011 [P] [US1] Document manual validation coverage for valid and invalid debug contexts in `/home/zak/school/sp26/cs/final/specs/006-dungeon-debug-leveling/quickstart.md`

**Checkpoint**: User Story 1 is fully playable and independently verifiable in the game runtime.

---

## Phase 4: User Story 2 - Persistent Global Character Progression (Priority: P2)

**Goal**: Persist a cross-session global character level and increment it exactly once for each successful quest completion.

**Independent Test**: Complete a successful quest, restart the AI bridge, and verify `globalCharacterLevel` increased by exactly 1 and remained persisted.

### Tests for User Story 2

- [X] T012 [P] [US2] Add route/contract assertions for level-aware quest completion payload handling in `/home/zak/school/sp26/cs/final/ai/tests/server/quest-complete-route.test.ts` and `/home/zak/school/sp26/cs/final/ai/tests/contract/quest-complete.contract.test.ts`
- [X] T013 [P] [US2] Add integration assertions for successful completion persistence and non-success no-op cases in `/home/zak/school/sp26/cs/final/ai/tests/integration/quest-complete-pipeline.integration.test.ts`

### Implementation for User Story 2

- [X] T014 [US2] Add `globalCharacterLevel` to the persisted profile seed in `/home/zak/school/sp26/cs/final/ai/memory/player-profile.json`
- [X] T015 [US2] Increment and persist `globalCharacterLevel` only for successful completions in `/home/zak/school/sp26/cs/final/ai/src/lifecycle/pipeline.ts` and `/home/zak/school/sp26/cs/final/ai/src/memory/updater.ts`
- [X] T016 [US2] Keep quest completion route payload assembly and response behavior compatible with leveling persistence in `/home/zak/school/sp26/cs/final/ai/src/server/routes/questCompletion.ts`

**Checkpoint**: User Story 2 persists global leveling correctly across successful quest completions and reloads.

---

## Phase 5: User Story 3 - Stable Progression Data for Existing Players (Priority: P3)

**Goal**: Upgrade legacy player profiles without `globalCharacterLevel` so older saves remain playable and continue progressing safely.

**Independent Test**: Load a legacy profile missing `globalCharacterLevel`, complete a quest, and verify the profile is normalized to level `1` before incrementing and persisting correctly.

### Tests for User Story 3

- [X] T017 [P] [US3] Add legacy-profile and invalid-level fixtures to isolated memory tests in `/home/zak/school/sp26/cs/final/ai/tests/helpers/runtime-harness.ts` and `/home/zak/school/sp26/cs/final/ai/tests/integration/quest-complete-pipeline.integration.test.ts`
- [X] T018 [P] [US3] Add duplicate-event migration coverage so upgraded profiles do not double-level on retries in `/home/zak/school/sp26/cs/final/ai/tests/integration/quest-complete-idempotency.integration.test.ts`

### Implementation for User Story 3

- [X] T019 [US3] Normalize missing, null, non-integer, and `< 1` profile values to `1` in `/home/zak/school/sp26/cs/final/ai/src/memory/store.ts` and `/home/zak/school/sp26/cs/final/ai/src/types.ts`
- [X] T020 [US3] Preserve upgraded-profile behavior across duplicate, failure, and abandoned completion paths in `/home/zak/school/sp26/cs/final/ai/src/lifecycle/pipeline.ts` and `/home/zak/school/sp26/cs/final/ai/src/memory/updater.ts`

**Checkpoint**: Legacy profiles upgrade safely and remain compatible with idempotent quest completion processing.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish documentation, contract alignment, and end-to-end regression verification across both modules.

- [X] T021 [P] Update final behavior details for debug controls and global level contracts in `/home/zak/school/sp26/cs/final/specs/006-dungeon-debug-leveling/contracts/dungeon-debug-controls-contract.md` and `/home/zak/school/sp26/cs/final/specs/006-dungeon-debug-leveling/contracts/player-profile-level-contract.md`
- [X] T022 [P] Record final regression checklist and command results in `/home/zak/school/sp26/cs/final/specs/006-dungeon-debug-leveling/quickstart.md` after running `pnpm test` in `/home/zak/school/sp26/cs/final/ai` and `npm run validate:dungeons` in `/home/zak/school/sp26/cs/final/game`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup**: No dependencies; start immediately.
- **Phase 2: Foundational**: Depends on Phase 1; blocks leveling stories (`US2`, `US3`).
- **Phase 3: User Story 1**: Can start after Phase 1 because dungeon debug work is isolated to `game/`.
- **Phase 4: User Story 2**: Depends on Phase 2 completion.
- **Phase 5: User Story 3**: Depends on Phase 2 and builds on `US2` persistence behavior.
- **Phase 6: Polish**: Depends on all desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: Independent of AI persistence work after setup.
- **US2 (P2)**: Depends on foundational profile normalization and mutation helpers.
- **US3 (P3)**: Depends on foundational work and should be implemented after `US2` establishes the steady-state leveling path.

### Within Each User Story

- Validation tasks precede implementation where included.
- Shared types/store normalization before pipeline mutations.
- Dungeon debug input wiring before action handlers and validation notes.
- Story-specific validation must pass before moving to polish.

### Parallel Opportunities

- `T002` and `T003` can run in parallel.
- `T005` and `T006` can run in parallel after `T004`.
- `T012` and `T013` can run in parallel for `US2`.
- `T017` and `T018` can run in parallel for `US3`.
- `T021` and `T022` can run in parallel during polish once implementation is complete.

---

## Parallel Example: User Story 2

```bash
Task: "Add route/contract assertions for level-aware quest completion payload handling in /home/zak/school/sp26/cs/final/ai/tests/server/quest-complete-route.test.ts and /home/zak/school/sp26/cs/final/ai/tests/contract/quest-complete.contract.test.ts"
Task: "Add integration assertions for successful completion persistence and non-success no-op cases in /home/zak/school/sp26/cs/final/ai/tests/integration/quest-complete-pipeline.integration.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Add legacy-profile and invalid-level fixtures to isolated memory tests in /home/zak/school/sp26/cs/final/ai/tests/helpers/runtime-harness.ts and /home/zak/school/sp26/cs/final/ai/tests/integration/quest-complete-pipeline.integration.test.ts"
Task: "Add duplicate-event migration coverage so upgraded profiles do not double-level on retries in /home/zak/school/sp26/cs/final/ai/tests/integration/quest-complete-idempotency.integration.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1.
2. Implement Phase 3 (`US1`).
3. Validate dungeon debug controls manually from the feature quickstart.
4. Stop for playtest feedback before touching persistence work.

### Incremental Delivery

1. Complete Setup + Foundational to stabilize AI profile handling.
2. Deliver `US1` for immediate playtest acceleration.
3. Deliver `US2` to add persistent global leveling.
4. Deliver `US3` to harden legacy-profile compatibility.
5. Finish with cross-module regression and documentation updates.

### Suggested MVP Scope

- `US1` only, because it provides immediate development velocity without waiting on AI persistence changes.

---

## Notes

- All tasks follow the required checklist format with IDs, optional `[P]` markers, and `[US#]` labels only for story-specific phases.
- Real repository paths are used throughout; no placeholder `src/` or `tests/` paths remain.
- `US1` is intentionally separated from the AI persistence phases so it can ship first.
