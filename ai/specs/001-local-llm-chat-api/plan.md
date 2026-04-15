# Implementation Plan: Local LLM Chat API with Terminal UI

**Branch**: `1-finalize-story` | **Date**: 2026-04-14 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/001-local-llm-chat-api/spec.md`

## Summary

Build a TypeScript CLI tool in `ai/` that lets developers chat with the 6 authored companion characters by calling LM Studio at `localhost:1234`. The tool injects the selected character's system prompt on every request, maintains an in-memory session history, and provides a readline terminal UI with character switching.

## Technical Context

**Language/Version**: TypeScript 5.4 / Node.js 20 (ESM)  
**Primary Dependencies**: `openai ^4.x`, `chalk ^5.x` (runtime); `tsx ^4.x`, `typescript ^5.4` (dev)  
**Storage**: In-memory only (no persistence)  
**Testing**: Manual verification via `pnpm dev` (no test framework in first pass)  
**Target Platform**: Linux localhost CLI  
**Project Type**: CLI tool, single project  
**Performance Goals**: Response latency determined by LM Studio; no additional overhead targets  
**Constraints**: localhost:1234 only, no external services  
**Scale/Scope**: Single developer session, 6 characters

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Gameplay-First Core Loop | ✅ Pass | Developer tool only, no game code touched |
| II. System-Modular Separation | ✅ Pass | Lives entirely in `ai/`, no cross-module coupling |
| III. Deterministic Progression | ✅ N/A | No progression mechanics |
| IV. AI Companion Runtime Boundaries | ✅ Pass | LM Studio at localhost, all 6 archetypes supported |
| V. Localhost-Only Deployment | ✅ Pass | Hardcoded `localhost:1234`, no external services |

## Project Structure

### Documentation (this feature)

```text
specs/001-local-llm-chat-api/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── cli-commands.md  # Phase 1 output
└── tasks.md             # /speckit.tasks (not created here)
```

### Source Code

```text
ai/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        # Entry point: init, startup prompt, readline wiring
    ├── types.ts        # Message, Character, HistoryEntry, Session interfaces
    ├── characters.ts   # loadCharacters(), findCharacter()
    ├── session.ts      # createSession(), appendMessage(), appendSwitch(), getHistoryMessages()
    ├── client.ts       # OpenAI client at localhost:1234, sendMessage()
    └── ui.ts           # chalk rendering, readline loop, command dispatch
```
