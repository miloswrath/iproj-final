# Quickstart: Dungeon Debug Tools and Global Leveling

**Feature**: 006-dungeon-debug-leveling

## Prerequisites

- Node.js 20+
- Dependencies installed:
  - `/home/zak/school/sp26/cs/final/ai`: `pnpm install`
  - `/home/zak/school/sp26/cs/final/game`: `npm install`
- LM Studio running locally at `http://localhost:1234/v1` (for full quest loop validation)

## Run locally

### Terminal 1 — AI bridge

```bash
cd /home/zak/school/sp26/cs/final/ai
pnpm run dev:server
```

### Terminal 2 — game runtime

```bash
cd /home/zak/school/sp26/cs/final/game
npm run dev
```

Open the local Vite URL (typically `http://localhost:5173`).

## Debug-control validation flow

Use the temporary scene-local keybinds:

- `F6`: defeat all active enemies on the current floor
- `F7`: open all unopened chests on the current floor
- `F8`: complete the current quest floor and advance through the normal portal transition

Validation steps:

1. Enter a dungeon floor with enemies and chests.
2. Trigger `F6` and verify all active enemies are defeated immediately, floor enemy counts update, and repeated presses become safe no-ops.
3. Trigger `F7` and verify unopened chests open, rewards are granted exactly once, and repeated presses do not duplicate rewards.
4. Trigger `F8` during an active quest run and verify the current floor completes through the normal quest-floor transition path.
5. Trigger `F8` outside an active quest run and verify the action is ignored with non-fatal debug feedback.
6. Repeat the actions rapidly to confirm no invalid floor transitions or runtime crashes occur.

## Global leveling validation flow

1. Inspect `/home/zak/school/sp26/cs/final/ai/memory/player-profile.json` and note `globalCharacterLevel`.
2. Complete a quest with `success` outcome through normal game flow.
3. Confirm `globalCharacterLevel` increased by exactly `1`.
4. Restart AI bridge and game runtime; confirm the updated level persists.
5. Test with a legacy profile lacking `globalCharacterLevel`; verify load normalization initializes the field to `1` and the next successful completion persists `2`.
6. Re-send a duplicate completion payload with the same `eventTimestamp` and verify the route returns `applied: false`, `reason: "duplicate"`, and the level does not increment twice.

## Regression commands

From `/home/zak/school/sp26/cs/final/ai`:

```bash
pnpm build
pnpm test
```

From `/home/zak/school/sp26/cs/final/game`:

```bash
npm run build
npm run validate:dungeons
```

## Validation Results

Executed during implementation on 2026-04-29:

- `pnpm build` in `/home/zak/school/sp26/cs/final/ai`: passed
- `pnpm test` in `/home/zak/school/sp26/cs/final/ai`: passed (`36` tests)
- `npm run build` in `/home/zak/school/sp26/cs/final/game`: passed
- `npm run validate:dungeons` in `/home/zak/school/sp26/cs/final/game`: passed (`12` curated dungeons validated)
