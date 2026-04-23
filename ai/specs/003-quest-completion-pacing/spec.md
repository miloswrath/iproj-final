# Feature Specification: Quest Completion and Offer Pacing

**Feature Branch**: `[003-quest-completion-pacing]`  
**Created**: 2026-04-22  
**Status**: Draft  
**Input**: User description: "create new specification based on @feat/quest-complete.md - also add that quest offering comes up too quickly (usually the first or second response) and that this should change to be anywhere from the 3rd to 5th response from the LLM"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record quest outcomes reliably (Priority: P1)

As the game system, I need to report when a quest is completed so NPC and player memory reflects the real outcome immediately.

**Why this priority**: Quest completion is a core game loop event. If outcomes are not captured reliably, relationship progression and future NPC behavior become inconsistent.

**Independent Test**: Can be fully tested by submitting quest completion events for success, failure, and abandonment and verifying the memory state updates correctly for each outcome.

**Acceptance Scenarios**:

1. **Given** a quest completion event marked as success, **When** the system processes it, **Then** the NPC memory reflects a recent success and quest progression advances by one level.
2. **Given** a quest completion event marked as failure or abandoned, **When** the system processes it, **Then** NPC and player profile values shift in the negative direction and quest progression does not advance.
3. **Given** a successful quest completion where reward delivery did not happen, **When** the event is processed, **Then** the NPC memory records a reward mismatch signal.

---

### User Story 2 - Preserve outcomes when delivery fails (Priority: P2)

As the game system, I need failed delivery attempts to be retried correctly so quest completion outcomes are not lost during temporary outages.

**Why this priority**: Reliability is required for progression integrity. Lost completion notifications can permanently desynchronize game state and NPC memory.

**Independent Test**: Can be tested by simulating transient delivery failures and confirming pending notifications are retried and routed to the correct quest event type.

**Acceptance Scenarios**:

1. **Given** delivery fails due to a transient server or network error, **When** the system queues the event for retry, **Then** the queued record keeps enough type information to replay it correctly.
2. **Given** delivery fails due to a permanent client-side error, **When** the system handles the response, **Then** it logs the failure and does not retry indefinitely.

---

### User Story 3 - Delay quest offers to a natural point (Priority: P1)

As a player, I want quest offers to appear after some conversational buildup so interactions feel less abrupt and more believable.

**Why this priority**: Early quest offers (first or second assistant response) reduce narrative quality and perceived character depth.

**Independent Test**: Can be tested by running conversations from start and verifying the first quest offer appears no earlier than the 3rd and no later than the 5th assistant response when an offer is made.

**Acceptance Scenarios**:

1. **Given** a new conversation where a quest is eligible to be offered, **When** the assistant produces responses, **Then** the first quest offer cannot appear in response 1 or 2.
2. **Given** a conversation where quest offering is active, **When** an offer is made, **Then** it appears in response 3, 4, or 5.
3. **Given** a conversation that ends early or remains unsuitable for an offer, **When** no offer is made, **Then** the system does not force an offer outside normal conversational logic.

---

### Edge Cases

- What happens when duplicate completion events are received for the same quest outcome in quick succession?
- How does the system handle a completion event for an unknown character or a quest that is not currently active?
- What happens when success is reported but reward status is missing or contradictory?
- How does the system behave if conversation length is shorter than three assistant responses (for example, player exits immediately)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept quest completion events that include character identity, quest identity, outcome status, relationship snapshot, player state snapshot, and reward receipt status.
- **FR-002**: The system MUST update character memory flags to reflect recent success, recent failure, and reward mismatch state based on the reported quest outcome.
- **FR-003**: The system MUST increase quest progression level by exactly one when outcome is success and MUST NOT decrease progression on failure or abandonment.
- **FR-004**: The system MUST append a concise quest-outcome memory entry to the character memory timeline and enforce the configured cap on retained entries.
- **FR-005**: The system MUST update player profile trend values after completion events, with positive movement on success and negative movement on failure or abandonment, while respecting valid value ranges.
- **FR-006**: The system MUST classify delivery failures into retryable and non-retryable outcomes and queue retryable quest notifications for later delivery.
- **FR-007**: The system MUST include an explicit event type marker in queued notifications so replay routing is correct for different quest notification categories.
- **FR-008**: The system MUST prevent the first quest offer from appearing in the first or second assistant response of a conversation.
- **FR-009**: When a quest offer is made, the system MUST constrain first-offer timing to assistant response 3, 4, or 5.
- **FR-010**: The system MUST allow conversations to end without a quest offer when the conversation terminates before the valid offer window or when offering conditions are not met.
- **FR-011**: The system MUST ignore or safely de-duplicate repeated completion events so memory is not double-updated for the same completion outcome.

### Key Entities *(include if feature involves data)*

- **Quest Completion Event**: A structured record indicating that a specific character quest ended with a specific outcome and reward status.
- **Character Memory Record**: Per-character relationship and progression state updated after quest resolution.
- **Player Profile Record**: Global player tendency and emotional trend state adjusted by quest outcomes.
- **Pending Notification Record**: A persisted retry item containing event payload, event type, and retry metadata for reliable replay.
- **Conversation Turn Counter**: The assistant-response position used to determine when quest offering becomes eligible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of valid quest completion events update both character memory and player profile in a single processing pass.
- **SC-002**: 99% of retryable quest notifications are successfully delivered within 5 minutes after transient failure recovery.
- **SC-003**: In conversation test runs where a quest offer occurs, 100% of first offers appear on assistant response 3, 4, or 5.
- **SC-004**: Early-offer violations (offer on response 1 or 2) occur in 0% of validated test conversations.
- **SC-005**: At least 90% of playtest participants report that quest introduction pacing feels natural or better.

## Assumptions

- Quest completion outcomes are supplied by the authoritative game system and should be treated as the source of truth.
- Existing memory schemas already contain the fields required for success/failure/reward-mismatch and progression tracking.
- A single quest completion event corresponds to one resolved quest outcome for one character.
- Conversation pacing counts assistant responses within a conversation session and resets when a new session starts.
- The system already has a persistent pending-notification mechanism that this feature extends with event-type routing.
