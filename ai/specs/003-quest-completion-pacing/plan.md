# Implementation Plan: Quest Completion and Offer Pacing

**Branch**: `[003-quest-completion-pacing]` | **Date**: 2026-04-22 | **Spec**: [/home/zak/school/sp26/cs/final/ai/specs/003-quest-completion-pacing/spec.md]  
**Input**: Feature specification from `/home/zak/school/sp26/cs/final/ai/specs/003-quest-completion-pacing/spec.md`

**Note**: This plan covers Phase 0 research and Phase 1 design artifacts for quest completion ingestion/retry reliability and quest-offer pacing controls.

## Summary

Add a dedicated quest completion pathway that updates memory from authoritative outcome events, make queued notifications type-safe for replay routing, and enforce first quest offer timing so offers only appear on assistant response 3-5 (never 1-2).

## Technical Context

**Language/Version**: TypeScript 5.4 on Node.js 20 (ESM)  
**Primary Dependencies**: openai ^4.x, chalk ^5.x, built-in fetch/readline/path/fs APIs  
**Storage**: Local JSON files in `/home/zak/school/sp26/cs/final/ai/memory` with atomic write behavior  
**Testing**: Project-local TypeScript test scripts executed via `tsx` (new test suite introduced for this feature)  
**Target Platform**: Localhost CLI runtime (developer machine)  
**Project Type**: Single-process CLI application with local LLM + outbound game API notifications  
**Performance Goals**: Quest notification handling and memory updates complete within 2 seconds per event under normal localhost conditions  
**Constraints**: Localhost-only deployment, no cloud dependencies, memory values must remain clamped to schema bounds, first quest offer cannot occur on assistant response 1-2 and must fall within 3-5 when offered  
**Scale/Scope**: Single active conversation session, per-character memory files, low-volume event retries from local queue

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Gameplay-First Core Loop**: PASS — quest completion and pacing directly support dungeon contract flow and reward/progression loop.
- **II. System-Modular Separation (AI and Game)**: PASS — changes are isolated to `ai/` and external integration remains explicit through notification contracts.
- **III. Deterministic Progression and Risk Clarity**: PASS — success-only quest-level increment and explicit retry/error handling preserve readable progression state.
- **IV. AI Companion Runtime Boundaries**: PASS — pacing gate constrains dialogue behavior without introducing narrative dependency for progression.
- **V. Localhost-Only Deployment Boundary**: PASS — all interfaces remain localhost and file-local.

**Gate Result (Pre-Research)**: PASS

## Project Structure

### Documentation (this feature)

```text
/home/zak/school/sp26/cs/final/ai/specs/003-quest-completion-pacing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── quest-complete-contract.md
│   ├── pending-notification-contract.md
│   └── quest-offer-window-contract.md
└── tasks.md                     # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
/home/zak/school/sp26/cs/final/ai/
├── src/
│   ├── index.ts                 # Conversation loop + quest offer pacing gate
│   ├── lifecycle/
│   │   ├── detector.ts          # Quest offer/acceptance detection + quest ID shaping
│   │   └── pipeline.ts          # Post-conversation + quest completion pipeline
│   ├── memory/
│   │   ├── updater.ts           # Character + player profile outcome updates
│   │   └── store.ts             # Pending queue + profile/character persistence
│   ├── notify/
│   │   └── game-api.ts          # Quest start/complete notify + typed retry replay
│   └── types.ts                 # Event/queue/turn-state type definitions
├── memory/
│   ├── characters/*.json
│   ├── player-profile.json
│   └── pending-notifications.json
└── specs/
    └── 003-quest-completion-pacing/
```

**Structure Decision**: Use the existing single-project CLI layout under `ai/src` and add/extend modules in lifecycle, notify, memory, and types rather than introducing new package boundaries.

## Phase 0: Research Plan

1. Define quest completion event contract and idempotency handling strategy for duplicate events.
2. Define retry queue discriminator strategy (`quest_start` vs `quest_complete`) and replay routing rules.
3. Define quest-offer pacing policy and deterministic turn-window behavior (responses 3-5 only).
4. Define outcome-to-memory update mapping and clamping behavior for all supported outcomes.

## Phase 1: Design Plan

1. Document entities, fields, and transitions in `data-model.md`.
2. Document interface contracts in `contracts/` for completion payloads, retry queue schema, and turn-window pacing.
3. Produce `quickstart.md` with local validation flow for success/failure/abandon + pacing checks.
4. Update agent context via `.specify/scripts/bash/update-agent-context.sh codex`.
5. Re-run constitution gate after design artifacts are complete.

## Constitution Check (Post-Design)

- **I. Gameplay-First Core Loop**: PASS — contracts and data model reinforce quest progression and reward outcomes.
- **II. System-Modular Separation (AI and Game)**: PASS — API boundaries documented; no cross-module coupling introduced.
- **III. Deterministic Progression and Risk Clarity**: PASS — data model defines monotonic quest level progression and explicit replay semantics.
- **IV. AI Companion Runtime Boundaries**: PASS — pacing contract constrains offer timing while preserving archetype-driven behavior.
- **V. Localhost-Only Deployment Boundary**: PASS — quickstart and contracts assume localhost-only endpoints.

**Gate Result (Post-Design)**: PASS

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
