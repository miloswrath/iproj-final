# Implementation Plan: NPC Asset & Behavior Fixes

**Branch**: `008-fix-npc-asset-behavior` | **Date**: 2026-05-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-fix-npc-asset-behavior/spec.md`

## Summary

Implement a focused stabilization pass for NPC progression startup, archetype-to-character asset mapping, debug quest activation shortcuts, and overworld follower reliability.

The approach keeps AI/game responsibilities separated: AI bridge conversation handling recognizes the two exact debug trigger phrases and initiates quest activation sequencing, while game runtime systems enforce non-General starter selection, apply required archetype visual mappings, and maintain follower behavior through movement and transition recovery.

## Technical Context

**Language/Version**: TypeScript 5.4 / Node.js 20 (ESM) in `ai/`; JavaScript ESM (Vite 8 + Phaser 3.90) in `game/`  
**Primary Dependencies**: `openai ^4.x`, `chalk ^5.x`, Node `http/fs/path/fetch`; `phaser ^3.90`, `vite ^8`  
**Storage**: JSON-backed AI memory in `ai/memory/` and persisted runtime progression/follower state in `game/src/game/playtestProgression.js`  
**Testing**: `npm test`, targeted `ai/tests/**` route/contract coverage, browser regression checks in overworld + conversation flows, `npm run lint`  
**Target Platform**: Localhost-only Node AI bridge + browser game runtime on a single development machine  
**Project Type**: Cross-module game + AI integration (browser frontend + local AI bridge backend)  
**Performance Goals**: starter archetype resolves on first load without fallback delay; debug trigger quest activation acknowledged within one message turn; follower recovery after transitions appears seamless during normal playtest movement  
**Constraints**: initial starter must never be General; mappings for parasite/enabler/honest_one/mirror/opportunist must remain fixed; both exact debug phrases must bypass normal gating; quest activation setup must complete in required order; follower behavior must persist and recover across scene/battle transitions; localhost-only boundary per constitution  
**Scale/Scope**: single-player local playtest flow; one starter selection per run; five required archetype mappings; two exact debug trigger phrases; overworld follower behavior for designated follower NPCs only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Gameplay-First Core Loop** | PASS | Changes directly unblock quest start reliability, preserve overworld traversal continuity, and improve quest activation/testing flow without replacing core overworld->dungeon->reward->upgrade gameplay. |
| **II. System-Modular Separation** | PASS | AI bridge handles phrase-triggered quest activation and sequencing signals; game module owns starter selection, visual mapping usage, and follow behavior runtime. Interfaces remain explicit. |
| **III. Deterministic Progression and Risk Clarity** | PASS | Starter selection excludes invalid General state deterministically while preserving random choice among eligible starters; fixed mapping tables remove ambiguous character presentation. |
| **IV. AI Companion Runtime Boundaries** | PASS | AI output stays gameplay-supportive (debug trigger handling and quest activation flow), with archetype-aligned presentation and no narrative dependency introduced. |
| **V. Localhost-Only Deployment Boundary** | PASS | All behavior remains in local game runtime and localhost AI bridge; no external hosting or remote service is added. |

**Mandatory design constraints review**
- Mechanics remain aligned with `docs/game-design/game-functionality.md` and `docs/game-design/game-story.md` by reinforcing quest and traversal stability.
- Interaction remains concise: two explicit debug phrases and existing conversation flow, no intrusive UI additions.
- Companion/NPC changes directly support quest availability, dungeon access readiness, and movement continuity.
- Dialogue remains functional for progression mechanics, not a mandatory narrative branch.

**Result**: PASS (no constitutional violations requiring exception).

### Post-Design Constitution Re-Check (after Phase 1)

After producing `research.md`, `data-model.md`, `/contracts/*`, and `quickstart.md`:

- **Principle I** remains satisfied: fixes improve starter validity, quest activation, and follower continuity in the core gameplay loop.
- **Principle II** remains satisfied: design keeps data ownership and runtime behavior split between AI and game modules with explicit contracts.
- **Principle III** remains satisfied: starter pool rules, mapping definitions, and trigger matching are explicit and testable.
- **Principle IV** remains satisfied: AI role remains constrained to state-driven progression support.
- **Principle V** remains satisfied: contracts and workflows remain localhost-only.

**Result**: STILL PASS.

## Project Structure

### Documentation (this feature)

```text
specs/008-fix-npc-asset-behavior/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── conversation-debug-trigger-contract.md
│   ├── npc-archetype-asset-contract.md
│   └── overworld-follower-state-contract.md
└── tasks.md                     # created later by /speckit.tasks
```

### Source Code (repository root)

```text
ai/
├── src/
│   ├── server/
│   │   ├── routes/
│   │   │   ├── conversation.ts         # debug trigger phrase recognition
│   │   │   └── questCompletion.ts      # activation sequencing touchpoints (if needed)
│   │   └── eventBus.ts                 # activation/followup signaling
│   ├── lifecycle/
│   │   └── pipeline.ts                 # quest activation ordering integration
│   └── memory/
│       └── context.ts                  # progression state reads for activation guards
└── tests/
    ├── contract/
    ├── integration/
    └── server/

game/
├── src/game/
│   ├── npc/
│   │   └── npcConfig.js                # starter pool + archetype mapping definitions
│   ├── overworld/
│   │   └── overworldLayout.js          # follower placement anchors and transition re-entry support
│   ├── playtestProgression.js          # starter persistence + follow continuity state
│   ├── scenes/
│   │   ├── OverworldScene.js           # follower movement + transition recovery
│   │   ├── CombatScene.js              # return context handoff
│   │   └── DungeonScene.js             # activation completion handoff
│   ├── services/
│   │   ├── aiClient.js                 # conversation request path for debug phrases
│   │   └── questRunClient.js           # activation bundle coordination
│   └── ui/
│       └── ConversationOverlay.js      # debug phrase input path and quest activation feedback
└── scripts/
    └── validateDungeons.mjs
```

**Structure Decision**: Keep the existing two-module architecture. Extend current conversation, NPC configuration, and overworld scene layers rather than creating new top-level packages.

## Complexity Tracking

No constitution violations; no complexity exceptions required.
