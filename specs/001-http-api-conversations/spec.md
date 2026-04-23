# Feature Specification: HTTP API Conversation Service

**Feature Branch**: `[001-http-api-conversations]`  
**Created**: 2026-04-23  
**Status**: Draft  
**Input**: User description: "initialize first spec using @ai/feat/feature-HTTP-API.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start and continue a conversation session (Priority: P1)

As a game client, I need to start or resume a conversation by ID and send player messages to receive NPC replies and updated phase so gameplay can continue without terminal-only interaction.

**Why this priority**: This is the core value of the feature; without this flow, no external system can use the AI conversation service.

**Independent Test**: Can be fully tested by starting a conversation with an ID, sending messages, and confirming each response includes NPC reply text and current phase for that same conversation.

**Acceptance Scenarios**:

1. **Given** no active session exists for a conversation ID, **When** the client starts that conversation, **Then** the service returns an active session state for that ID.
2. **Given** an active session exists for a conversation ID, **When** the client starts the same conversation again, **Then** the service returns the same current active state instead of creating a duplicate session.
3. **Given** an active session exists, **When** the client sends a player message, **Then** the service returns one NPC reply and the updated conversation phase.

---

### User Story 2 - Safely retry requests without duplicate effects (Priority: P2)

As a game client, I need message and end calls to be retry-safe so network retries do not duplicate side effects or change outcomes unexpectedly.

**Why this priority**: Integration reliability depends on idempotent behavior during transient failures.

**Independent Test**: Can be tested by sending the same message request and end request multiple times with the same idempotency key and verifying the response stays identical and no duplicate side effects occur.

**Acceptance Scenarios**:

1. **Given** a message request was already processed for a conversation with a specific idempotency key, **When** the same request is retried with the same key, **Then** the service returns the previously produced response.
2. **Given** an end request was already processed for a conversation with a specific idempotency key, **When** the same end request is retried, **Then** the service returns the previously produced termination response.

---

### User Story 3 - End and recover conversation state (Priority: P3)

As a game client, I need to end conversations explicitly and query current conversation state so UI and gameplay can recover from interruptions.

**Why this priority**: Explicit ending and state lookup reduce stuck sessions and support recovery after scene changes or disconnects.

**Independent Test**: Can be tested by ending a conversation, confirming terminated state, and querying state by conversation ID before and after end.

**Acceptance Scenarios**:

1. **Given** an active conversation exists, **When** the client ends the conversation, **Then** the service marks it terminated and returns termination metadata.
2. **Given** a known conversation ID, **When** the client requests current state, **Then** the service returns current phase, status, and latest update time.
3. **Given** an unknown conversation ID, **When** the client requests state or end, **Then** the service returns a not-found error.

### Edge Cases

- What happens when a start request is sent for a conversation ID that already reached termination?
- How does the system handle a message request for a conversation ID that does not exist?
- How does the system respond when the AI generation or intent detection step fails mid-request?
- What happens when inactivity timeout ends a session while the client sends a late message?
- How are duplicate requests handled when a client retries after receiving no response?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose inbound operations for starting a conversation, sending a conversation message, ending a conversation, and retrieving conversation state by ID.
- **FR-002**: The system MUST treat `conversationId` as the unique key for active conversation sessions.
- **FR-003**: The system MUST return the existing active state when a start request is repeated for an already active `conversationId`.
- **FR-004**: The system MUST reject a start request for a `conversationId` that is already terminated and return a state-conflict error.
- **FR-005**: The system MUST process one player message per message request and return exactly one NPC reply plus updated lifecycle phase.
- **FR-006**: The system MUST apply existing quest-offer and acceptance detection behavior to determine lifecycle transitions.
- **FR-007**: The system MUST treat AI-side lifecycle transitions as authoritative for phase progression and return current phase in every relevant response.
- **FR-008**: The system MUST make message processing idempotent by (`conversationId`, `idempotencyKey`) and replay the original response for duplicates.
- **FR-009**: The system MUST make end processing idempotent by (`conversationId`, `idempotencyKey`) and replay the original response for duplicates.
- **FR-010**: The system MUST preserve existing outbound quest-start notification behavior after accepted termination, including retry-queue behavior on transient failures.
- **FR-011**: The system MUST keep chat history scoped to a single conversation session and discard that session history when the conversation ends.
- **FR-012**: The system MUST persist long-term player/character memory across conversations and reuse it for future sessions.
- **FR-013**: The system MUST remove ended conversations from the active session set after termination processing completes.
- **FR-014**: The system MUST retain minimal terminated-session replay data for a limited period to support idempotent duplicate responses.
- **FR-015**: The system MUST automatically terminate inactive active conversations after 10 minutes and record termination reason as `exit`.
- **FR-016**: The system MUST return standardized error responses with machine-readable error code and human-readable message for all non-success outcomes.
- **FR-017**: The system MUST return appropriate error outcomes for invalid request shape, unknown conversation, invalid state transition, unsupported character, and internal processing failure.

### Key Entities *(include if feature involves data)*

- **Conversation Session**: Runtime state for one `conversationId`, including character, player identifier, current lifecycle phase, status, and last updated timestamp.
- **Message Exchange**: A single player input and corresponding NPC reply, with associated phase transition result.
- **Idempotency Record**: Stored mapping from (`conversationId`, `idempotencyKey`) to the previously produced response for retry-safe replay.
- **Termination Record**: Minimal post-end metadata retained temporarily to support duplicate end/message replay behavior.
- **Persistent Memory Profile**: Long-lived player/character memory data reused across separate conversation sessions.
- **Outbound Quest Notification**: Payload emitted after accepted termination to trigger downstream quest transition handling.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of repeated start requests for an already active conversation ID return the same active conversation state without creating duplicate active sessions.
- **SC-002**: 100% of duplicate message requests using the same (`conversationId`, `idempotencyKey`) return the original response with no additional lifecycle side effects.
- **SC-003**: 100% of duplicate end requests using the same (`conversationId`, `idempotencyKey`) return the original termination response with no duplicate termination side effects.
- **SC-004**: At least 95% of valid start, message, end, and state requests complete successfully in under 2 seconds during normal local playtest conditions.
- **SC-005**: 100% of accepted quest terminations produce either a successful quest-start notification or a queued retry record when downstream delivery is temporarily unavailable.
- **SC-006**: 100% of inactive sessions are auto-terminated within 11 minutes of last activity and are no longer listed as active afterward.
- **SC-007**: In integration validation, game client state remains aligned with AI-returned phase transitions in at least 99% of conversation flow checks.

## Assumptions

- The service is intended for trusted local integration and does not require authentication or internet-facing hardening in this feature scope.
- Only one player participates in a single conversation session at a time; shared multiplayer dialogue in one stream is out of scope.
- Existing conversation generation, intent detection, and memory behaviors are reused as-is unless transport adaptation requires minor interface changes.
- Downstream game systems already accept quest-start notifications and can safely handle retried deliveries.
- Character identifiers and supported character set continue to be managed by existing character configuration rules.
- Conversation lifecycle phases remain `ACTIVE`, `ESCALATION`, `DECISION`, and `TERMINATION`.
