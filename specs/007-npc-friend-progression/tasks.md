# Tasks: NPC Friendship Progression

**Input**: Design documents from `/specs/007-npc-friend-progression/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Include AI bridge automated coverage for route/state changes and run the manual browser validation flow from `specs/007-npc-friend-progression/quickstart.md`.

**Organization**: Tasks are grouped by user story so each increment can be implemented, verified, and demoed independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the feature scaffolding that both the AI bridge and Phaser runtime will extend.

- [X] T001 Create friendship progression helper scaffolding in `ai/src/memory/friendship.ts`
- [X] T002 Create friend roster route scaffolding in `ai/src/server/routes/friends.ts` and register it in `ai/src/server/http.ts`
- [X] T003 [P] Create friend-roster overlay scaffolding in `game/src/game/ui/FriendRosterOverlay.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared state, contracts, and runtime plumbing required by every story.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T004 Extend friendship/progression type definitions in `ai/src/types.ts`
- [X] T005 Implement persistent NPC friendship record read/write helpers in `ai/src/memory/store.ts` and `ai/src/memory/friendship.ts`
- [X] T006 [P] Extend progression update plumbing for per-NPC quest completion counts in `ai/src/memory/updater.ts`
- [X] T007 [P] Add active-character, unlocked-roster, placement, and post-battle return state persistence in `game/src/game/playtestProgression.js`
- [X] T008 [P] Add friend and active-character API client helpers in `game/src/game/services/questRunClient.js`
- [X] T009 Wire friendship-related bridge and game events through `ai/src/server/eventBus.ts`, `ai/src/server/routes/questNotifications.ts`, and `game/src/game/services/questEvents.js`

**Checkpoint**: Shared persistence and runtime plumbing are ready for story work.

---

## Phase 3: User Story 1 - Advance an NPC Into Friendship State (Priority: P1) 🎯 MVP

**Goal**: Let a player complete three quests for one NPC, unlock friendship on the next conversation, grant one-time rewards, and keep the NPC in stable post-friendship state.

**Independent Test**: Complete three quests for one NPC, reopen conversation, and verify friendlier dialogue, one-time loot, single-render quest text, and stable persistent placement after the post-battle return.

### Tests for User Story 1

- [X] T010 [P] [US1] Add quest-threshold route coverage for `friendshipEligible` transitions in `ai/tests/server/quest-complete-route.test.ts`
- [X] T011 [P] [US1] Add integration coverage for one-time friendship reward and unlock persistence in `ai/tests/integration/quest-complete-pipeline.integration.test.ts`
- [X] T012 [P] [US1] Add conversation-route coverage for first post-threshold friendship promotion in `ai/tests/server/conversation-routes.test.ts`

### Implementation for User Story 1

- [X] T013 [P] [US1] Add friendship state fields and reward-pool metadata to NPC records in `ai/src/memory/friendship.ts` and `ai/src/types.ts`
- [X] T014 [US1] Mark third-quest completions as `eligible` in `ai/src/server/routes/questCompletion.ts` and `ai/src/memory/updater.ts`
- [X] T015 [US1] Implement post-threshold friendship promotion, archetype-aware acknowledgement, and one-time reward grant in `ai/src/server/routes/conversation.ts` and `ai/src/memory/friendship.ts`
- [X] T016 [US1] Persist guaranteed and chance-based friendship reward results into runtime inventory/state in `game/src/game/playtestProgression.js` and `game/src/game/services/questRunClient.js`
- [ ] T017 [US1] Consolidate quest text rendering to a single display path in `game/src/game/ui/ConversationOverlay.js`
- [ ] T018 [US1] Carry resolved post-battle NPC return placement directly through `game/src/game/scenes/CombatScene.js`, `game/src/game/scenes/DungeonScene.js`, and `game/src/game/scenes/OverworldScene.js`

**Checkpoint**: User Story 1 should now deliver the complete friendship unlock loop for a single NPC.

---

## Phase 4: User Story 2 - Meet the Next Character in the Progression Chain (Priority: P2)

**Goal**: Unlock the next NPC after the first friendship milestone, place both NPCs at distinct stable locations, and preserve the active character across reloads.

**Independent Test**: Finish the first NPC friendship arc, return to exploration, verify one new NPC appears at a unique location with unlock guidance, and confirm a reload keeps the same active/unlocked state.

### Tests for User Story 2

- [ ] T019 [P] [US2] Add route coverage for stable active-character payloads in `ai/tests/server/conversation-routes.test.ts` and `ai/tests/server/events-sse.test.ts`
- [ ] T020 [P] [US2] Add integration coverage for reload-stable active and unlocked NPC state in `ai/tests/integration/quest-complete-idempotency.integration.test.ts`

### Implementation for User Story 2

- [X] T021 [P] [US2] Add starter/unlock roster, archetype progression, and friendship loot configuration in `game/src/game/npc/npcConfig.js`
- [X] T022 [P] [US2] Define deterministic active, unlocked, and completed NPC anchor pools in `game/src/game/overworld/overworldLayout.js`
- [X] T023 [US2] Implement active-character advancement, pending unlock state, and non-overlapping placement assignment in `game/src/game/playtestProgression.js`
- [X] T024 [US2] Expose active-character progression reads in `ai/src/server/routes/friends.ts` and `ai/src/server/http.ts`
- [X] T025 [US2] Refresh overworld spawning and completed-NPC placement logic in `game/src/game/scenes/OverworldScene.js`
- [X] T026 [US2] Trigger unlock guidance and friend-unlock toast flow from `game/src/game/scenes/DungeonScene.js`, `game/src/game/services/questEvents.js`, and `game/src/game/ui/QuestToast.js`

