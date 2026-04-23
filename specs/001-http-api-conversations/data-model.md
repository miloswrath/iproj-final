# Data Model: HTTP API Conversation Service

**Feature**: 001-http-api-conversations  
**Date**: 2026-04-23

---

## Entities

### ConversationSession

Represents one active conversation keyed by `conversationId`.

| Field | Type | Description |
|-------|------|-------------|
| `conversationId` | string | Unique conversation key provided by game client |
| `playerId` | string | Player identity for memory context |
| `character` | string | Active companion/NPC key |
| `phase` | enum | `ACTIVE` \| `ESCALATION` \| `DECISION` \| `TERMINATION` |
| `status` | enum | `active` \| `terminated` |
| `questOffered` | string \| null | Offered quest identifier when available |
| `terminationReason` | string \| null | `rule` \| `model` \| `simulate` \| `exit` |
| `lastUpdatedAt` | ISO timestamp | Last mutation time for timeout checks |
| `history` | list | Session-scoped dialogue transcript |

---

### MessageRequestRecord

Tracks idempotent response replay for message operations.

| Field | Type | Description |
|-------|------|-------------|
| `conversationId` | string | Parent conversation |
| `idempotencyKey` | string | Caller-provided unique key for one message attempt |
| `requestHash` | string | Canonical hash/signature of request body |
| `responseSnapshot` | object | Previously generated success/error response |
| `createdAt` | ISO timestamp | Time first processed |

---

### EndRequestRecord

Tracks idempotent response replay for end operations.

| Field | Type | Description |
|-------|------|-------------|
| `conversationId` | string | Parent conversation |
| `idempotencyKey` | string | Caller-provided unique key for one end attempt |
| `requestHash` | string | Canonical hash/signature of request body |
| `responseSnapshot` | object | Previously generated termination response |
| `createdAt` | ISO timestamp | Time first processed |

---

### TerminatedReplayRecord

Short-lived metadata used after session removal to replay duplicate calls safely.

| Field | Type | Description |
|-------|------|-------------|
| `conversationId` | string | Recently terminated conversation |
| `status` | string | `terminated` |
| `phase` | string | `TERMINATION` |
| `terminationReason` | string | Final reason |
| `expiresAt` | ISO timestamp | Eviction time (created + 5 minutes) |
| `idempotencySnapshots` | map | Optional saved end/message replay entries |

---

### PersistentMemoryProfile

Long-lived memory persisted across sessions (existing system).

| Field | Type | Description |
|-------|------|-------------|
| `player profile data` | object | Cross-conversation player memory |
| `character memory data` | object | Per-character relationship and prompt summary memory |
| `pending notifications` | list | Retry queue for outbound game notifications |

---

## State Transitions

```text
ConversationSession.phase transitions:

ACTIVE
  -> ESCALATION   when quest offer is detected
  -> TERMINATION  when explicit end or timeout occurs

ESCALATION
  -> DECISION     when player responds to offer
  -> TERMINATION  when explicit end or timeout occurs

DECISION
  -> TERMINATION  when acceptance is detected and pipeline completes
  -> ESCALATION   when conversation continues without acceptance

TERMINATION
  (terminal state)
  -> removed from active session registry
  -> minimal replay metadata retained for TTL
```

---

## Validation Rules

- `conversationId` must be non-empty and unique among active sessions.
- `character` must be within supported character set; unknown character returns unsupported-character error.
- Message/end idempotency keys must be non-empty for idempotent replay behavior.
- Duplicate (`conversationId`, `idempotencyKey`) with mismatched request content must be rejected as invalid retry.
- `lastUpdatedAt` must refresh on every successful conversation mutation.
- Inactive active sessions older than 10 minutes must be auto-terminated with reason `exit`.
- Chat history for a conversation must be discarded after termination pipeline completes.
- Persistent memory files under `memory/` must not be deleted during session cleanup.

---

## Relationships

```text
ConversationRegistry
  ├── Active ConversationSession (by conversationId)
  ├── MessageRequestRecord map (by conversationId + idempotencyKey)
  ├── EndRequestRecord map (by conversationId + idempotencyKey)
  └── TerminatedReplayRecord map (TTL-evicted)

ConversationSession
  ├── uses existing lifecycle detector and pipeline
  ├── reads/writes PersistentMemoryProfile through existing memory modules
  └── emits Outbound Quest Notification on accepted termination
```
