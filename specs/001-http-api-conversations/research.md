# Research: HTTP API Conversation Service

**Feature**: 001-http-api-conversations  
**Date**: 2026-04-23

---

## Decision 1: HTTP Runtime Transport Strategy

**Decision**: Implement a lightweight localhost HTTP server inside `ai/` and route requests into existing conversation/lifecycle modules.

**Rationale**: The project already has a stable conversation engine and lifecycle pipeline. Adding a thin HTTP layer enables game integration quickly while minimizing behavior drift.

**Alternatives considered**:
- **Rewrite runtime as API-first architecture**: Rejected for v1 due to high migration risk and unnecessary scope.
- **Continue terminal-only orchestration**: Rejected because game cannot reliably call AI service.

---

## Decision 2: Session Ownership and State Authority

**Decision**: AI service owns conversation state transitions (`ACTIVE -> ESCALATION -> DECISION -> TERMINATION`) and exposes state to clients.

**Rationale**: Existing lifecycle and acceptance detection are already AI-side; maintaining a single authority prevents state divergence between game and AI.

**Alternatives considered**:
- **Game-authoritative phases**: Rejected because it duplicates lifecycle logic and increases mismatch risk.
- **Shared authority**: Rejected because conflict resolution becomes ambiguous.

---

## Decision 3: Idempotency Model

**Decision**: Use operation-scoped idempotency keys with per-conversation replay records:
- Start idempotent by `conversationId`
- Message idempotent by (`conversationId`, `idempotencyKey`)
- End idempotent by (`conversationId`, `idempotencyKey`)

**Rationale**: This aligns with retry-safe HTTP client behavior and ensures duplicate requests return the exact prior result without re-triggering side effects.

**Alternatives considered**:
- **Global idempotency keys**: Rejected due to collision risk across sessions.
- **No idempotency, rely on client retries only**: Rejected; duplicates would corrupt history and lifecycle side effects.

---

## Decision 4: Ended Session Cleanup and Replay Retention

**Decision**: Remove terminated sessions from active registry immediately after termination pipeline completion and keep minimal replay metadata for 5 minutes.

**Rationale**: Immediate active cleanup prevents stale-state growth; short replay retention preserves idempotent duplicate handling after network uncertainty.

**Alternatives considered**:
- **Keep terminated sessions indefinitely**: Rejected due to memory growth and stale-state complexity.
- **Drop all termination metadata immediately**: Rejected because duplicate retries would no longer be safely replayable.

---

## Decision 5: Inactivity Timeout Behavior

**Decision**: Auto-end inactive active sessions after 10 minutes with reason `exit`.

**Rationale**: Prevents orphaned sessions and aligns with explicit scope requirements for bounded runtime state.

**Alternatives considered**:
- **No timeout**: Rejected because abandoned sessions would accumulate.
- **Very short timeout (<2 min)**: Rejected because it risks terminating valid gameplay conversations.

---

## Decision 6: Error Response Contract

**Decision**: Standardize all non-2xx responses to a uniform error payload containing machine code and human-readable message.

**Rationale**: Clients can handle errors consistently, regardless of endpoint.

**Alternatives considered**:
- **Endpoint-specific error formats**: Rejected due to inconsistent client handling.
- **Message-only errors without code**: Rejected because client automation and retries need stable codes.
