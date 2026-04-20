# final Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-16

## Active Technologies
- TypeScript 5.4 / Node.js 20 (ESM) + `openai ^4.x` (LLM calls + intent classifier), `chalk ^5.x` (TUI rendering), `tsx ^4.x` (dev runner) (002-memory-termination-system)
- Local JSON files — atomic write via temp+rename; `memory/` directory at project root (002-memory-termination-system)

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
- 002-memory-termination-system: Added TypeScript 5.4 / Node.js 20 (ESM) + `openai ^4.x` (LLM calls + intent classifier), `chalk ^5.x` (TUI rendering), `tsx ^4.x` (dev runner)
- 002-memory-termination-system: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

- 1-finalize-story: Added TypeScript 5.4 / Node.js 20 (ESM) + `openai ^4.x`, `chalk ^5.x` (runtime); `tsx ^4.x`, `typescript ^5.4` (dev)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
