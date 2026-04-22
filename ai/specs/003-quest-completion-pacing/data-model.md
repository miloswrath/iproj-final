# Data Model: Quest Completion and Offer Pacing

## Entity: QuestCompletionEvent

**Purpose**: Authoritative event from game-side flow indicating a quest has resolved.

### Fields

- `character` (string, required) — character identifier that owns the quest arc.
- `questId` (string, required) — unique quest identifier.
- `outcome` (enum: `success` | `failure` | `abandoned`, required).
- `playerState.level` (integer >= 1, required).
- `relationshipSnapshot.trust` (number, 0-100, required).
- `relationshipSnapshot.dependency` (number, 0-100, required).
- `relationshipSnapshot.bond` (number, 0-100, required).
- `relationshipSnapshot.wariness` (number, 0-100, required).
- `rewardReceived` (boolean, required).
- `eventTimestamp` (string or number, optional but recommended for idempotency).

### Validation Rules

1. `character` and `questId` must be non-empty strings.
2. `outcome` must match supported enum.
3. Relationship values must be numeric and clamped/validated to configured ranges.
4. Event is rejected or safely ignored if required fields are missing.

---

## Entity: CharacterMemoryRecord (existing, updated)

**Purpose**: Per-character relational and progression memory.

### Updated Fields

- `flags.recentSuccess` (boolean)
- `flags.recentFailure` (boolean)
- `flags.playerNoticedRewardMismatch` (boolean)
- `progression.questLevel` (integer, monotonic non-decreasing)
- `keyMemories` (array of short strings, max 5)

### Update Rules from QuestCompletionEvent

- `success`:
  - `recentSuccess = true`
  - `recentFailure = false`
  - `questLevel += 1`
  - `playerNoticedRewardMismatch = true` only when `rewardReceived = false`
- `failure`:
  - `recentSuccess = false`
  - `recentFailure = true`
  - `questLevel` unchanged
- `abandoned`:
  - `recentSuccess = false`
  - `recentFailure = false` (abandonment tracked via memory summary text)
  - `questLevel` unchanged
- In all outcomes: append one completion summary sentence to `keyMemories`, drop oldest if length exceeds 5.

---

## Entity: PlayerProfileRecord (existing, updated)

**Purpose**: Global player tendency/emotional trend model.

### Updated Fields

- `burnout` (number)
- `hope` (number)
- `traits.riskTolerance` (number)

### Outcome Mapping

- `success`: decrease burnout slightly, increase hope, nudge risk tolerance up.
- `failure`: increase burnout, decrease hope, nudge risk tolerance down.
- `abandoned`: increase burnout, decrease hope, leave risk tolerance unchanged.

All values are clamped to schema bounds after applying nudges.

---

## Entity: PendingNotificationRecord

**Purpose**: Durable retry queue item for outbound game notifications.

### Fields

- `type` (enum: `quest_start` | `quest_complete`, required)
- `payload` (object, required; schema depends on `type`)
- `attemptCount` (integer >= 0, optional)
- `lastAttemptAt` (timestamp, optional)

### Validation Rules

1. `type` is mandatory.
2. `payload` must conform to the associated event schema.
3. Replay routing must dispatch based on `type`, never implicit shape guessing.

---

## Entity: ConversationTurnCounter

**Purpose**: Tracks assistant response position for quest-offer timing gate.

### Fields

- `assistantResponseCount` (integer >= 0)
- `firstQuestOfferTurn` (integer | null)

### State Rules

1. Counter increments after each assistant response added to history.
2. Quest offer detection is disabled when count < 3.
3. First quest offer may be accepted only when count is 3, 4, or 5.
4. If no offer occurs by count > 5, first-offer window is considered closed for that session.

---

## State Transitions

### Quest Completion Processing

1. `Received` -> validate payload.
2. `Validated` -> idempotency check.
3. `New Event` -> apply memory updates (character + profile) -> persist atomically.
4. `Persisted` -> notify success path completion.
5. `Delivery Failure` -> classify retryability -> enqueue typed pending notification if retryable.

### Quest Offer Timing

1. Session starts with `assistantResponseCount = 0`.
2. Each assistant output increments count.
3. Offer eligibility window opens at count = 3.
4. First offer can be set only on counts 3-5.
5. Window closes after count = 5 if no offer.
