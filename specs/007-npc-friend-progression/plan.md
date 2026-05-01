# Implementation Plan: NPC Friendship Progression

**Branch**: `008-npc-friend-progression` | **Date**: 2026-05-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-npc-friend-progression/spec.md`

## Summary

Implement a repeatable NPC friendship progression loop that upgrades an NPC after three completed quests, grants one-time friendship loot, unlocks the next NPC in a distinct overworld location, and adds a friend-tracking menu with short AI-generated relationship summaries.

The technical approach extends the existing AI bridge + Phaser runtime split by adding explicit per-NPC progression records in `ai/memory/`, persistent active-character and spawn placement state in `game/`, a small friend-roster read API for the new menu, and deterministic spawn/reward handling so the feature remains gameplay-first and reload-safe.

## Technical Context

**Language/Version**: TypeScript 5.4 / Node.js 20 (ESM) in `ai/`; JavaScript ESM (Vite 8 + Phaser 3.90) in `game/`  
**Primary Dependencies**: `openai ^4.x`, `chalk ^5.x`, Node `http/fs/path/fetch`; `phaser ^3.90`, `vite ^8`  
**Storage**: JSON files under `ai/memory/` for long-term NPC/player state plus `game/src/game/playtestProgression.js` runtime state extended to persist active character, world placements, friend roster cache, and post-battle return context  
**Testing**: `npm test` / focused `ai/tests/**` coverage for memory and route changes; browser regression smoke tests for NPC spawn, conversation transitions, toast flow, and friend menu; `npm run lint`  
**Target Platform**: Localhost-only AI bridge + browser game runtime on a single-player development machine  
**Project Type**: Cross-module game + AI integration (browser game frontend + local AI bridge backend)  
**Performance Goals**: overworld traversal remains at current playtest responsiveness target; friendship unlock toast appears within 2 seconds; friend menu opens with data populated in under 1 second under local conditions  
**Constraints**: gameplay loop must remain overworld -> dungeon -> reward -> upgrade; AI output cannot become a hard dependency for combat progression; completed and unlocked NPCs cannot overlap in town/world placement; friendship rewards are one-time per NPC; reloads must preserve active character and unlocked roster; localhost-only per constitution  
**Scale/Scope**: single-player local runtime; one active progression character at a time; initial rollout adds one new unlockable character and one friend-tracking menu; progression loop must remain reusable for future NPC additions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Gameplay-First Core Loop** | PASS | Friendship unlocks are earned through completed quests and feed back into reward, exploration, and future quest progression rather than replacing the dungeon loop. |
| **II. System-Modular Separation** | PASS | `ai/` owns memory, summaries, and bridge routes; `game/` owns placement, menus, toasts, and battle return behavior; integration stays on explicit route/event boundaries. |
| **III. Deterministic Progression and Risk Clarity** | PASS | Third-quest threshold, one-time reward grants, stable spawn placement, and non-overlapping unlock locations make progression legible and reproducible. |
| **IV. AI Companion Runtime Boundaries** | PASS | AI generation is limited to archetype-aligned friendship acknowledgement and concise relationship summaries; core unlock logic and reward delivery remain state-driven. |
| **V. Localhost-Only Deployment Boundary** | PASS | All new state and interfaces remain in local JSON files and localhost bridge endpoints; no external hosting or services are introduced. |

**Mandatory design constraints review**
- Mechanics remain aligned with `docs/game-design/game-functionality.md` by using friendship progression to reinforce quest and reward flow.
- UI additions remain concise and non-blocking: a toast plus a codex-like menu rather than modal quest gates.
- Companion/NPC systems continue contributing directly to quest access, rewards, and progression clarity.
- Generated summaries remain supportive flavor for state the game already owns, not a narrative dependency.

**Result**: PASS (no constitutional violations requiring exceptions).

### Post-Design Constitution Re-Check (after Phase 1)

After producing `research.md`, `data-model.md`, contracts, and `quickstart.md`:

- **Principle I** remains satisfied: the design anchors unlocks to completed quests and immediately returns value through rewards, new NPC discovery, and continued quest access.
- **Principle II** remains satisfied: AI and game responsibilities are separated into bridge-owned records/endpoints and game-owned placement/UI/runtime transitions.
- **Principle III** remains satisfied: reward eligibility, friendship thresholds, spawn allocation, and reload persistence are all explicit and testable.
- **Principle IV** remains satisfied: AI-generated friend summaries are additive and can fail gracefully without blocking progression state.
- **Principle V** remains satisfied: all interfaces remain localhost-only and file-backed.

**Result**: STILL PASS.

## Project Structure

### Documentation (this feature)

```text
specs/007-npc-friend-progression/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── friendship-progression-http.md
│   ├── friendship-progression-events.md
│   └── friend-roster-data-contract.md
└── tasks.md                     # created later by /speckit.tasks
```

### Source Code (repository root)

```text
ai/
├── src/
│   ├── memory/
│   │   ├── store.ts
│   │   ├── updater.ts
│   │   └── friendship.ts               # NEW: progression/friend summary helpers
│   ├── server/
│   │   ├── routes/
│   │   │   ├── conversation.ts
│   │   │   ├── questCodex.ts
│   │   │   ├── questNotifications.ts
│   │   │   └── friends.ts              # NEW: friend roster + summary reads
│   │   ├── eventBus.ts
│   │   └── http.ts
│   └── types.ts
└── tests/
    ├── unit/
    ├── integration/
    └── contract/

game/
├── src/game/
│   ├── npc/
│   │   └── npcConfig.js                # archetype roster, initial selection, loot metadata
│   ├── overworld/
│   │   └── overworldLayout.js          # spawn points for active/unlocked/completed NPCs
│   ├── scenes/
│   │   ├── OverworldScene.js           # AI NPC render, friend menu entry point, post-battle return placement
│   │   ├── DungeonScene.js             # quest completion handoff to unlock logic
│   │   └── CombatScene.js              # return context for NPC placement after battle
│   ├── services/
│   │   ├── aiClient.js
│   │   ├── questEvents.js
│   │   └── questRunClient.js           # friend roster + summary reads, unlock notification flow
│   ├── ui/
│   │   ├── ConversationOverlay.js      # post-third-quest summary trigger and duplicate-text fix surface
│   │   ├── LoreCodexOverlay.js
│   │   ├── FriendRosterOverlay.js      # NEW: active friends menu
│   │   └── QuestToast.js
│   └── playtestProgression.js          # persistent active-character and spawn progression state
└── scripts/
    └── validateDungeons.mjs
```

**Structure Decision**: The feature remains a two-module localhost integration. No new top-level package is needed; instead, the plan adds one new bridge route family and one new game overlay while extending the existing progression and NPC placement systems.

## Complexity Tracking

No constitution violations; no complexity exceptions required.
