# Tasks: Quest Completion and Offer Pacing

**Input**: Design documents from `/home/zak/school/sp26/cs/final/ai/specs/003-quest-completion-pacing/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Include contract, integration, and unit tests for each user story because the spec defines explicit independent test criteria and measurable quality targets.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unresolved dependencies)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`) for traceability
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create test scaffolding and execution entry points for this feature.

- [X] T001 Create test directory skeleton and placeholders in `/home/zak/school/sp26/cs/final/ai/tests/contract/.gitkeep`, `/home/zak/school/sp26/cs/final/ai/tests/integration/.gitkeep`, `/home/zak/school/sp26/cs/final/ai/tests/unit/.gitkeep`, and `/home/zak/school/sp26/cs/final/ai/tests/helpers/.gitkeep`
- [X] T002 Update test scripts for feature validation in `/home/zak/school/sp26/cs/final/ai/package.json`
- [X] T003 [P] Add shared test fixture payloads for quest notifications in `/home/zak/school/sp26/cs/final/ai/tests/fixtures/notification-payloads.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required before story-specific work.

**⚠️ CRITICAL**: Complete this phase before starting user stories.

- [X] T004 Add shared TypeScript contracts for quest completion events and typed pending notifications in `/home/zak/school/sp26/cs/final/ai/src/types.ts`
- [X] T005 Add persistent idempotency ledger helpers for completion events in `/home/zak/school/sp26/cs/final/ai/src/memory/store.ts`
- [X] T006 [P] Add reusable runtime test harness for mocked fetch and memory I/O in `/home/zak/school/sp26/cs/final/ai/tests/helpers/runtime-harness.ts`
- [X] T007 [P] Add deterministic outcome test data builders in `/home/zak/school/sp26/cs/final/ai/tests/helpers/outcome-builders.ts`

**Checkpoint**: Foundation complete — user stories can proceed.

---

## Phase 3: User Story 1 - Record quest outcomes reliably (Priority: P1) 🎯 MVP

**Goal**: Process quest completion events and update character/player memory correctly for success, failure, and abandoned outcomes.

**Independent Test**: Submit completion events for each outcome and verify memory updates, progression behavior, and reward mismatch handling are correct with no duplicate side effects.

### Tests for User Story 1

- [X] T008 [P] [US1] Add contract tests for quest-complete payload requirements in `/home/zak/school/sp26/cs/final/ai/tests/contract/quest-complete.contract.test.ts`
- [X] T009 [P] [US1] Add integration tests for success/failure/abandoned memory mutations in `/home/zak/school/sp26/cs/final/ai/tests/integration/quest-complete-pipeline.integration.test.ts`
- [X] T010 [P] [US1] Add integration test for duplicate completion deduplication in `/home/zak/school/sp26/cs/final/ai/tests/integration/quest-complete-idempotency.integration.test.ts`

### Implementation for User Story 1

- [X] T011 [US1] Implement quest-outcome character memory mutation logic (flags, questLevel, keyMemories cap) in `/home/zak/school/sp26/cs/final/ai/src/memory/updater.ts`
- [X] T012 [US1] Implement quest-outcome player profile nudges with range clamping in `/home/zak/school/sp26/cs/final/ai/src/memory/updater.ts`
- [X] T013 [US1] Implement `runQuestCompletionPipeline` orchestration (validate, dedupe, mutate, persist) in `/home/zak/school/sp26/cs/final/ai/src/lifecycle/pipeline.ts`
- [X] T014 [US1] Add `notifyQuestComplete` request and response classification behavior in `/home/zak/school/sp26/cs/final/ai/src/notify/game-api.ts`
- [X] T015 [US1] Add completion event handling entry point for local runtime flow in `/home/zak/school/sp26/cs/final/ai/src/index.ts`

**Checkpoint**: User Story 1 independently functional and testable.

---

## Phase 4: User Story 3 - Delay quest offers to a natural point (Priority: P1)

**Goal**: Prevent early quest offers and constrain first offer timing to assistant responses 3-5.

**Independent Test**: Run conversation simulations where quest offers are likely; verify no first offer is accepted on turns 1-2 and accepted first offers occur only on turns 3-5.

### Tests for User Story 3

- [X] T016 [P] [US3] Add unit tests for assistant response counting and offer-window eligibility in `/home/zak/school/sp26/cs/final/ai/tests/unit/quest-offer-window.test.ts`
- [X] T017 [P] [US3] Add integration tests confirming no offers on assistant responses 1-2 in `/home/zak/school/sp26/cs/final/ai/tests/integration/quest-offer-no-early-window.integration.test.ts`
- [X] T018 [P] [US3] Add integration tests confirming first offer acceptance only on responses 3-5 in `/home/zak/school/sp26/cs/final/ai/tests/integration/quest-offer-window-3-5.integration.test.ts`

### Implementation for User Story 3

- [X] T019 [US3] Add assistant-response turn counters and first-offer tracking to conversation state in `/home/zak/school/sp26/cs/final/ai/src/types.ts`
- [X] T020 [US3] Update session message append logic to increment assistant response counters in `/home/zak/school/sp26/cs/final/ai/src/session.ts`
- [X] T021 [US3] Enforce first-offer timing gate in chat loop before quest detection in `/home/zak/school/sp26/cs/final/ai/src/index.ts`
- [X] T022 [US3] Update quest detection API to respect offer-window context and return blocked diagnostics in `/home/zak/school/sp26/cs/final/ai/src/lifecycle/detector.ts`
- [X] T023 [US3] Surface offer-window turn diagnostics in debug rendering in `/home/zak/school/sp26/cs/final/ai/src/ui.ts`

**Checkpoint**: User Story 3 independently functional and testable.

---

## Phase 5: User Story 2 - Preserve outcomes when delivery fails (Priority: P2)

**Goal**: Ensure retryable notification failures are queued with type-safe routing and replayed to the correct endpoint.

**Independent Test**: Simulate network/5xx/4xx responses for both quest-start and quest-complete notifications and verify queue schema, replay routing, and drop behavior.

### Tests for User Story 2

- [X] T024 [P] [US2] Add contract tests for pending notification record schema and required `type` discriminator in `/home/zak/school/sp26/cs/final/ai/tests/contract/pending-notification.contract.test.ts`
- [X] T025 [P] [US2] Add integration tests for mixed queue replay routing (`quest_start` and `quest_complete`) in `/home/zak/school/sp26/cs/final/ai/tests/integration/notification-retry-routing.integration.test.ts`
- [X] T026 [P] [US2] Add integration tests for non-retryable 4xx drop behavior in `/home/zak/school/sp26/cs/final/ai/tests/integration/notification-retry-drop.integration.test.ts`

### Implementation for User Story 2

- [X] T027 [US2] Refactor pending queue persistence to typed record format (`type`, `payload`, retry metadata) in `/home/zak/school/sp26/cs/final/ai/src/notify/game-api.ts`
- [X] T028 [US2] Route `retrySavedNotifications()` by notification type and endpoint in `/home/zak/school/sp26/cs/final/ai/src/notify/game-api.ts`
- [X] T029 [US2] Add backward-compatible handling for legacy untyped queue items in `/home/zak/school/sp26/cs/final/ai/src/notify/game-api.ts`
- [X] T030 [US2] Ensure quest-complete transient failures enqueue `quest_complete` typed records in `/home/zak/school/sp26/cs/final/ai/src/notify/game-api.ts`

**Checkpoint**: User Story 2 independently functional and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, documentation, and validation across stories.

- [X] T031 [P] Update feature quickstart steps to match final command/test flow in `/home/zak/school/sp26/cs/final/ai/specs/003-quest-completion-pacing/quickstart.md`
- [X] T032 [P] Align contract docs with implemented field names and error semantics in `/home/zak/school/sp26/cs/final/ai/specs/003-quest-completion-pacing/contracts/quest-complete-contract.md` and `/home/zak/school/sp26/cs/final/ai/specs/003-quest-completion-pacing/contracts/pending-notification-contract.md`
- [X] T033 Run end-to-end validation scenarios and record observed results in `/home/zak/school/sp26/cs/final/ai/specs/003-quest-completion-pacing/research.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: no dependencies
- **Phase 2 (Foundational)**: depends on Phase 1 and blocks all user stories
- **Phase 3 (US1)**: depends on Phase 2
- **Phase 4 (US3)**: depends on Phase 2 (can run in parallel with US1 if staffed)
- **Phase 5 (US2)**: depends on Phase 2 and benefits from US1 completion for quest-complete notification paths
- **Phase 6 (Polish)**: depends on completion of selected user stories

