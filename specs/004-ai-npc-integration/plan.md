# Implementation Plan: AI NPC Integration — First Crossover

**Branch**: `004-ai-npc-integration` | **Date**: 2026-04-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-ai-npc-integration/spec.md`

## Summary

First integration crossover between the previously independent `ai/` (Node.js LM Studio companion CLI) and `playtest/` (Phaser browser game) modules. A player approaches a Girl_1 NPC in the overworld, opens a conversation panel that round-trips text to the AI backend, and receives small in-game quest notifications driven by the existing `quest_start` / `quest_complete` notification API.

The technical approach is a **localhost HTTP bridge** that lives inside the `ai/` package, exposes the AI conversation lifecycle as HTTP endpoints + an SSE event feed, and preserves the existing `notify/game-api.ts` POST contract by terminating those POSTs at the same bridge server (loopback) and re-emitting them as SSE events to the browser. The Phaser frontend consumes the bridge through a thin client service and renders both the conversation overlay (using the inventory UI's frame/tile language) and HUD toasts. No constitution violations.

## Technical Context

**Language/Version**: TypeScript 5.4 / Node.js 20 (ESM) for the AI bridge server. JavaScript ESM (Vite + Phaser 3.90) for the playtest frontend.
**Primary Dependencies**: `openai ^4.x` (existing, LM Studio HTTP client), Node native `node:http` (no new dep) for the bridge server, `phaser ^3.90` (existing) and `vite ^8` (existing) for the frontend. SSE implemented manually over the native HTTP response stream.
**Storage**: JSON files under `ai/memory/` (existing — `player-profile.json`, `player-summary.json`, `characters/<name>.json`, `pending-notifications.json`, `processed-completions.json`). No browser storage in this pass; conversation sessions are server-side and ephemeral per page load.
**Testing**: `tsx --test` for the bridge HTTP layer (existing convention from `ai/package.json`). Browser-side validation via Chromium per spec FR-010 — no browser unit test framework exists or is added in this pass.
**Target Platform**: Localhost only (constitution V). LM Studio at `localhost:1234`, bridge at `localhost:3000`, Vite dev server at `localhost:5173` proxying `/api/*` and `/events` to the bridge.
**Project Type**: Cross-module integration — backend HTTP service (`ai/`) + browser web app (`playtest/`).
**Performance Goals**: Conversation response within ~10 s of trigger under normal local conditions (SC-001) — dominated by LM Studio inference, not bridge overhead. SSE quest notifications delivered within ~250 ms of internal POST. Phaser overworld must stay at 60 fps with the new NPC sprite + conversation overlay rendered.
**Constraints**: Localhost-only; no external services; UI must not interrupt gameplay flow (constitution Mandatory Design Constraints); quest notification HUD ≤10% of vertical screen height (SC-002); idempotent quest completion handling (existing `processed-completions.json` mechanism); existing `notify/game-api.ts` HTTP retry contract MUST be preserved.
**Scale/Scope**: Single player, single browser tab, one active NPC (Girl_1), six selectable archetypes from `ai/docs/prompts/`. No concurrency beyond a single conversation at a time. No mobile/touch support.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Gameplay-First Core Loop** | PASS | NPC dialogue is gameplay-supportive — its sole gameplay output is a quest that drives overworld → dungeon → reward. Combat/dungeon mechanics are unchanged. Conversation is optional and never blocks the loop. |
| **II. System-Modular Separation** | PASS | `ai/` and `playtest/` remain in their bounded directories. The integration is **explicit** (HTTP + SSE contracts in `contracts/`), **versioned** (`/api/v1/...` path prefix), and **tested at the boundary** (contract tests for the bridge HTTP layer). No cross-imports between `ai/src/` and `playtest/src/`. |
| **III. Deterministic Progression and Risk Clarity** | PASS | Quest offers do not gate progression — the existing dungeon entry point still works without talking to the NPC (verified by leaving `OverworldScene` dungeon portal intact). Quest acceptance is a measurable, transparent event surfaced to the player as a toast. No hidden scaling. |
| **IV. AI Companion Runtime Boundaries** | PASS | Generation stays within the existing archetype system prompts (`ai/docs/prompts/`); LM Studio at `localhost:1234` is the only model server; output is constrained to dialogue + `quest_start` events; quest content is gameplay-supportive flavor, not narrative-required. The "goth-baddie companion" project-level constraint is unchanged by this feature (Girl_1 is the test NPC asset for this slice; the constraint applies at MVP, not per-feature). |
| **V. Localhost-Only Deployment Boundary** | PASS | Bridge binds `127.0.0.1:3000`; Vite dev server proxies same-origin; LM Studio is local; no outbound calls beyond LM Studio. |

**Mandatory Design Constraints**:

- Aligned with `docs/game-design/game-functionality.md` (companion-driven quest contracts) — confirmed by spec User Story 2.
- Conversation overlay is dismissable with a single keypress; HUD toasts auto-dismiss; gameplay input remains responsive while overlay is open via paused physics — see data-model `ConversationOverlay`.
- Companion system contributes directly to **dungeon access** (quest offer → quest start event → potential dungeon entry).
- Dialogue is functional, not narrative-required (the overworld → dungeon flow remains playable without speaking to the NPC).
- All generated/static content stays within existing archetype prompt boundaries.

**Result: PASS — no Complexity Tracking entries required.**

### Post-Design Re-Check (after Phase 1)

Reviewed after `research.md`, `data-model.md`, `contracts/*.md`, and `quickstart.md` were drafted. No design decision raised a new violation:

- **Principle II (modular separation)** is reinforced by Phase 1: contracts live in `specs/004-ai-npc-integration/contracts/`, the bridge lives entirely inside `ai/src/server/`, and the browser consumes a strict v1 HTTP/SSE surface with no shared file-system reads (data-model §"Cross-cutting integration invariants").
- **Principle V (localhost)** is enforced explicitly in `BridgeServerConfig`: the bridge refuses to bind a non-loopback host.
- The proactive greeting from `/start` (R4 / `bridge-http.md`) is archetype-prompted via the existing `Session` machinery — it is "state-driven dialogue" within the meaning of Principle IV.
- No new `[NEEDS CLARIFICATION]` markers introduced.

**Result: STILL PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/004-ai-npc-integration/
├── plan.md              # This file
├── research.md          # Phase 0 — open questions resolved
├── data-model.md        # Phase 1 — entities, fields, state transitions
├── quickstart.md        # Phase 1 — local dev bring-up steps
├── contracts/
│   ├── bridge-http.md   # Browser → Bridge HTTP contract
│   ├── bridge-sse.md    # Bridge → Browser SSE event contract
│   └── notify-loopback.md # ai/notify → Bridge POST contract (preserved)
└── checklists/
    └── requirements.md  # Spec quality checklist (already present)
```

### Source Code (repository root)

```text
ai/                                       # Existing AI companion module
├── src/
│   ├── server/                           # NEW — bridge HTTP server
│   │   ├── http.ts                       # NEW — entry point, route table, server bootstrap
│   │   ├── routes/
│   │   │   ├── conversation.ts           # NEW — POST /api/v1/conversation/{start,message,end}
│   │   │   ├── questCompletion.ts        # NEW — POST /api/v1/quest/complete (browser → ai)
│   │   │   ├── questNotifications.ts     # NEW — POST /quest/start, POST /quest/complete (loopback receivers)
│   │   │   └── events.ts                 # NEW — GET /api/v1/events (SSE)
│   │   ├── sessionRegistry.ts            # NEW — in-memory map of sessionId → Session + activePlayerSummary
│   │   └── eventBus.ts                   # NEW — Node EventEmitter shared by notify receivers and SSE clients
│   ├── characters.ts                     # Existing — reused
│   ├── session.ts                        # Existing — reused
│   ├── client.ts                         # Existing — reused for sendMessage
│   ├── lifecycle/                        # Existing — reused (detector, pipeline)
│   ├── memory/                           # Existing — reused (store, context, summarizer, updater)
│   ├── notify/game-api.ts                # Existing — reused unchanged; POSTs to localhost:3000 still work via loopback
│   └── index.ts                          # Existing TUI — unaffected
├── tests/
│   ├── server/
│   │   ├── conversation-routes.test.ts   # NEW — contract tests
│   │   ├── events-sse.test.ts            # NEW — SSE relay test
│   │   └── notify-loopback.test.ts       # NEW — verifies notify POST → SSE event
│   └── ...                               # Existing tests unchanged
└── package.json                          # Add `dev:server` script: `tsx src/server/http.ts`

playtest/                                 # Existing browser game
├── src/
│   ├── game/
│   │   ├── services/
│   │   │   ├── aiClient.js               # NEW — fetch wrapper for /api/v1/conversation/*
│   │   │   └── questEvents.js            # NEW — EventSource wrapper, dispatches quest_start/complete
│   │   ├── ui/
│   │   │   ├── ConversationOverlay.js    # NEW — Phaser overlay, mirrors InventoryOverlay UI language
│   │   │   ├── QuestToast.js             # NEW — small auto-dismissing HUD element
│   │   │   └── InventoryOverlay.js       # Existing — unchanged
│   │   ├── overworld/
│   │   │   └── overworldLayout.js        # MODIFY — add Girl_1 NPC entry with archetype + interaction zone
│   │   ├── scenes/
│   │   │   ├── OverworldScene.js         # MODIFY — render Girl_1 NPC, interaction prompt, wire ConversationOverlay
│   │   │   └── PreloadScene.js           # MODIFY — load Girl_1 spritesheets
│   │   ├── npc/
│   │   │   └── npcConfig.js              # NEW — single source of truth: NPC id → archetype, sprite key, position
│   │   └── assetPaths.js                 # MODIFY — add Girl_1 idle/walk/dialogue PNG imports
│   └── main.js                           # Existing — unchanged
├── vite.config.js                        # MODIFY — proxy /api and /events to http://localhost:3000
└── package.json                          # Unchanged

assets/
└── characters/
    └── girl-1/                           # NEW — copies of Girl_1/{Idle,Walk,Dialogue}.png from _source pack
```

**Structure Decision**: Cross-module integration touching both `ai/` (new bridge server alongside existing TUI) and `playtest/` (new overlay + services + NPC rendering). The bridge lives **inside `ai/`** (not as a new top-level package) because it is conceptually an HTTP frontend over existing AI functions — it only consumes `ai/src/*` modules and adds no new domain logic. This satisfies Principle II (modular separation) by keeping all AI logic in `ai/` and exposing it through a well-defined HTTP contract that `playtest/` consumes as a foreign service. The bridge is run as `pnpm --filter ai-chat run dev:server` and is independent of the existing CLI TUI.

## Complexity Tracking

> Constitution Check passed without violations. No entries.

