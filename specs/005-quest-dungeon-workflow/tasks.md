# Tasks: Quest Dungeon Workflow

**Input**: Design documents from `/specs/005-quest-dungeon-workflow/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include targeted contract/integration/regression tests because this feature defines explicit contract validation and repeat-session regression criteria.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align tooling and scaffolding across `ai/` and `game/` for the quest workflow changes.

- [X] T001 Update AI bridge route wiring to register quest codex handlers in ai/src/server/http.ts
- [X] T002 [P] Add quest workflow client scaffolding for game runtime in game/src/game/services/questRunClient.js
- [X] T003 [P] Add codex overlay shell component and export wiring in game/src/game/ui/LoreCodexOverlay.js
- [ ] T004 [P] Add quest workflow regression script entry and command wiring in game/scripts/validateDungeons.mjs and game/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared quest state, persistence, and event plumbing required by all stories.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T005 Create shared quest/run type definitions for bridge payloads in ai/src/types.ts
- [X] T006 [P] Extend quest persistence store for unique-title + memorySyncPending fields in ai/src/memory/store.ts
- [X] T007 [P] Implement quest title uniqueness enforcement helper in ai/src/lifecycle/detector.ts
- [X] T008 Implement completion retry marker + update pipeline behavior in ai/src/lifecycle/pipeline.ts
- [X] T009 [P] Extend game progression snapshot schema for QuestRunState persistence in game/src/game/playtestProgression.js
- [X] T010 Implement shared quest event subscription and dispatch updates in game/src/game/services/questEvents.js
- [X] T011 Add floor objective recovery/recheck service utilities in game/src/game/services/questRunClient.js

**Checkpoint**: Foundation ready - user story implementation can now proceed.

---

## Phase 3: User Story 1 - Start and Track a Quest Run (Priority: P1) 🎯 MVP

**Goal**: Accept a quest and complete a deterministic three-floor run through a single portal with strict completion gates.

**Independent Test**: Accept a quest, enter floor 1, clear all enemies/chests on floors 1-3, confirm progression/exit portals, and verify quest completion state.

### Tests for User Story 1

- [ ] T012 [P] [US1] Add contract test for POST /quest/complete runSummary handling in ai/tests/contract/quest-workflow-http.test.ts
- [ ] T013 [P] [US1] Add integration test for three-floor progression and completion transitions in game/src/game/playtestProgression.test.js

### Implementation for User Story 1

- [X] T014 [US1] Implement three-floor run creation and floor pool selection in game/src/game/scenes/DungeonScene.js
- [X] T015 [US1] Implement floor objective gate checks (all enemies + all chests) in game/src/game/scenes/DungeonScene.js
- [X] T016 [US1] Implement progression/exit portal spawn transitions in game/src/game/scenes/DungeonScene.js
- [X] T017 [US1] Bind quest portal entry to active run state and floor index restoration in game/src/game/scenes/OverworldScene.js
- [X] T018 [US1] Implement quest completion API call with runSummary payload in game/src/game/services/questRunClient.js
- [X] T019 [US1] Implement /quest/complete extended payload handling in ai/src/server/routes/questCompletion.ts
- [X] T020 [US1] Update AI quest start flow to persist run metadata and active quest identity in ai/src/server/routes/conversation.ts

**Checkpoint**: User Story 1 is independently functional and testable as MVP.

---

## Phase 4: User Story 2 - Preserve Quest Narrative Context (Priority: P2)

**Goal**: Generate unique quest titles/lore and maintain conversation continuity across repeated sessions.

**Independent Test**: Complete a quest, start a new conversation with same NPC, verify prior outcomes are referenced and new title is unique.

### Tests for User Story 2

- [ ] T021 [P] [US2] Add unit/integration test for title collision resolution in ai/tests/integration/quest-title-uniqueness.test.ts
- [ ] T022 [P] [US2] Add regression test for repeat conversation start/end without restart in ai/tests/server/conversation-session-regression.test.ts

### Implementation for User Story 2

- [X] T023 [US2] Implement unique quest title generation flow in ai/src/lifecycle/detector.ts
- [X] T024 [US2] Persist optional lore + source conversation linkage on acceptance in ai/src/server/routes/conversation.ts
- [X] T025 [US2] Update completion memory writes with quest outcomes and retry flag behavior in ai/src/memory/updater.ts
- [X] T026 [US2] Persist and restore recent topic/completed quest refs for NPC context in ai/src/memory/context.ts
- [X] T027 [US2] Update session teardown/start behavior to allow immediate new sessions in ai/src/server/sessionRegistry.ts
- [X] T028 [US2] Inject prior quest outcomes into follow-up prompt context in ai/src/server/routes/conversation.ts

**Checkpoint**: User Stories 1 and 2 both work independently; repeat conversations retain context.

---

## Phase 5: User Story 3 - Review Lore and Receive Completion Feedback (Priority: P3)

**Goal**: Provide codex history UI, completion toasts, and companion follow behavior after quest generation.

**Independent Test**: Generate multiple quests, open codex for active/history entries, verify completion toast timing, verify companion follow activation after quest generation.

### Tests for User Story 3

- [ ] T029 [P] [US3] Add contract test for codex response schema and ordering in ai/tests/contract/codex-data-contract.test.ts
- [ ] T030 [P] [US3] Add UI/service integration test for codex rendering + completion toast trigger in game/src/game/ui/LoreCodexOverlay.test.js

### Implementation for User Story 3

- [X] T031 [US3] Implement codex read endpoints (active + history) in ai/src/server/routes/questCodex.ts
- [X] T032 [US3] Register codex routes and response validation plumbing in ai/src/server/http.ts
- [X] T033 [US3] Implement codex fetch methods and response normalization in game/src/game/services/questRunClient.js
- [X] T034 [US3] Implement codex overlay rendering for active/current history entries in game/src/game/ui/LoreCodexOverlay.js
- [X] T035 [US3] Wire completion toast trigger on quest_complete event in game/src/game/ui/QuestToast.js
- [X] T036 [US3] Implement post-generation companion follow state machine tuning in game/src/game/scenes/OverworldScene.js
- [X] T037 [US3] Ensure repeated conversation UI lifecycle can reopen without restart in game/src/game/ui/ConversationOverlay.js

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final quality, resilience, and documentation across stories.

- [ ] T038 [P] Document quest workflow, codex behavior, and recovery path in specs/005-quest-dungeon-workflow/quickstart.md
- [X] T039 Add fallback UI indicator for memorySyncPending completions in game/src/game/ui/HUDController.js
- [ ] T040 [P] Add end-to-end smoke regression for portal-label/codex/conversation loop in ai/tests/integration/quest-dungeon-workflow-smoke.test.ts
- [ ] T041 Run and record dungeon validation updates for new flow in game/scripts/validateDungeons.mjs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2; forms MVP.
- **Phase 4 (US2)**: Depends on Phase 2 and integrates with US1 quest lifecycle data.
- **Phase 5 (US3)**: Depends on Phase 2; consumes quest/lore/completion data from US1+US2.
- **Phase 6 (Polish)**: Depends on desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on other user stories after foundation.
- **US2 (P2)**: Depends on foundational quest persistence and completion events; should remain independently testable once enabled.
- **US3 (P3)**: Depends on quest/lore data availability from US1/US2 contracts; independently testable via codex + toast + follow behavior.

### Within Each User Story

- Tests before implementation for that story.
- Scene/service data model updates before UI bindings.
- API contract handlers before client consumption where applicable.

## Parallel Opportunities

- **Setup**: T002, T003, T004 can run in parallel after T001.
- **Foundational**: T006, T007, T009 can run in parallel, then merge into T008/T010/T011.
- **US1**: T012 and T013 parallel; T014/T015 can be split by scene ownership.
- **US2**: T021 and T022 parallel; T026 and T027 parallel after persistence assumptions are set.
- **US3**: T029 and T030 parallel; T033 and T034 parallel after T031/T032.
- **Polish**: T038 and T040 can run in parallel before final validation task T041.

## Parallel Example: User Story 2

```bash
# Run US2 tests in parallel
Task: "T021 [US2] Add unit/integration test for title collision resolution in ai/tests/integration/quest-title-uniqueness.test.ts"
Task: "T022 [US2] Add regression test for repeat conversation start/end without restart in ai/tests/server/conversation-session-regression.test.ts"

# Run independent context/session implementation tasks in parallel
Task: "T026 [US2] Persist and restore recent topic/completed quest refs in ai/src/memory/context.ts"
Task: "T027 [US2] Update session teardown/start behavior in ai/src/server/sessionRegistry.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational).
3. Deliver Phase 3 (US1).
4. Validate US1 independent test end-to-end before adding narrative/codex layers.

### Incremental Delivery

1. Ship US1 (core quest run loop).
2. Add US2 (title uniqueness + memory continuity).
3. Add US3 (codex + toast + follow polish).
4. Finish with Phase 6 resilience/documentation updates.

### Team Parallelization

1. Pair on Phase 2 shared contracts/state.
2. Split by module for stories:
   - Engineer A: AI bridge contracts/memory.
   - Engineer B: Dungeon progression + UI systems.
   - Engineer C: Codex + regression automation.

---

## Notes

- All checklist entries follow: `- [ ] T### [P?] [US?] Description with file path`.
- `[US#]` labels are used only in user story phases.
- Keep one active quest run invariant and three-floor invariant enforced throughout implementation.
