# Implementation Plan: Dungeon Debug Tools and Global Leveling

**Branch**: `006-dungeon-debug-leveling` | **Date**: 2026-04-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/zak/school/sp26/cs/final/specs/006-dungeon-debug-leveling/spec.md`

## Summary

Add temporary dungeon debug controls that let playtesters instantly clear floor blockers (defeat all enemies, open all chests, skip to next floor) and add persistent global character leveling in AI memory so successful quest completions increment a cross-session level value.

Approach: extend dungeon runtime floor-control logic in `game/` with removable debug keybind handlers, then extend `ai/` profile schema and quest-completion pipeline so global level is initialized for legacy profiles and increments deterministically when a quest is completed successfully.

## Technical Context

**Language/Version**: TypeScript 5.4 / Node.js 20 (ESM) in `ai/`; JavaScript ESM (Vite 8 + Phaser 3.90) in `game/`  
**Primary Dependencies**: `openai ^4.x`, `chalk ^5.x`, Node built-ins (`http`, `fs`, `path`, `fetch`); `phaser ^3.90`, `vite ^8`  
**Storage**: JSON files under `/home/zak/school/sp26/cs/final/ai/memory/` (including `player-profile.json`) + in-memory dungeon/quest runtime state in Phaser scenes  
**Testing**: `tsx --test` in `ai/tests/**`; manual runtime verification in game scenes; `node game/scripts/validateDungeons.mjs` regression sanity check  
**Target Platform**: Localhost-only development runtime (`127.0.0.1` bridge + local Vite game)  
**Project Type**: Cross-module local game + AI bridge integration  
**Performance Goals**: Debug actions execute with immediate visible effect (<1 second perceived delay); quest completion level update persisted before next session load; no observable FPS regression during dungeon traversal (60 FPS target unchanged)  
**Constraints**: Debug controls must be easy to remove/disable; no duplicate chest rewards from repeated debug actions; legacy player profiles must auto-upgrade safely; no non-local deployment changes per constitution  
**Scale/Scope**: Single-player local sessions; one active dungeon run and one active quest completion event processed at a time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Gameplay-First Core Loop** | PASS | Feature accelerates testing of overworld → dungeon → reward progression and adds persistent progression tracking; no narrative dependency added. |
| **II. System-Modular Separation** | PASS | `game/` owns runtime debug controls and dungeon floor actions; `ai/` owns profile persistence and completion-side level updates; integration remains existing quest completion boundary. |
| **III. Deterministic Progression and Risk Clarity** | PASS | Global level increases by a deterministic +1 rule on successful completion; debug actions define explicit outcomes and safe no-op behavior for invalid states. |
| **IV. AI Companion Runtime Boundaries** | PASS | No expansion of AI narrative authority; changes are profile/progression and completion bookkeeping only. |
| **V. Localhost-Only Deployment Boundary** | PASS | No network surface or deployment target changes introduced. |

**Mandatory design constraints review**
- Mechanics remain aligned with `docs/game-design/game-functionality.md` and do not replace the core loop.
- Debug UI/keybind feedback remains concise and non-blocking.
- Companion/dialogue systems are untouched except for quest-completion progression side-effects.
- Any invalid/malformed persisted profile data is normalized before use.

**Result**: PASS (no constitutional violations requiring exceptions).

### Post-Design Constitution Re-Check (after Phase 1)

- **Principle I** remains satisfied: debug controls are explicitly playtest-only and do not alter release loop assumptions.
- **Principle II** remains satisfied: data contract for global level lives in `ai/memory`, runtime controls stay in `game/`.
- **Principle III** remains satisfied: level increment trigger and migration rules are deterministic and testable.
- **Principle IV** remains satisfied: no new AI generation requirements.
- **Principle V** remains satisfied: localhost-only architecture unchanged.

**Result**: STILL PASS.

## Project Structure

### Documentation (this feature)

```text
/home/zak/school/sp26/cs/final/specs/006-dungeon-debug-leveling/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── dungeon-debug-controls-contract.md
│   └── player-profile-level-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
/home/zak/school/sp26/cs/final/
├── ai/
│   ├── src/
│   │   ├── types.ts
│   │   ├── memory/
│   │   │   └── store.ts
│   │   ├── lifecycle/
│   │   │   └── pipeline.ts
│   │   └── server/routes/
│   │       └── questCompletion.ts
│   ├── memory/
│   │   └── player-profile.json
│   └── tests/
│       ├── integration/
│       └── contract/
└── game/
    └── src/game/
        ├── scenes/
        │   └── DungeonScene.js
        └── playtestProgression.js
```

**Structure Decision**: Reuse existing two-module architecture (`ai/` + `game/`) with no new top-level packages. Implement debug interaction in `DungeonScene` and persistent progression schema/quest-completion behavior in existing AI memory + pipeline paths.

## Complexity Tracking

No constitution violations; no complexity exceptions required.
