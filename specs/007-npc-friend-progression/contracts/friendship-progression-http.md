# Contract: Friendship Progression HTTP API (Game ↔ AI Bridge)

**Feature**: 007-npc-friend-progression  
**Owner**: `ai/src/server/routes/*`  
**Base**: `http://127.0.0.1:3000/api/v1`

This contract extends the existing quest/codex bridge with friend-roster reads and friendship progression state synchronization.

---

## 1) Existing routes reused by this feature

- `POST /conversation/start`
- `POST /conversation/{sessionId}/message`
- `POST /conversation/{sessionId}/end`
- `GET /quests/codex`
- `POST /quest/complete`

These routes remain valid and are extended only by downstream state effects described below.

---

## 2) GET /friends

Returns the player-facing friend roster for the new friend-tracking menu.

### Response 200

```json
{
  "friends": [
    {
      "npcId": "girl-1-east",
      "displayName": "Girl",
      "archetype": "enabler",
      "friendshipState": "unlocked",
      "summaryText": "She trusts the player now and frames new quests as favors between allies.",
      "questHighlights": [
        "Recovered the shrine keepsake",
        "Cleared the flooded cellar",
        "Proved reliability after the third run"
      ],
      "lastConversationAt": "2026-05-01T20:10:00.000Z",
      "updatedAt": "2026-05-01T20:10:00.000Z"
    }
  ],
  "activeCount": 1,
  "generatedAt": "2026-05-01T20:10:05.000Z"
}
```

### Validation

- `friends` may be empty.
- Every returned entry must have `friendshipState = unlocked`.
- `summaryText` must be non-empty.

---

## 3) GET /friends/active-character

Returns the current active NPC progression state used by game startup and reload restoration.

### Response 200

```json
{
  "activeNpcId": "girl-1-east",
  "starterNpcId": "girl-1-east",
  "unlockedNpcIds": ["girl-1-east", "mirror-1-north"],
  "completedNpcIds": ["girl-1-east"],
  "pendingUnlockNpcId": "mirror-1-north",
  "lastAdvancedAt": "2026-05-01T20:10:00.000Z"
}
```

### Validation

- `activeNpcId` is required after first initialization.
- `pendingUnlockNpcId` may be `null`.

---

## 4) POST /friends/summary/refresh

Requests generation or refresh of a friend summary after the player exits the post-third-quest conversation.

### Request body

```json
{
  "npcId": "girl-1-east",
  "trigger": "post_friendship_conversation_exit",
  "conversationId": "conv_2026_05_01_001"
}
```

### Response 200

```json
{
  "applied": true,
  "summaryId": "friend_girl-1-east_v1",
  "deferred": false
}
```

If summary generation is temporarily unavailable:

```json
{
  "applied": true,
  "summaryId": null,
  "deferred": true
}
```

### Validation

- `npcId` required known NPC key.
- `trigger` currently accepts only `post_friendship_conversation_exit`.
- `deferred=true` must not imply friendship unlock failure.

---

## 5) POST /quest/complete state effect extension

`POST /quest/complete` remains the gameplay completion entry point. For this feature, when the completion increments an NPC to three completed quests, the bridge must persist that NPC as `friendshipState = eligible` until the next conversation open.

### Extended success response

```json
{
  "applied": true,
  "reason": "applied",
  "memorySyncPending": false,
  "friendshipEligible": true
}
```

`friendshipEligible` may be omitted or `false` for non-threshold quest completions.

---

## Error format (all routes)

```json
{
  "error": "machine_code",
  "message": "human readable"
}
```

Common codes:
- `invalid_json`
- `unknown_npc`
- `summary_generation_failed`
- `friend_not_unlocked`
- `session_not_found`
- `lm_studio_unavailable`

---

## Contract tests (minimum)

1. `GET /friends` returns an empty roster before any friendship unlocks.
2. Third quest completion marks `friendshipEligible=true` without yet duplicating rewards.
3. `POST /friends/summary/refresh` can defer summary creation without rolling back unlock state.
4. `GET /friends/active-character` returns stable data across reloads after an unlock.
