# Quickstart: NPC Friendship Progression

**Feature**: 007-npc-friend-progression

## Prerequisites

- Node.js 20+
- LM Studio running at `http://localhost:1234/v1`
- Project dependencies installed for the active workspace

## Run locally

### Terminal 1 — AI bridge

```bash
cd /home/zak/school/sp26/cs/final/ai
npm test
```

Use the AI bridge's normal local dev command after tests if interactive runtime validation is needed.

### Terminal 2 — game runtime

```bash
cd /home/zak/school/sp26/cs/final/game
npm run dev
```

Open the Vite URL shown in the terminal.

## Core validation flow

1. Start a fresh or controlled progression state with a valid random starter NPC.
2. Speak to the starter NPC and complete three quests for that same character.
3. After the third quest completes, return to the overworld and reopen conversation with that NPC.
4. Verify:
   - the NPC acknowledges friendship in-archetype,
   - one-time friendship rewards are granted,
   - duplicate quest text does not appear,
   - the NPC remains at the resolved persistent location.
5. Exit the post-third-quest conversation and verify:
   - a friend summary is available,
   - the friend-tracking menu becomes available,
   - a toast instructs the player to find the new character.
6. Explore the overworld and verify:
   - the completed NPC remains in town,
   - the newly unlocked NPC appears in a distinct location,
   - the two characters do not overlap.
7. Reload the game and verify:
   - the active NPC selection is unchanged,
   - unlocked/completed NPC placements remain stable,
   - the friend menu still shows the unlocked friend summary.

## Focused regression checks

1. Finish a battle that completes the third quest and return to the overworld:
   - the NPC should appear directly at the intended placement,
   - the NPC should not spawn at the old quest point and run to the player.
2. Reopen the same friendly NPC conversation multiple times:
   - the unlock reward is not granted again,
   - friendship tone persists,
   - additional quests are still available.
3. Force summary-generation failure or bridge unavailability:
   - the friendship unlock still persists,
   - the summary can be generated or refreshed later.

## Suggested implementation verification

From repository root:

```bash
npm test
npm run lint
```

Then perform the overworld, conversation, and reload smoke tests in the running game.
