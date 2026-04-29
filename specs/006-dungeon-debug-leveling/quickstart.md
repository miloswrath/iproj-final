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

1. Enter a dungeon floor with enemies and chests.
2. Trigger **kill-all-enemies** debug action and verify all enemies are defeated immediately.
3. Trigger **open-all-chests** debug action and verify unopened chests open and rewards are granted exactly once.
4. Trigger **skip-to-next-floor** debug action and verify quest run advances using normal floor-completion behavior.
5. Repeat triggers rapidly to confirm no duplicate chest rewards and no invalid floor transitions.
6. Trigger a debug action outside valid dungeon-floor context (if possible) and verify safe no-op behavior.

## Global leveling validation flow

1. Inspect `/home/zak/school/sp26/cs/final/ai/memory/player-profile.json` and note `globalCharacterLevel`.
2. Complete a quest with `success` outcome through normal game flow.
3. Confirm `globalCharacterLevel` increased by exactly 1.
4. Restart AI bridge and game runtime; confirm updated level persists.
5. Test with a legacy profile lacking `globalCharacterLevel`; verify auto-initialization to `1` and successful increment on next completion.
6. Re-send duplicate completion event (or retry scenario) and verify level is not double-incremented.

## Regression commands

From `/home/zak/school/sp26/cs/final/ai`:

```bash
pnpm test
```

From `/home/zak/school/sp26/cs/final/game`:

```bash
npm run validate:dungeons
```
