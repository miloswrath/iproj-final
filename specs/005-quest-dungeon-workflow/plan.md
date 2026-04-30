# Implementation Plan: Quest Dungeon Workflow

**Branch**: `005-quest-dungeon-workflow` | **Date**: 2026-04-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-quest-dungeon-workflow/spec.md`

## Summary

Implement an end-to-end quest dungeon workflow that begins in AI NPC conversation, generates a unique quest title (+ optional lore), routes the player through a resumable three-floor dungeon run, and completes with memory updates, codex visibility, and player-facing feedback.

The technical approach extends the existing localhost bridge + Phaser runtime integration by adding a dedicated quest run state model in `game/`, floor-gated progression (enemies defeated + chests looted), codex-read APIs in `ai/`, and robust session/memory handling for repeat NPC conversations without restart.

## Technical Context

**Language/Version**: TypeScript 5.4 / Node.js 20 (ESM) in `ai/`; JavaScript ESM (Vite 8 + Phaser 3.90) in `game/`  
**Primary Dependencies**: `openai ^4.x`, `chalk ^5.x`, Node `http/fs/path/fetch`; `phaser ^3.90`, `vite ^8`  
**Storage**: JSON files under `ai/memory/` + in-memory quest/session state in bridge and Phaser scenes (with resumable snapshots serialized into existing local state structures)  
**Testing**: `tsx --test` for `ai/tests/**`; runtime validation via `game/scripts/validateDungeons.mjs` + focused regression smoke tests for conversation/portal/codex loop  
**Target Platform**: Localhost only (`127.0.0.1` bridge, Vite dev server, LM Studio local model server)  
**Project Type**: Cross-module game + AI integration (browser game frontend + local AI bridge backend)  
**Performance Goals**: quest completion toast visible ≤2s after completion; 95%+ successful 3-floor runs without blocker; preserve smooth overworld traversal (60fps target)  
**Constraints**: single shared quest portal; exactly 3 floors/run; floor complete only when all enemies and all chests are cleared; gameplay progression must survive temporary memory-sync failures; localhost-only per constitution  
**Scale/Scope**: single-player local runtime; one active quest run at a time; one active AI NPC session at a time; codex shows active + historical quest lore entries

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Gameplay-First Core Loop** | PASS | Feature strengthens overworld → dungeon → reward → upgrade loop; dialogue remains quest-enablement, not hard narrative gate. |
| **II. System-Modular Separation** | PASS | `ai/` continues owning memory + NPC logic; `game/` owns gameplay runtime; integration only through explicit HTTP/SSE contracts. |
| **III. Deterministic Progression and Risk Clarity** | PASS | Three-floor rule, explicit completion criteria, portal unlock visibility, and recovery paths for blocked objectives are defined. |
| **IV. AI Companion Runtime Boundaries** | PASS | AI output remains constrained to archetype/state-driven dialogue + quest metadata; no AI output becomes mandatory for combat system runtime correctness. |
| **V. Localhost-Only Deployment Boundary** | PASS | Existing bridge binds loopback only; no cloud/external services introduced. |

**Mandatory design constraints review**
- Mechanics and companion behavior remain aligned with `docs/game-design/game-functionality.md` and `docs/game-design/game-story.md`.
- UI additions (codex + toasts + portal labels) remain concise and non-blocking.
- Companion output remains functional to quest contracts/reward outcomes.
- Any generated title/lore violating constraints is revised before persistence.

**Result**: PASS (no constitutional violations requiring exceptions).

### Post-Design Constitution Re-Check (after Phase 1)

After producing `research.md`, `data-model.md`, contracts, and `quickstart.md`:

- **Principle I** remains satisfied: three-floor quest progression is explicitly gameplay-first and measurable.
- **Principle II** remains satisfied: codex retrieval and quest completion flows stay at module boundaries (`game` client ↔ `ai` bridge).
- **Principle III** remains satisfied: deterministic clear checks + fallback recovery action for unreachable objective states are now specified.
- **Principle IV** remains satisfied: title/lore generation is optional flavor around systemic quest mechanics.
- **Principle V** remains satisfied: all APIs and event streams remain localhost loopback.

**Result**: STILL PASS.

## Project Structure

### Documentation (this feature)

```text
specs/005-quest-dungeon-workflow/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── quest-workflow-http.md
│   ├── quest-workflow-events.md
│   └── codex-data-contract.md
└── tasks.md                     # created later by /speckit.tasks
```

### Source Code (repository root)

```text
ai/
├── src/
│   ├── server/
│   │   ├── routes/
│   │   │   ├── conversation.ts
│   │   │   ├── questCompletion.ts
│   │   │   ├── questNotifications.ts
│   │   │   ├── events.ts
│   │   │   └── questCodex.ts            # NEW: codex/history read endpoints
│   │   ├── sessionRegistry.ts
│   │   └── http.ts
│   ├── lifecycle/
│   │   ├── detector.ts                  # title uniqueness + conversation continuity hooks
│   │   └── pipeline.ts                  # completion memory sync behavior
│   ├── memory/
│   │   ├── store.ts
│   │   ├── updater.ts
│   │   └── context.ts
│   └── types.ts
└── tests/
    ├── server/
    ├── integration/
    └── contract/

game/
├── src/game/
│   ├── scenes/
│   │   ├── OverworldScene.js            # portal labeling + companion follow + codex entry points
│   │   ├── DungeonScene.js              # 3-floor orchestration + progression portals
│   │   └── CombatScene.js
│   ├── services/
│   │   ├── aiClient.js
│   │   ├── questEvents.js
│   │   └── questRunClient.js            # NEW: codex + quest-state bridge calls
│   ├── ui/
│   │   ├── ConversationOverlay.js
│   │   ├── QuestToast.js
│   │   ├── LoreCodexOverlay.js          # NEW: current + historical lore entries
│   │   └── HUDController.js
│   ├── npc/
│   │   └── npcConfig.js
│   ├── overworld/
│   │   └── overworldLayout.js
│   └── playtestProgression.js           # quest run persistence snapshot extensions
└── scripts/
    └── validateDungeons.mjs
```

**Structure Decision**: The feature remains a cross-module integration with `game/` as the renamed authoritative runtime directory (formerly `playtest/`) and `ai/` as the bridge/memory domain. No new top-level package is introduced.

## Complexity Tracking

No constitution violations; no complexity exceptions required.
