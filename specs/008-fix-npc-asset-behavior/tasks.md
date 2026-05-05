# Tasks: NPC Asset & Behavior Fixes

**Input**: Design documents from `/specs/008-fix-npc-asset-behavior/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include targeted AI contract/integration coverage plus game-side validation/manual regression tasks called for by the contracts and quickstart.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add feature-specific validation entrypoints and shared scaffolding before behavior changes land.

- [X] T001 Create NPC asset validation script scaffold in `game/scripts/validateNpcAssets.mjs`
- [X] T002 [P] Register the NPC asset validation command in `game/package.json`
- [X] T003 [P] Add debug-trigger test fixture scaffolding for conversation route coverage in `ai/tests/server/conversation-routes.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the canonical config and shared state surfaces that all three stories depend on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T004 Define the canonical starter pool, archetype-to-character map, and character asset metadata in `game/src/game/npc/npcConfig.js`
- [X] T005 [P] Extend persisted progression/follower state normalization for starter persistence and transition recovery flags in `game/src/game/playtestProgression.js`
- [X] T006 [P] Add shared debug quest activation helpers and response metadata types in `ai/src/server/routes/conversation.ts` and `ai/src/lifecycle/pipeline.ts`

**Checkpoint**: Canonical mapping, starter pool, follower recovery state, and debug activation plumbing are ready for story work.

---

## Phase 3: User Story 1 - Start with a Valid Non-General Character (Priority: P1) 🎯 MVP

**Goal**: Ensure every fresh run starts from a randomized eligible starter that never resolves to `general`.

**Independent Test**: Reset progression repeatedly, start fresh runs, and confirm the first selected archetype varies within the eligible pool while never resolving to `general`.

### Implementation for User Story 1

- [X] T007 [US1] Implement non-`general` starter pool selection and persistence in `game/src/game/playtestProgression.js`
- [X] T008 [US1] Use the persisted starter archetype when opening NPC conversations in `game/src/game/ui/ConversationOverlay.js`
- [X] T009 [US1] Render the active starter NPC consistently from canonical starter data in `game/src/game/scenes/OverworldScene.js`
- [X] T010 [US1] Add starter-pool validation coverage for repeated fresh-run selection in `game/scripts/validateNpcAssets.mjs`

**Checkpoint**: A fresh progression run now chooses and persists a valid non-`general` starter archetype.

---

## Phase 4: User Story 2 - See Correct Character Visuals and Animations (Priority: P2)

**Goal**: Make each required archetype resolve to the mandated character identity with required animations across runtime surfaces.

**Independent Test**: Force each target archetype, then verify overworld/conversation presentation and required animations for `Countess_Vampire`, `Converted_Vampire`, `girl-1`, `girl-2`, and `girl-3`.

### Implementation for User Story 2

- [X] T011 [P] [US2] Expand canonical archetype-to-character asset definitions for parasite, enabler, honest_one, mirror, and opportunist in `game/src/game/npc/npcConfig.js`
- [X] T012 [P] [US2] Update portrait and archetype presentation resolution to use mapped character assets in `game/src/game/ui/ConversationOverlay.js`
- [X] T013 [US2] Update overworld NPC spawn/render logic to consume canonical mapped sprite and animation data in `game/src/game/scenes/OverworldScene.js`
- [X] T014 [US2] Align quest/combat scene character loading with canonical mapped asset identities in `game/src/game/scenes/DungeonScene.js` and `game/src/game/scenes/CombatScene.js`
- [X] T015 [US2] Add mapping and required-animation coverage checks to `game/scripts/validateNpcAssets.mjs`

**Checkpoint**: Required archetypes now resolve to the correct character identities with validated required animation coverage.

---

## Phase 5: User Story 3 - Force Quest Start for Testing and Maintain Overworld Following (Priority: P3)

**Goal**: Support the two exact debug phrases for immediate quest activation and make follower behavior recover reliably through transitions.

**Independent Test**: Submit `I will do it` and `i will do it` during active conversations, confirm ordered quest activation succeeds, then verify follower behavior continues during movement and resumes after battle/scene transitions.

### Tests for User Story 3

