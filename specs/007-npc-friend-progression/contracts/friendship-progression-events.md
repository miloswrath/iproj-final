# Contract: Friendship Progression Runtime Events

**Feature**: 007-npc-friend-progression  
**Producer**: `ai/src/server/eventBus.ts`, `ai/src/server/routes/questNotifications.ts`, game runtime progression handlers  
**Consumers**: `game/src/game/services/questEvents.js`, `game/src/game/scenes/OverworldScene.js`, `game/src/game/ui/*`

This contract documents the loopback and SSE events used to keep gameplay state, unlock notifications, and UI surfaces synchronized.

---

## 1) Existing loopback events reused

### `POST /quest/start`

Already emits quest-start state to the bridge. No payload changes required for this feature.

### `POST /quest/complete`

Used to mark quest completion. For this feature, completion may additionally imply a `friendshipEligible` transition in bridge-owned state.

---

## 2) SSE event: `quest_start`

No schema changes required. Existing quest-start events continue to drive quest toasts and portal labeling.

---

## 3) SSE event: `quest_complete`

### Payload

```json
{
  "character": "enabler",
  "questId": "enabler_L3_small-favor",
  "outcome": "success",
  "rewardReceived": true,
  "playerState": { "level": 4 },
  "relationshipSnapshot": {
    "trust": 62,
    "dependency": 35,
    "bond": 58,
    "wariness": 12
  },
  "memorySyncPending": false,
  "friendshipEligible": true
}
```

### Rules

- `friendshipEligible=true` signals that the next conversation with this NPC should trigger the friendship unlock path.
- The game must not grant friendship rewards directly from this event; rewards happen on the next conversation open/exit flow.

---

## 4) Game-local event: `friend_unlock`

Emitted inside the game runtime once the friendship transition has been completed and any one-time rewards have been resolved.

### Payload

```json
{
  "npcId": "girl-1-east",
  "displayName": "Girl",
  "newlyUnlockedNpcId": "mirror-1-north",
  "rewardSummaryText": "+1 Silver Charm, +2 Field Rations",
  "friendSummaryPending": true
}
```

### Consumers

- `QuestToast` / HUD layer for find-the-new-character messaging
- friend roster overlay cache invalidation
- overworld placement refresh for completed + newly unlocked NPCs

---

## 5) Game-local event: `friend_summary_updated`

Emitted when summary refresh succeeds or deferred summary data is later resolved.

### Payload

```json
{
  "npcId": "girl-1-east",
  "summaryId": "friend_girl-1-east_v1",
  "deferredResolved": false
}
```

### Rules

- UI may refresh roster entries opportunistically from this event.
- Missing or delayed summary update must not hide already unlocked friends.

---

## Validation scenarios

1. A normal quest completion with no threshold does not emit `friend_unlock`.
2. A threshold quest completion sets `friendshipEligible=true` on the completion path but delays reward grant.
3. Completing the post-third-quest conversation emits `friend_unlock` exactly once.
4. The game can refresh friend menu content after `friend_summary_updated` without requiring a reload.
