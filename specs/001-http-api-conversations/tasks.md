# Tasks: HTTP API Conversation Service

**Input**: Design documents from `/home/zak/school/s26/iproj/final/specs/001-http-api-conversations/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/http-api-v1.md, quickstart.md

**Tests**: Automated tests are not explicitly requested in the feature spec; validation is done with manual API scenarios from `quickstart.md`.

**Organization**: Tasks are grouped by user story so each story is independently implementable and verifiable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependency)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`) for story-phase tasks only
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare HTTP service entrypoint and scripts inside `ai/`.

- [X] T001 Add API dev/start scripts for HTTP runtime in `ai/package.json`
- [X] T002 Create HTTP service entrypoint scaffold in `ai/src/server.ts`
- [X] T003 [P] Add API service configuration constants (port/timeouts/cache TTL) in `ai/src/config.ts`
- [X] T004 [P] Create HTTP request/response helper utilities in `ai/src/http-utils.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared primitives required by all conversation endpoints.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T005 Define API request/response and error contract types in `ai/src/types.ts`
- [X] T006 Implement standardized API error builders and status mapping in `ai/src/errors.ts`
- [X] T007 Implement conversation session registry core (active sessions + lookups) in `ai/src/session-registry.ts`
- [X] T008 [P] Implement request body validation/parsing for start/message/end payloads in `ai/src/validators.ts`
- [X] T009 [P] Add conversation route dispatcher scaffold for `/conversation/*` endpoints in `ai/src/routes/conversation.ts`
- [X] T010 Wire `ai/src/server.ts` to route dispatcher with JSON/error handling envelope

**Checkpoint**: Foundation ready — user stories can be implemented independently.

---

## Phase 3: User Story 1 - Start and continue a conversation session (Priority: P1) 🎯 MVP

**Goal**: Allow game client to start/resume a conversation and send messages to receive one NPC reply plus updated phase.

**Independent Test**: Start a conversation with `POST /conversation/start`, then send `POST /conversation/message` and verify one NPC reply + updated phase for the same `conversationId`.

### Implementation for User Story 1

- [X] T011 [US1] Implement `POST /conversation/start` handler behavior in `ai/src/routes/conversation.ts`
- [X] T012 [US1] Add start-session creation/resume logic (including terminated conflict handling) in `ai/src/session-registry.ts`
- [X] T013 [P] [US1] Implement conversation session bootstrap from character/player context in `ai/src/session.ts`
- [X] T014 [US1] Implement `POST /conversation/message` handler skeleton with conversation existence/state checks in `ai/src/routes/conversation.ts`
- [X] T015 [US1] Integrate message handler with existing LLM conversation flow in `ai/src/client.ts`
- [X] T016 [US1] Integrate message handler with lifecycle phase progression and quest-offer detection in `ai/src/lifecycle/detector.ts`
- [X] T017 [US1] Return contract-compliant start/message response payload mapping in `ai/src/routes/conversation.ts`
- [X] T018 [US1] Add manual API scenario notes for US1 flow in `ai/docs/api/README.md`

**Checkpoint**: User Story 1 is independently functional via start+message flow.

---

## Phase 4: User Story 2 - Safely retry requests without duplicate effects (Priority: P2)

**Goal**: Ensure duplicate message/end retries with same idempotency key replay prior responses without duplicate side effects.

**Independent Test**: Send the same message request twice with identical (`conversationId`, `idempotencyKey`) and verify identical replay response and no duplicate lifecycle effects.

### Implementation for User Story 2

- [X] T019 [US2] Add idempotency record models and in-memory stores in `ai/src/session-registry.ts`
- [X] T020 [US2] Implement message idempotency replay + mismatch-key conflict handling in `ai/src/routes/conversation.ts`
- [X] T021 [US2] Implement end idempotency replay + mismatch-key conflict handling in `ai/src/routes/conversation.ts`
- [X] T022 [US2] Persist/reuse terminated replay snapshots with 5-minute TTL in `ai/src/session-registry.ts`
- [X] T023 [US2] Ensure accepted-termination path executes side effects only once per unique request in `ai/src/lifecycle/pipeline.ts`
- [X] T024 [US2] Document idempotency key retry contract and examples in `ai/docs/api/README.md`

**Checkpoint**: User Story 2 retries are safe and independently verifiable.

---

## Phase 5: User Story 3 - End and recover conversation state (Priority: P3)

**Goal**: Support explicit end, state retrieval, timeout cleanup, and session termination semantics.

**Independent Test**: Start a conversation, call `GET /conversation/state/:id`, then `POST /conversation/end` and confirm terminated state; verify unknown ID returns 404.

### Implementation for User Story 3

- [X] T025 [US3] Implement `GET /conversation/state/:id` response mapping in `ai/src/routes/conversation.ts`
- [X] T026 [US3] Implement `POST /conversation/end` termination flow in `ai/src/routes/conversation.ts`
- [X] T027 [US3] Trigger existing post-conversation pipeline on explicit end (when not already terminated) in `ai/src/lifecycle/pipeline.ts`
- [X] T028 [US3] Remove ended sessions from active map after pipeline completion in `ai/src/session-registry.ts`
- [X] T029 [US3] Add inactivity auto-termination scheduler (10-minute timeout with `exit` reason) in `ai/src/session-registry.ts`
- [X] T030 [US3] Ensure chat history discard at end while persistent memory files remain intact in `ai/src/session.ts`
- [X] T031 [US3] Document state/end/timeout behaviors and error codes in `ai/docs/api/README.md`

**Checkpoint**: User Story 3 is independently functional for end/state/recovery flows.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final alignment, operational checks, and documentation consistency.

- [X] T032 [P] Update endpoint examples and payload tables to match final behavior in `specs/001-http-api-conversations/contracts/http-api-v1.md`
- [X] T033 [P] Update quickstart validation steps to reflect implemented commands and responses in `specs/001-http-api-conversations/quickstart.md
- [ ] T034 Run full manual acceptance scenarios and record outcomes in `specs/001-http-api-conversations/quickstart.md`
- [X] T035 Verify branch-level implementation notes and finalize plan/task cross-references in `specs/001-http-api-conversations/plan.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 3 message/end handlers existing
- **Phase 5 (US3)**: Depends on Phase 3 session lifecycle baseline
- **Phase 6 (Polish)**: Depends on desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories after foundational phase
- **US2 (P2)**: Depends on US1 endpoint flows being present for replay hooks
- **US3 (P3)**: Depends on US1 active-session lifecycle but is independently testable once implemented

### Within Each User Story

- Implement handlers and state logic before response/documentation updates
- Complete story checkpoint validation before moving to next priority

---

## Parallel Opportunities

- **Setup**: T003 and T004 can run in parallel after T001/T002 start
- **Foundational**: T008 and T009 can run in parallel after T005–T007 are underway
- **US1**: T013 can run in parallel with T011/T012
- **Polish**: T032 and T033 can run in parallel

---

## Parallel Example: User Story 1

```bash
Task: "T011 [US1] Implement POST /conversation/start handler behavior in ai/src/routes/conversation.ts"
Task: "T013 [P] [US1] Implement conversation session bootstrap from character/player context in ai/src/session.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T020 [US2] Implement message idempotency replay + mismatch-key conflict handling in ai/src/routes/conversation.ts"
Task: "T022 [US2] Persist/reuse terminated replay snapshots with 5-minute TTL in ai/src/session-registry.ts"
```

## Parallel Example: User Story 3

```bash
Task: "T025 [US3] Implement GET /conversation/state/:id response mapping in ai/src/routes/conversation.ts"
Task: "T029 [US3] Add inactivity auto-termination scheduler (10-minute timeout with exit reason) in ai/src/session-registry.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2
2. Complete Phase 3 (US1)
3. Validate start+message flow independently
4. Demo as first shippable increment

### Incremental Delivery

1. Deliver US1 (core start/message)
2. Add US2 (idempotent retries)
3. Add US3 (end/state/cleanup)
4. Finish with polish and docs consistency

### Team Parallelization

1. Team aligns on Phase 1–2 together
2. Then split by capability:
   - Dev A: route handlers (`ai/src/routes/conversation.ts`)
   - Dev B: registry/timeouts/idempotency (`ai/src/session-registry.ts`)
   - Dev C: docs/contracts/quickstart updates

---

## Notes

- Every task follows required checklist format with ID and file path.
- Story tasks include required `[US#]` labels.
- `[P]` is used only where no blocking dependency conflict is expected.
- Manual validation scenarios are sourced from `specs/001-http-api-conversations/quickstart.md`.
