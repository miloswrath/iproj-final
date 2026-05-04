# Feature Specification: NPC Friendship Progression

**Feature Branch**: `008-npc-friend-progression`  
**Created**: 2026-05-01  
**Status**: Draft  
**Input**: User description: "create new feature spec off of docs/feat/FEATURE-NPC_4.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Advance an NPC Into Friendship State (Priority: P1)

As a player, I can complete three quests for an NPC and return to them to unlock a friendlier long-term relationship state with updated dialogue, rewards, and stable placement in the world.

**Why this priority**: This is the core progression loop for the feature. Without the friendship transition, the added characters, rewards, and recap systems do not have a meaningful trigger.

**Independent Test**: Can be fully tested by completing three quests from one NPC, returning to that NPC, and confirming the conversation tone, reward delivery, and post-completion placement all reflect the unlocked friendship state.

**Acceptance Scenarios**:

1. **Given** a player has completed fewer than three quests for an NPC, **When** they start another conversation with that NPC, **Then** the NPC remains in the standard pre-friendship relationship state.
2. **Given** a player has completed exactly three quests for an NPC, **When** they return and begin the next conversation, **Then** the NPC acknowledges the friendship in a way that matches that character's personality.
3. **Given** an NPC has entered friendship state, **When** the player requests another quest, **Then** the NPC can still offer quests while using friendlier relationship framing.
4. **Given** an NPC has entered friendship state, **When** the friendship transition is granted, **Then** the player receives loot from that NPC's configurable reward pool.

---

### User Story 2 - Meet the Next Character in the Progression Chain (Priority: P2)

As a player, I can unlock a new character after completing the first NPC's three-quest arc, receive guidance to find them, and begin the same relationship-building workflow with a different archetype in a distinct world location.

**Why this priority**: This expands the system from a one-off NPC relationship into a repeatable character progression loop.

**Independent Test**: Can be fully tested by finishing the first NPC arc, verifying a new character appears at a unique location, following the guidance prompt, and starting a new conversation with the unlocked character.

**Acceptance Scenarios**:

1. **Given** a player completes the first NPC's friendship milestone, **When** progression is processed, **Then** exactly one newly unlocked character becomes available in a distinct map location.
2. **Given** a new character is unlocked, **When** the player returns to exploration, **Then** the game shows a toast or equivalent guidance telling the player to find the new character.
3. **Given** a completed NPC remains in town, **When** the next character spawns, **Then** the characters do not overlap or occupy the same spawn point.
4. **Given** a player reloads the game after a character has been selected or unlocked, **When** the world state is restored, **Then** the currently active character progression state remains unchanged.

---

### User Story 3 - Review Active Friends and Relationship History (Priority: P3)

As a player, I can open a friend-tracking menu after completing an NPC arc to see which characters I have befriended and read short summaries of their quests and conversations.

**Why this priority**: This improves clarity and retention, but depends on the friendship progression itself already functioning.

**Independent Test**: Can be tested by completing one NPC friendship arc, exiting the post-completion conversation, opening the new friend menu, and confirming the befriended character and their summary are listed.

**Acceptance Scenarios**:

1. **Given** a player has not yet befriended any NPCs, **When** they attempt to access the friend-tracking menu, **Then** the menu is unavailable or empty without showing incorrect entries.
2. **Given** a player completes an NPC's third quest and exits the follow-up conversation, **When** the friendship transition finishes, **Then** a short summary of that NPC's quests and conversations is created for later viewing.
3. **Given** a player has one or more active friends, **When** they open the friend-tracking menu, **Then** they can see each active friend with a concise relationship summary.

### Edge Cases

