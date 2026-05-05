# Contract: Overworld Follower State and Recovery

**Feature**: 008-fix-npc-asset-behavior  
**Owner**: `game/src/game/scenes/OverworldScene.js`, `game/src/game/playtestProgression.js`, `game/src/game/scenes/CombatScene.js`

## Scope

Defines runtime contract for follower-designated NPC behavior during traversal and after transitions.

---

## Follow state shape

```json
{
  "npcId": "girl-1-east",
  "shouldFollow": true,
  "followMode": "active",
  "followTarget": "player",
  "transitionResumePending": false,
  "lastSyncedAt": "2026-05-05T12:00:00.000Z"
}
```

Allowed `followMode` values:
- `active`
- `recovering`
- `paused`

---

## Transition contract

### On transition out of overworld (battle/scene change)

- If `shouldFollow=true`, follower may move to `recovering` mode.
- `transitionResumePending` becomes `true` until re-entry is complete.

### On re-entry to overworld

- Follower state must rebind to player target.
- `followMode` returns to `active`.
- `transitionResumePending` becomes `false`.

---

## Behavioral requirements

1. Follower-designated NPCs must continue following during normal overworld movement.
2. Scene or battle transitions must not permanently disable follow behavior.
3. Recovery must occur automatically without manual player reset.
4. Non-follower NPCs (`shouldFollow=false`) are not forced into follow logic.
5. The active follower state is persisted in playtest progression storage so overworld re-entry can immediately rebind the follower sprite.

---

## Minimum validation checks

1. During normal movement, follower NPC keeps pace and does not remain stranded.
2. After battle return, follower resumes active follow mode.
3. After fast transition chains (scene change + teleport), follower still rebinds.
4. Follow recovery regression threshold aligns with spec success criteria (>=95% automated/manual test runs).
