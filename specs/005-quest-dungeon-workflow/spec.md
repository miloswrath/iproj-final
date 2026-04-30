# Feature Specification: Quest Dungeon Workflow

**Feature Branch**: `[005-quest-dungeon-workflow]`  
**Created**: 2026-04-28  
**Status**: Active  
**Input**: User description: "Initialize new feature spec using @docs/feat/FEATURE-NPC_2.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start and Track a Quest Run (Priority: P1)

As a player, I can accept a quest from an NPC conversation and enter a single quest portal that takes me through a three-floor dungeon run with clear progression and completion rules.

**Why this priority**: This is the core gameplay loop for quest content and must work before any lore or polish features deliver value.

**Independent Test**: Can be fully tested by accepting a quest, entering the quest portal, clearing three floors by defeating all enemies and looting all chests, and confirming progression portals open correctly.

**Acceptance Scenarios**:

1. **Given** a player has accepted a quest, **When** they enter the quest portal, **Then** they are placed on floor 1 of a quest dungeon run.
2. **Given** the player is on a dungeon floor, **When** all enemies are defeated and all chests are looted, **Then** a portal opens to the next floor (or exit after floor 3).
3. **Given** the player completes floor 3, **When** completion conditions are met, **Then** an exit portal appears and the quest is marked complete.

---

### User Story 2 - Preserve Quest Narrative Context (Priority: P2)

As a player, I receive a unique quest/dungeon title generated from my conversation (with optional lore text), and future conversations reflect completed quests and prior context.

**Why this priority**: Narrative continuity is a key differentiator of the NPC experience and supports replay value.

**Independent Test**: Can be fully tested by completing a quest, starting a new conversation with the same NPC, and verifying prior quest completion and topic continuity are referenced.

**Acceptance Scenarios**:

1. **Given** a quest is accepted from an NPC conversation, **When** the quest is created, **Then** the system generates a unique quest title based on the conversation.
2. **Given** quest generation includes optional lore, **When** the quest is saved, **Then** the lore is associated with that quest and available for later viewing.
3. **Given** a player has completed one or more quests, **When** they converse with the NPC again, **Then** the conversation context includes relevant prior quest outcomes.

---

### User Story 3 - Review Lore and Receive Completion Feedback (Priority: P3)

As a player, I can review current and previous quest lore in a codex-style view and receive clear quest completion feedback and companion behavior during quest setup.

**Why this priority**: This improves usability and immersion but depends on the core quest workflow already functioning.

**Independent Test**: Can be tested by generating multiple quests, opening the lore UI, confirming entries appear in chronological history, observing completion toast notifications, and confirming NPC follow behavior after quest generation.

**Acceptance Scenarios**:

1. **Given** the player has active or completed quests, **When** they open the lore codex, **Then** they can see the current quest and previous quest entries.
2. **Given** a quest is completed, **When** completion is processed, **Then** a completion toast is shown to the player.
3. **Given** a quest has just been generated, **When** the player moves through the world, **Then** the AI companion follows at a close, consistent distance.
4. **Given** a player ends and restarts NPC conversation sessions, **When** they converse repeatedly, **Then** additional conversations continue without requiring an application restart.

### Edge Cases

- What happens when two quests would generate the same title from similar conversations? The system must enforce unique quest titles by adjusting the generated name.
- How does system handle floor completion if an enemy is unreachable or a chest cannot be opened? The player must receive a clear recovery path (e.g., reset floor state or re-trigger objective checks) without blocking quest completion permanently.
- What happens if memory update fails at quest completion? Quest completion remains recorded for gameplay progression and memory sync is retried without player data loss.
- What happens if a player leaves mid-run and returns later? Progress for cleared floors and current floor objectives remains accurate and resumable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow players to accept a quest from NPC conversation and create a corresponding dungeon run.
- **FR-002**: System MUST generate a unique quest/dungeon title from the quest conversation at acceptance time.
- **FR-003**: System MUST support optional quest lore text derived from the conversation and associate it with the quest record.
- **FR-004**: System MUST route each accepted quest through the existing single quest portal using the quest title for presentation.
- **FR-005**: System MUST structure each quest run into exactly three dungeon floors selected from the available map pool.
- **FR-006**: System MUST mark a floor complete only when all floor enemies are defeated and all floor chests are looted.
- **FR-007**: System MUST open a progression portal after floor completion, leading to the next floor for floors 1-2 and to the overworld exit after floor 3.
- **FR-008**: System MUST mark the quest complete when floor 3 completion conditions are met and the player reaches completion state.
- **FR-009**: System MUST update long-term NPC memory with quest completion outcomes so future conversations can reference completed quests.
- **FR-010**: System MUST persist sufficient conversation context to keep follow-up NPC conversations on the same topic unless the player intentionally changes topic.
- **FR-011**: System MUST provide a lore codex interface showing the current quest and previously completed quest entries.
- **FR-012**: System MUST display a quest completion toast notification when a quest transitions to completed.
- **FR-013**: System MUST make the AI companion follow the player after quest generation at a speed/distance profile that keeps the companion close during normal traversal.
- **FR-014**: System MUST allow repeated conversations with the same AI NPC without requiring client restart between sessions.

### Key Entities *(include if feature involves data)*

- **Quest**: A player-accepted objective set containing unique title, optional lore, source conversation reference, status, and completion outcome.
- **Dungeon Run**: A three-floor progression instance linked to a quest, with floor order, per-floor objective state, and completion state.
- **Floor Objective State**: Per-floor record of enemy-clear and chest-loot requirements used to determine portal unlock.
- **Lore Entry**: Codex-viewable narrative record for active or completed quests, including title, summary text, and timeline metadata.
- **Conversation Memory Context**: Persisted NPC memory and recent conversational context used to keep future conversations coherent and reference quest history.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of accepted quests successfully generate a unique quest title and become enterable through the quest portal without manual correction.
- **SC-002**: 95% of quest runs are completed end-to-end through all three floors without progression blockers.
- **SC-003**: 100% of verified quest completions produce visible completion feedback to the player within 2 seconds of completion state.
- **SC-004**: In playtests, at least 90% of players can locate and review both current and prior quest lore entries without assistance.
- **SC-005**: In repeat-conversation tests, at least 90% of follow-up conversations correctly reference relevant prior quest outcomes.
- **SC-006**: The repeated-conversation restart bug reproduces in 0% of regression test sessions after release.

## Assumptions

- Players can have one active dungeon quest run at a time through the existing single quest portal.
- The map pool already contains enough dungeon maps to support three-floor runs without creating new map assets in this feature.
- Quest lore generation is optional per quest and absence of lore does not block quest creation or completion.
- Standard user-facing failure handling is acceptable for temporary memory-sync issues, provided gameplay progression remains intact.
- Companion follow behavior is evaluated during normal player traversal, not extreme movement/exploit scenarios.
