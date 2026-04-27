# final Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-26

## Active Technologies
- TypeScript 5.4 / Node.js 20 (ESM) + `openai ^4.x` (LLM calls + intent classifier), `chalk ^5.x` (TUI rendering), `tsx ^4.x` (dev runner) (002-memory-termination-system)
- Local JSON files — atomic write via temp+rename; `memory/` directory at project root (002-memory-termination-system)
- TypeScript 5.4 / Node.js 20 (ESM) for the AI bridge server. JavaScript ESM (Vite + Phaser 3.90) for the playtest frontend. + `openai ^4.x` (existing, LM Studio HTTP client), Node native `node:http` (no new dep) for the bridge server, `phaser ^3.90` (existing) and `vite ^8` (existing) for the frontend. SSE implemented manually over the native HTTP response stream. (004-ai-npc-integration)
- JSON files under `ai/memory/` (existing — `player-profile.json`, `player-summary.json`, `characters/<name>.json`, `pending-notifications.json`, `processed-completions.json`). No browser storage in this pass; conversation sessions are server-side and ephemeral per page load. (004-ai-npc-integration)

- TypeScript 5.4 / Node.js 20 (ESM) + `openai ^4.x`, `chalk ^5.x` (runtime); `tsx ^4.x`, `typescript ^5.4` (dev) (1-finalize-story)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.4 / Node.js 20 (ESM): Follow standard conventions

## Recent Changes
- 004-ai-npc-integration: Added TypeScript 5.4 / Node.js 20 (ESM) for the AI bridge server. JavaScript ESM (Vite + Phaser 3.90) for the playtest frontend. + `openai ^4.x` (existing, LM Studio HTTP client), Node native `node:http` (no new dep) for the bridge server, `phaser ^3.90` (existing) and `vite ^8` (existing) for the frontend. SSE implemented manually over the native HTTP response stream.
- 002-memory-termination-system: Added TypeScript 5.4 / Node.js 20 (ESM) + `openai ^4.x` (LLM calls + intent classifier), `chalk ^5.x` (TUI rendering), `tsx ^4.x` (dev runner)
- 002-memory-termination-system: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
