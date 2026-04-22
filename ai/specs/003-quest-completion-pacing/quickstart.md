# Quickstart: Quest Completion and Offer Pacing

## Prerequisites

- Run from: `/home/zak/school/sp26/cs/final/ai`
- LM Studio server available at localhost for dialogue flow.
- Local game API stub available for `/quest/start` and `/quest/complete` endpoint testing.

## 1) Start the AI runtime

```bash
npm run dev
```

## 2) Validate quest-offer pacing window (3-5)

1. Start a fresh conversation session.
2. Send player inputs that normally trigger early offer behavior.
3. Observe assistant response numbers and quest offer detection logs.

**Expected results**:
- No first quest offer on assistant response 1 or 2.
- If first offer occurs, it appears on response 3, 4, or 5.
- If conversation exits early, no forced offer appears.

## 3) Validate quest completion outcome handling

1. Submit a completion event with `outcome=success` and `rewardReceived=false`.
2. Submit another with `outcome=failure`.
3. Submit another with `outcome=abandoned`.

**Expected results**:
- Character flags and quest level update according to outcome mapping.
- Reward mismatch flag is set on success-without-reward cases.
- Player profile trend values move and remain clamped.
- Key memories append and remain capped.

## 4) Validate retry queue type routing

1. Force temporary failure from the game API (simulate 5xx or disconnect).
2. Trigger both quest-start and quest-complete notifications.
3. Inspect `memory/pending-notifications.json`.
4. Restore API and trigger retry pass.

**Expected results**:
- Queue records include `type`.
- Retry sends each record to matching endpoint.
- Successful retries are removed from queue.

## 5) Validate duplicate completion protection

1. Send the same completion event twice.
2. Verify memory files for duplicate side effects.

**Expected results**:
- No double quest-level increment.
- No duplicate completion memory entry for same event identity.