- [X] T016 [P] [US3] Add exact-match and near-miss debug trigger route coverage in `ai/tests/server/conversation-routes.test.ts`
- [X] T017 [P] [US3] Add debug-trigger activation ordering coverage in `ai/tests/integration/debug-quest-trigger.integration.test.ts`

### Implementation for User Story 3

- [X] T018 [US3] Detect the two approved debug phrases and emit `questActivation` response metadata in `ai/src/server/routes/conversation.ts`
- [X] T019 [US3] Route debug-triggered quest starts through the standard ordered activation pipeline in `ai/src/lifecycle/pipeline.ts`
- [X] T020 [US3] Surface debug-trigger quest-start feedback to the game client in `game/src/game/services/aiClient.js` and `game/src/game/ui/ConversationOverlay.js`
- [X] T021 [US3] Persist active follower intent and transition resume state in `game/src/game/playtestProgression.js` and `game/src/game/scenes/OverworldScene.js`
- [X] T022 [US3] Restore follower rebind behavior on battle/dungeon return handoff in `game/src/game/scenes/CombatScene.js` and `game/src/game/scenes/DungeonScene.js`

**Checkpoint**: Debug-triggered quest starts are deterministic and follower-designated NPCs recover automatically after common transitions.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize validation, docs, and regression guidance across the feature.

- [X] T023 [P] Document the new validation flow and regression commands in `specs/008-fix-npc-asset-behavior/quickstart.md`
- [X] T024 [P] Update contract notes to reflect finalized validation and runtime invariants in `specs/008-fix-npc-asset-behavior/contracts/conversation-debug-trigger-contract.md`, `specs/008-fix-npc-asset-behavior/contracts/npc-archetype-asset-contract.md`, and `specs/008-fix-npc-asset-behavior/contracts/overworld-follower-state-contract.md`
- [ ] T025 Run end-to-end starter, mapping, debug-trigger, and follower-recovery regression passes in `specs/008-fix-npc-asset-behavior/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; start immediately.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion.
- **User Story 2 (Phase 4)**: Depends on Foundational completion; can proceed independently of US1 once canonical config exists.
- **User Story 3 (Phase 5)**: Depends on Foundational completion; can proceed independently of US1/US2 once shared activation and follow-state plumbing exists.
- **Polish (Phase 6)**: Depends on the user stories you intend to ship.

### User Story Dependencies

- **US1**: No dependency on other user stories.
- **US2**: No dependency on other user stories, but shares canonical NPC config from Phase 2.
- **US3**: No dependency on other user stories, but shares canonical AI/game state plumbing from Phase 2.

### Within Each User Story

- Shared config/state tasks must land before scene/UI wiring.
- AI route tests should be added before or alongside debug-trigger route changes.
- Validation script updates should follow the runtime changes they verify.
- Manual/browser regression should occur after each story reaches its checkpoint.

### Parallel Opportunities

- `T002` and `T003` can run in parallel after `T001`.
- `T005` and `T006` can run in parallel after `T004`.
- In US2, `T011` and `T012` can run in parallel before scene integration tasks.
- In US3, `T016` and `T017` can run in parallel before the route/pipeline implementation tasks.
- In Polish, `T023` and `T024` can run in parallel before the final regression pass.

---

## Parallel Example: User Story 2

```bash
Task: "Expand canonical archetype-to-character asset definitions in game/src/game/npc/npcConfig.js"
Task: "Update portrait and archetype presentation resolution in game/src/game/ui/ConversationOverlay.js"
```

## Parallel Example: User Story 3

```bash
Task: "Add exact-match and near-miss debug trigger route coverage in ai/tests/server/conversation-routes.test.ts"
Task: "Add debug-trigger activation ordering coverage in ai/tests/integration/debug-quest-trigger.integration.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate repeated fresh-run starter selection before expanding scope.

### Incremental Delivery

1. Ship US1 to stabilize progression startup.
2. Add US2 to lock visual identity and animation correctness across scenes.
3. Add US3 to accelerate QA and restore follower reliability through transitions.
4. Finish with Phase 6 regression and documentation updates.
