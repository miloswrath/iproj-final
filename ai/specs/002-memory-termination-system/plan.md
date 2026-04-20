# Implementation Plan: NPC Memory and Conversation Termination System

**Branch**: `002-memory-termination-system` | **Date**: 2026-04-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-memory-termination-system/spec.md`

## Summary

Adds persistent, multi-layered memory to the existing TUI chat system so that NPC relationship metrics evolve across conversations, and automatically terminates conversations when the player accepts a quest via hybrid rule + LLM detection. At session end, a post-conversation pipeline extracts behavioral features, updates relationship metrics using a clamped persistence formula with archetype modifiers, regenerates LLM-facing prompt summaries, persists all state atomically to disk, and notifies the external game system.

## Technical Context

**Language/Version**: TypeScript 5.4 / Node.js 20 (ESM)
**Primary Dependencies**: `openai ^4.x` (LLM calls + intent classifier), `chalk ^5.x` (TUI rendering), `tsx ^4.x` (dev runner)
**Storage**: Local JSON files — atomic write via temp+rename; `memory/` directory at project root
**Testing**: No test framework configured; manual verification via `/simulate_accept` and file inspection
**Target Platform**: Linux/macOS developer workstation
**Project Type**: CLI tool
**Performance Goals**: Post-conversation pipeline completes before TTY exits (target < 3 seconds total)
**Constraints**: Single-process, single-session; no concurrent writes; no external DB
**Scale/Scope**: ~6 characters × 1 player; memory files are small JSON documents

## Constitution Check

No constitution file found at `.specify/memory/constitution.md` — gate skipped.

## Project Structure

### Documentation (this feature)

```text
specs/002-memory-termination-system/
├── plan.md              ← this file
├── research.md          ← Phase 0 decisions
├── data-model.md        ← entity schemas and state transitions
├── quickstart.md        ← developer onboarding
├── contracts/
│   └── cli-commands.md  ← command schemas + external API contract
└── tasks.md             ← Phase 2 output (not yet created)
```

### Source Code Layout

```text
src/
├── types.ts             ← extend with memory types (CharacterMemory, PlayerProfile, etc.)
├── memory/
│   ├── store.ts         ← atomic read/write helpers for all memory files
│   ├── updater.ts       ← metric update formula + archetype modifiers
│   └── summarizer.ts    ← LLM-based prompt summary generation
├── features/
│   └── extractor.ts     ← conversation feature extraction (regex-based)
├── lifecycle/
│   ├── detector.ts      ← quest acceptance detection (rule + LLM classifier)
│   └── pipeline.ts      ← post-conversation pipeline orchestrator
├── notify/
│   └── game-api.ts      ← POST /quest/start with retry/pending queue
├── client.ts            ← existing (no change)
├── characters.ts        ← existing (no change)
├── session.ts           ← extend Session with ConversationState
├── ui.ts                ← extend with debug commands rendering
└── index.ts             ← extend command dispatch with new /state /char /features /reload /simulate_accept

memory/                  ← runtime data directory (gitignored)
├── player-profile.json
├── player-summary.json
├── pending-notifications.json
└── characters/
    └── <character-name>.json
```

**Structure Decision**: Single-project layout extending the existing `src/` tree. New modules grouped by concern (`memory/`, `features/`, `lifecycle/`, `notify/`) to stay co-located and importable without a monorepo setup.

## Complexity Tracking

No constitution violations to justify.
