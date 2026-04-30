# Quickstart: Quest Dungeon Workflow

**Feature**: 005-quest-dungeon-workflow

## Prerequisites

- Node.js 20+
- LM Studio running at `http://localhost:1234/v1`
- Dependencies installed in both modules:
  - `ai/` via `pnpm install`
  - `game/` via `npm install`

## Run locally

### Terminal 1 — AI bridge

```bash
cd /home/zak/school/s26/iproj/final/ai
pnpm run dev:server
```

### Terminal 2 — game runtime

```bash
cd /home/zak/school/s26/iproj/final/game
npm run dev
```

Open the Vite URL (`http://localhost:5173` by default).

## Smoke test checklist

1. Walk to AI NPC and press `E` to open conversation.
2. Converse until quest is offered and accept.
3. Verify:
   - quest toast appears,
   - portal label updates to quest title,
   - companion begins follow behavior.
4. Enter quest portal and complete floor 1:
   - defeat all enemies,
   - open all chests,
   - confirm progression portal appears.
5. Repeat for floors 2 and 3.
6. After floor 3 completion:
   - exit portal appears,
   - completion toast appears within 2s,
   - quest transitions to completed.
7. Open lore codex and verify:
   - current/last quest appears,
   - historical entries remain visible in order.
8. Reopen NPC conversation immediately (no restart):
   - conversation starts successfully,
   - prior completed quest context is referenced.

## Failure-path checks

- Stop LM Studio mid-run, complete quest in game: completion should remain recorded and sync should retry when AI returns.
- Trigger objective recheck/reset on a floor with missing enemy/chest actor: floor should become completable again.

## Regression commands

From `ai/`:

```bash
pnpm test
```

From `game/`:

```bash
npm run validate:dungeons
```