**Checkpoint**: User Stories 1 and 2 both work, and the friendship loop now advances into a second character.

---

## Phase 5: User Story 3 - Review Active Friends and Relationship History (Priority: P3)

**Goal**: Provide a friend-tracking menu with concise summaries of befriended NPCs that updates after the post-friendship conversation.

**Independent Test**: Complete one friendship arc, exit the follow-up conversation, open the friend menu, and confirm the unlocked friend and summary appear without requiring a reload.

### Tests for User Story 3

- [X] T027 [P] [US3] Add contract coverage for `GET /friends` and `GET /friends/active-character` in `ai/tests/contract/friend-roster.contract.test.ts`
- [ ] T028 [P] [US3] Add route coverage for deferred summary refresh handling in `ai/tests/server/conversation-routes.test.ts`

### Implementation for User Story 3

- [ ] T029 [P] [US3] Implement friend summary generation and deferred refresh handling in `ai/src/memory/friendship.ts` and `ai/src/memory/summarizer.ts`
- [X] T030 [US3] Implement `GET /friends`, `GET /friends/active-character`, and `POST /friends/summary/refresh` in `ai/src/server/routes/friends.ts`
- [ ] T031 [US3] Trigger summary refresh on post-friendship conversation exit in `ai/src/server/routes/conversation.ts`
- [X] T032 [US3] Implement roster caching and summary refresh handling in `game/src/game/services/questRunClient.js` and `game/src/game/services/questEvents.js`
- [X] T033 [US3] Build the friend-tracking UI and empty state in `game/src/game/ui/FriendRosterOverlay.js`
- [X] T034 [US3] Add friend-menu entry, open/close flow, and roster refresh hooks in `game/src/game/scenes/OverworldScene.js`

**Checkpoint**: All user stories are independently functional, including the friend-tracking menu and summary lifecycle.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and cross-story regression protection.

- [ ] T035 [P] Add regression coverage for friend-roster schema validation and duplicate NPC rejection in `ai/tests/contract/friend-roster.contract.test.ts`
- [ ] T036 [P] Document the friendship progression validation flow in `specs/007-npc-friend-progression/quickstart.md`
- [ ] T037 Run full feature verification with `npm test` and `npm run lint` from `/home/zak/school/sp26/cs/final`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup**: No dependencies.
- **Phase 2: Foundational**: Depends on Phase 1 and blocks all story implementation.
- **Phase 3: User Story 1**: Depends on Phase 2 and is the MVP release slice.
- **Phase 4: User Story 2**: Depends on Phase 2 and builds on US1 progression events and state.
- **Phase 5: User Story 3**: Depends on Phase 2 and uses unlock state created by US1; it can begin after the shared friend routes and summary plumbing exist.
- **Phase 6: Polish**: Depends on all targeted user stories being complete.

### User Story Dependencies

- **US1**: No dependency on other user stories after foundational work.
- **US2**: Depends on US1 completing friendship unlocks because the next NPC is unlocked by the first completed arc.
- **US3**: Depends on US1 creating at least one unlocked friend; it can be implemented after foundational work but can only be fully validated once US1 works.

### Within Each User Story

- Tests should be added before or alongside implementation and should fail before the corresponding feature logic is completed.
- AI bridge state changes should land before Phaser runtime consumers that depend on the new payloads.
- Persistent progression updates should land before UI flows that surface them.

### Parallel Opportunities

- `T003`, `T006`, `T007`, and `T008` can run in parallel after the initial setup starts.
- In US1, `T010`, `T011`, and `T012` can run together, and `T013` can proceed in parallel with the test additions.
- In US2, `T021` and `T022` can run together before `T023` ties configuration into persistent placement logic.
- In US3, `T027`, `T028`, and `T029` can run together before the route and UI integration tasks.

---

## Parallel Example: User Story 1

```bash
Task: "Add quest-threshold route coverage for friendshipEligible transitions in ai/tests/server/quest-complete-route.test.ts"
Task: "Add integration coverage for one-time friendship reward and unlock persistence in ai/tests/integration/quest-complete-pipeline.integration.test.ts"
Task: "Add conversation-route coverage for first post-threshold friendship promotion in ai/tests/server/conversation-routes.test.ts"
Task: "Add friendship state fields and reward-pool metadata to NPC records in ai/src/memory/friendship.ts and ai/src/types.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Add starter/unlock roster, archetype progression, and friendship loot configuration in game/src/game/npc/npcConfig.js"
Task: "Define deterministic active, unlocked, and completed NPC anchor pools in game/src/game/overworld/overworldLayout.js"
```

## Parallel Example: User Story 3

```bash
Task: "Add contract coverage for GET /friends and GET /friends/active-character in ai/tests/contract/friend-roster.contract.test.ts"
Task: "Add route coverage for deferred summary refresh handling in ai/tests/server/conversation-routes.test.ts"
Task: "Implement friend summary generation and deferred refresh handling in ai/src/memory/friendship.ts and ai/src/memory/summarizer.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 to make the friendship unlock loop work for one NPC.
3. Run the quickstart validation for the third-quest return flow before expanding scope.

### Incremental Delivery

1. Finish shared persistence and API/runtime plumbing.
2. Ship US1 for a complete single-NPC friendship loop.
3. Add US2 to unlock and place the next NPC without destabilizing US1.
4. Add US3 to surface summaries and the friend roster menu on top of the stable unlock state.

### Suggested MVP Scope

- **MVP**: Phase 1, Phase 2, and Phase 3 (User Story 1 only).