### User Story Dependencies

- **US1 (P1)**: independent after foundational phase
- **US3 (P1)**: independent after foundational phase
- **US2 (P2)**: independent after foundational phase, but should integrate finalized quest-complete flow from US1

### Within-Story Order

- Implement tests first for each story (T008-T010, T016-T018, T024-T026)
- Implement core story logic after tests fail
- Run story-specific tests before moving to next story

---

## Parallel Execution Examples

### User Story 1

```bash
Task: "T008 [US1] contract tests in tests/contract/quest-complete.contract.test.ts"
Task: "T009 [US1] integration tests in tests/integration/quest-complete-pipeline.integration.test.ts"
Task: "T010 [US1] idempotency test in tests/integration/quest-complete-idempotency.integration.test.ts"
```

### User Story 3

```bash
Task: "T016 [US3] unit tests in tests/unit/quest-offer-window.test.ts"
Task: "T017 [US3] integration tests in tests/integration/quest-offer-no-early-window.integration.test.ts"
Task: "T018 [US3] integration tests in tests/integration/quest-offer-window-3-5.integration.test.ts"
```

### User Story 2

```bash
Task: "T024 [US2] queue schema contract test in tests/contract/pending-notification.contract.test.ts"
Task: "T025 [US2] mixed routing integration test in tests/integration/notification-retry-routing.integration.test.ts"
Task: "T026 [US2] non-retryable drop test in tests/integration/notification-retry-drop.integration.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2
2. Complete Phase 3 (US1)
3. Validate quest completion processing end-to-end
4. Demo/deploy MVP behavior

### Incremental Delivery

1. US1 for reliable completion state updates
2. US3 for conversational pacing quality
3. US2 for robust retry routing and delivery resilience
4. Final polish and cross-cutting validation

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Then split:
   - Developer A: US1
   - Developer B: US3
3. Merge and then complete US2 integration hardening

---

## Notes

- All tasks follow strict checklist format with Task ID, optional `[P]`, optional `[USx]`, and file path.
- User stories remain independently testable as required by the spec.
- Run story-level tests at each checkpoint before advancing.