- What happens if the player completes a battle and returns to the overworld before post-battle NPC repositioning finishes? The NPC should appear directly at the intended persistent location rather than briefly spawning at the old quest spawn point first.
- What happens if friendship rewards include both guaranteed and chance-based items but none of the chance-based items are awarded? The player should still receive the guaranteed reward outcome without the progression state failing.
- What happens if all nearby town or unlock spawn points are already occupied? The system should choose the next valid non-overlapping location rather than stacking characters together.
- What happens if a player exits and reloads immediately after unlocking a new character or friend summary? The unlocked character, friendship state, and summary should still be present after reload.
- What happens if the player reopens the same NPC conversation repeatedly after friendship unlock? The NPC should remain in the unlocked relationship state and should not re-grant the one-time friendship reward.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST track quest completions per NPC and recognize when a player reaches the third completed quest for that NPC.
- **FR-002**: The system MUST transition an NPC into a friendship relationship state the first time the player speaks with them after reaching the three-quest milestone.
- **FR-003**: An NPC in friendship state MUST acknowledge the relationship in dialogue that remains consistent with that NPC's archetype.
- **FR-004**: An NPC in friendship state MUST remain able to offer additional quests after the friendship milestone is reached.
- **FR-005**: The system MUST assign each NPC a configurable loot pool that supports both guaranteed rewards and chance-based rewards for the friendship unlock event.
- **FR-006**: The system MUST grant friendship rewards only once per NPC friendship unlock.
- **FR-007**: After an NPC reaches friendship state, that NPC MUST remain at the NPC's designated persistent world location during future visits and after post-battle returns.
- **FR-008**: The system MUST correct the existing duplicate quest-text presentation so quest text appears only once in a consistent style during this workflow.
- **FR-009**: The system MUST correct the existing post-battle NPC repositioning issue so NPCs do not visibly run from the original quest spawn point back to the player after battle completion.
- **FR-010**: Completing the first NPC friendship milestone MUST unlock one new character with a different archetype and a distinct quest set.
- **FR-011**: A newly unlocked character MUST spawn in a unique valid map location that does not overlap completed characters or other active NPCs.
- **FR-012**: The system MUST notify the player when a new character is unlocked and instruct them to find that character.
- **FR-013**: After an NPC friendship arc is completed, the completed NPC MUST remain present in town at a non-overlapping location.
- **FR-014**: The system MUST provide a friend-tracking menu after the player has completed at least one NPC friendship arc.
- **FR-015**: The friend-tracking menu MUST list active friends and display a short summary of each friend's completed quests and recent conversations.
- **FR-016**: The system MUST generate or refresh the friendship summary when the player exits the conversation that follows the third completed quest.
- **FR-017**: The initial character for a new or reset progression run MUST be a valid non-blank character selected from the supported character set.
- **FR-018**: The system MUST persist the currently active character progression state so reloads do not change which character is active or unlocked.
- **FR-019**: The unlocked-character workflow MUST be repeatable so newly introduced characters can progress through the same three-quest-to-friendship loop.

### Key Entities *(include if feature involves data)*

- **NPC Relationship State**: Per-character progression record describing whether the character is in standard quest-giver state or unlocked friendship state.
- **Friendship Reward Pool**: Configurable set of rewards tied to an NPC friendship unlock, including guaranteed rewards and chance-based rewards.
- **Unlocked Character**: A newly available NPC with its own archetype, quest set, location, and progression state.
- **Friend Summary**: Short recap entry containing the character identity plus condensed quest and conversation history shown in the friend-tracking menu.
- **Persistent Character Placement**: Stored world-location assignment ensuring active and completed NPCs appear in stable, non-overlapping positions across exploration, battle returns, and reloads.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In end-to-end playtests, 100% of NPCs transition into friendship state on the first conversation after the third completed quest.
- **SC-002**: In validation sessions, 100% of friendship unlocks grant the configured guaranteed rewards and never grant the one-time friendship reward more than once per NPC.
- **SC-003**: In regression testing, the duplicate quest-text bug and post-battle NPC respawn bug reproduce in 0% of verified runs after release.
- **SC-004**: In progression tests, 100% of first-arc completions unlock exactly one new character in a distinct non-overlapping location and show a find-the-character prompt.
- **SC-005**: In reload tests, 100% of active character selections, unlocked characters, and friend summaries persist correctly across session restarts.
- **SC-006**: In usability playtests, at least 90% of players who have unlocked a friend can open the friend-tracking menu and identify that friend's summary without assistance.

## Assumptions

- The first friendship milestone is reached after exactly three completed quests from the same NPC.
- Friendship rewards are granted at the moment the player returns to speak with the NPC after the third quest, not during battle resolution itself.
- Only one new character is introduced by this feature pass, but the workflow is designed to support additional future characters using the same progression rules.
- The friend-tracking menu can follow the same general interaction pattern as the existing codex-style interface while serving different content.
- Reward balancing, item definitions, and precise chance values are managed through configurable game data and are not fixed by this specification.
