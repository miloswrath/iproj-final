# Feature Specification: NPC Asset & Behavior Fixes

**Feature Branch**: `[008-fix-npc-asset-behavior]`  
**Created**: 2026-05-05  
**Status**: Draft  
**Input**: User description: "use @docs/feat/FEATURE-NPC_5.md for new feature spec"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start with a Valid Non-General Character (Priority: P1)

As a player, I start NPC progression with a randomly selected opening archetype that is never the blocked General start, so the first relationship arc begins as intended.

**Why this priority**: If the opening archetype is wrong, the entire NPC progression flow starts in an invalid state and downstream content is less reliable.

**Independent Test**: Can be tested by starting fresh progression runs repeatedly and verifying the first selected archetype is random among eligible starters and never the blocked General archetype.

**Acceptance Scenarios**:

1. **Given** a new or reset NPC progression run, **When** the game selects the starting archetype, **Then** it excludes the General archetype from eligible choices.
2. **Given** multiple new progression runs, **When** the opening archetype is selected, **Then** the selection varies across the eligible non-General pool instead of always choosing one fixed archetype.

---

### User Story 2 - See Correct Character Visuals and Animations (Priority: P2)

As a player, I see each archetype represented by its assigned character identity and full animation set, so character personality and presentation stay consistent.

**Why this priority**: Correct character mapping and animation coverage are required for narrative clarity and visual quality, but they depend on the progression flow already starting correctly.

**Independent Test**: Can be tested by spawning each target archetype and confirming the expected assigned character identity appears with all available movement and interaction animations.

**Acceptance Scenarios**:

1. **Given** the parasite archetype is active, **When** the character appears in-world or in related scenes, **Then** it uses the Countess_Vampire character identity and its available animation set.
2. **Given** the enabler archetype is active, **When** the character appears in-world or in related scenes, **Then** it uses the Converted_Vampire character identity and its available animation set.
3. **Given** the honest_one, mirror, or opportunist archetype is active, **When** the character appears in-world or in related scenes, **Then** each uses its assigned character identity (girl-1, girl-2, girl-3 respectively) with full available animations.

---

### User Story 3 - Force Quest Start for Testing and Maintain Overworld Following (Priority: P3)

As a tester or player, I can use the approved debug phrase to immediately trigger quest activation and then observe that the character correctly follows in the overworld.

**Why this priority**: This improves QA speed and verifies continuity in traversal behavior, but it is lower priority than fixing progression validity and presentation mapping.

**Independent Test**: Can be tested by entering either approved debug phrase during conversation, confirming immediate quest activation assets are prepared, and verifying follow behavior works while moving through the overworld.

**Acceptance Scenarios**:

1. **Given** a conversation is in progress at any stage, **When** the user submits "I will do it" or "i will do it", **Then** quest activation starts immediately without requiring additional dialogue gating.
2. **Given** a debug-triggered quest activation occurs, **When** activation completes, **Then** all required quest assets and setup elements are generated in the required order so the quest can proceed.
3. **Given** a character is expected to follow in overworld exploration, **When** the player moves across walkable space, **Then** the character follows consistently instead of staying behind.

### Edge Cases

- What happens if only one eligible non-General starter archetype is available due to progression constraints? The system should still select that archetype and proceed without falling back to General.
- What happens if a player enters text similar to the debug phrases but with extra punctuation or spacing? Only the two approved exact phrases should trigger immediate quest activation.
- What happens if one assigned character lacks a specific optional animation clip? The system should still present the character with all available required animations and remain playable.
- What happens if follow behavior is interrupted by fast transitions (scene change, battle entry, or teleport)? The character should resume valid follow behavior after the transition completes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST select the initial NPC progression archetype from an eligible random pool that excludes the General archetype.
- **FR-002**: The initial archetype selection MUST remain randomized across the eligible non-General starter pool across repeated fresh runs.
- **FR-003**: The system MUST map the parasite archetype to Countess_Vampire for character presentation.
- **FR-004**: The system MUST map the enabler archetype to Converted_Vampire for character presentation.
- **FR-005**: The system MUST map the honest_one archetype to girl-1 for character presentation.
- **FR-006**: The system MUST map the mirror archetype to girl-2 for character presentation.
- **FR-007**: The system MUST map the opportunist archetype to girl-3 for character presentation.
- **FR-008**: Each mapped character MUST use all required available animations for overworld presence, interaction, and related quest scenes.
- **FR-009**: The system MUST recognize the exact phrase "I will do it" as an immediate debug trigger for quest activation.
- **FR-010**: The system MUST recognize the exact phrase "i will do it" as an immediate debug trigger for quest activation.
- **FR-011**: Debug-triggered quest activation MUST bypass normal dialogue gating and begin activation regardless of current conversation stage.
- **FR-012**: When debug-triggered quest activation begins, the system MUST generate all required quest setup assets in the defined activation order before the quest is considered started.
- **FR-013**: Characters designated to follow the player in the overworld MUST maintain follow behavior during normal movement.
- **FR-014**: Follow behavior MUST recover after common state transitions (including scene transitions and battle return) without requiring a manual reset.

### Key Entities *(include if feature involves data)*

- **Starter Archetype Pool**: Eligible archetype set used for selecting the first NPC progression character, explicitly excluding blocked archetypes.
- **Archetype-to-Character Mapping**: Authoritative mapping between narrative archetypes and assigned character identities used for visual representation.
- **Character Animation Set**: Complete set of available animations required for each assigned character to appear and behave correctly across scenes.
- **Debug Quest Trigger Phrase**: Approved phrase input that immediately initiates quest activation flow for testing.
- **Quest Activation Bundle**: Ordered set of assets and setup state that must be prepared before a triggered quest is considered active.
- **Overworld Follow State**: Runtime relationship state describing whether and how a character tracks player movement through exploration spaces.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100 consecutive fresh-run validation attempts, 0 runs begin with the General archetype.
- **SC-002**: In archetype mapping validation, 100% of targeted archetypes display their assigned character identity correctly.
- **SC-003**: In animation coverage tests, 100% of mapped characters can perform all required available animations used in exploration and interaction flows.
- **SC-004**: In debug-trigger tests, both approved phrases initiate quest activation successfully in 100% of attempts from mixed conversation states.
- **SC-005**: In quest-start readiness checks, 100% of debug-triggered activations produce a playable quest state with required setup completed before player control resumes.
- **SC-006**: In overworld traversal regression tests, follower characters remain actively following or recover follow behavior after transitions in at least 95% of test runs without manual intervention.

## Assumptions

- The General archetype is intentionally blocked only from initial progression selection and may still exist in other non-start contexts.
- The listed archetype-to-character mappings are fixed requirements for this feature release.
- "All required available animations" means every animation currently defined as mandatory for normal exploration and interaction behavior for that character.
- The debug trigger phrases are intended for testing workflows and are expected to be available in environments where debug behavior is permitted.
- Follow behavior expectations apply to characters already designated by game rules to follow the player; this feature does not redefine which characters are followers.
