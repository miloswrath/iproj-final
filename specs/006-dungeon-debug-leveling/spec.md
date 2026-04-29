# Feature Specification: Dungeon Debug Tools and Global Leveling

**Feature Branch**: `006-dungeon-debug-leveling`  
**Created**: 2026-04-29  
**Status**: Draft  
**Input**: User description: "initialize new feature spec from @docs/feat/FEATURE-NPC_3.md make sure feature branch is off of 005-* and not main"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fast Dungeon Debug Progression (Priority: P1)

As a developer or playtester, I can use temporary debug controls in a dungeon run to instantly clear enemies, open all chests, or move to the next floor so I can quickly test progression-dependent behavior without replaying full encounters.

**Why this priority**: This directly accelerates development and testing speed for dungeon features and reduces repetitive manual play.

**Independent Test**: Start a dungeon floor with enemies and unopened chests, use each debug action one at a time, and verify each action produces its intended floor-wide outcome immediately.

**Acceptance Scenarios**:

1. **Given** the player is on an active dungeon floor with living enemies, **When** the "kill all enemies" debug action is triggered, **Then** all enemies on the current floor are defeated and combat blocking conditions are removed.
2. **Given** the player is on an active dungeon floor with unopened chests, **When** the "open all chests" debug action is triggered, **Then** all eligible chests on the current floor are opened and rewards become available using existing chest reward rules.
3. **Given** the player is on any active dungeon floor, **When** the "skip to next floor" debug action is triggered, **Then** the current floor is completed and the player is moved to the next floor state.

---

### User Story 2 - Persistent Global Character Progression (Priority: P2)

As a returning player, I have a global character level stored in my persistent profile that increases when I complete quests so my long-term progress carries across sessions.

**Why this priority**: Persistent progression creates continuity and supports future progression-based feature design.

**Independent Test**: Complete a quest, end the session, reopen profile state, and verify the global level has increased and remains increased.

**Acceptance Scenarios**:

1. **Given** a player profile with a current global level value, **When** the player completes one quest, **Then** the global character level increases by exactly 1.
2. **Given** a player completes multiple quests across separate sessions, **When** profile data is reloaded, **Then** the global character level reflects all completed quest-based increases.

---

### User Story 3 - Stable Progression Data for Existing Players (Priority: P3)

As an existing player with older profile data, I can continue playing without errors even if my profile was created before global leveling existed.

**Why this priority**: Backward compatibility avoids profile corruption and protects current player data.

**Independent Test**: Load a profile that does not yet contain a global level, complete a quest, and verify the profile is upgraded with a valid level and no data loss.

**Acceptance Scenarios**:

1. **Given** a legacy player profile without a global level field, **When** the profile is loaded, **Then** a valid default global level is assigned.
2. **Given** a legacy player profile is upgraded with a default level, **When** the player completes a quest, **Then** the global level increments correctly and persists.

### Edge Cases

- What happens when a debug action is triggered while the player is not currently on a valid dungeon floor? The action should fail safely with no state corruption.
- How does the system handle repeated rapid triggering of the same debug action? Repeated triggers should not duplicate rewards or produce invalid floor transitions.
- What happens if global level data is missing, null, or invalid in persistent profile data? The system should recover using a valid default and continue progression updates safely.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide three dungeon debug actions for test use: defeat all enemies on the current floor, open all chests on the current floor, and advance to the next floor.
- **FR-002**: The system MUST apply each debug action only to the player’s current active dungeon floor.
- **FR-003**: The system MUST ensure "open all chests" does not grant duplicate rewards if triggered multiple times on the same already-opened chest.
- **FR-004**: The system MUST ensure "skip to next floor" performs the same progression state updates required for a normal floor completion.
- **FR-005**: The system MUST store a persistent global character level in player profile data.
- **FR-006**: The system MUST increase the global character level by 1 for each quest completion event.
- **FR-007**: The system MUST persist global character level updates so values are retained across sessions.
- **FR-008**: The system MUST support backward compatibility for profiles missing global character level by assigning a default starting level during profile load.
- **FR-009**: The system MUST keep debug actions easy to remove or disable in future cleanup work without changing normal non-debug gameplay behavior.

### Key Entities *(include if feature involves data)*

- **Player Profile**: Persistent player record containing long-term progression attributes, including global character level.
- **Global Character Level**: Numeric progression value representing cumulative quest-completion-based advancement.
- **Dungeon Floor State**: Current floor context containing enemies, chests, and completion/transition status used by debug actions.
- **Quest Completion Event**: The event signaling successful quest completion that triggers level increment logic.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In playtest sessions, testers can trigger each of the three debug actions successfully on demand in 100% of attempted runs.
- **SC-002**: In validation tests, 100% of completed quests increase global character level by exactly one level.
- **SC-003**: In persistence tests across session restarts, 100% of updated global character levels are retained with no regression.
- **SC-004**: In legacy profile migration tests, 100% of profiles missing a global level are upgraded with a valid default and remain playable.

## Assumptions

- Debug actions are intended for development/playtest use and are not treated as player-facing permanent product controls.
- Existing quest completion detection is already available and can be used as the trigger point for global level increases.
- Default starting global character level for profiles without existing data is 1.
- This feature does not define new gameplay effects tied to level values; it only introduces storage and increment behavior.
