# final Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-28

## Active Technologies
- TypeScript 5.4 / Node.js 20 (ESM) in `ai/`; JavaScript ESM (Vite 8 + Phaser 3.90) in `game/` + `openai ^4.x`, `chalk ^5.x`, Node `http/fs/path/fetch`; `phaser ^3.90`, `vite ^8` (005-quest-dungeon-workflow)
- JSON files under `ai/memory/` + in-memory quest/session state in bridge and Phaser scenes (with resumable snapshots serialized into existing local state structures) (005-quest-dungeon-workflow)

- TypeScript 5.4 on Node.js 20 (ESM) + openai ^4.x, chalk ^5.x, built-in fetch/readline/path/fs APIs (003-quest-completion-pacing)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.4 on Node.js 20 (ESM): Follow standard conventions

## Recent Changes
- 005-quest-dungeon-workflow: Added TypeScript 5.4 / Node.js 20 (ESM) in `ai/`; JavaScript ESM (Vite 8 + Phaser 3.90) in `game/` + `openai ^4.x`, `chalk ^5.x`, Node `http/fs/path/fetch`; `phaser ^3.90`, `vite ^8`
- 003-quest-completion-pacing: Added TypeScript 5.4 on Node.js 20 (ESM) + openai ^4.x, chalk ^5.x, built-in fetch/readline/path/fs APIs

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
