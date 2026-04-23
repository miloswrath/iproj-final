# Implementation Plan: HTTP API Conversation Service

**Branch**: `001-http-api-conversations` | **Date**: 2026-04-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/home/zak/school/s26/iproj/final/specs/001-http-api-conversations/spec.md`

## Summary

Convert the existing terminal-only AI conversation runtime into a localhost HTTP service that supports multi-conversation sessions via explicit `conversationId`, while preserving existing lifecycle detection, memory persistence semantics, and outbound `/quest/start` notification retry behavior. The implementation adds a conversation session registry, idempotency-safe message/end handling, state-read endpoint, auto-timeout cleanup, and standardized error responses.

## Technical Context

**Language/Version**: TypeScript 5.4 / Node.js 20 (ESM)  
**Primary Dependencies**: `openai ^4.x`, `chalk ^5.x` (existing runtime); Node built-in HTTP server and existing project modules for lifecycle and notification  
**Storage**: In-memory active session registry + in-memory short TTL terminated replay cache; persistent memory and pending notification JSON files under `memory/`  
**Testing**: Manual integration testing via curl/http client scripts (no automated test runner currently configured)  
**Target Platform**: Localhost Linux/macOS developer machine  
**Project Type**: Backend web service (within existing `ai/` module)  
**Performance Goals**: 95% of valid requests complete in under 2 seconds in local playtest conditions  
**Constraints**: Localhost-only deployment, no auth for v1, must preserve existing dialogue/lifecycle behavior, must remain retry-safe under client retries  
**Scale/Scope**: Single process service handling multiple concurrent conversation IDs; small in-memory maps and JSON persistence files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-Design Gate Review (PASS)**

- **I. Gameplay-First Core Loop**: PASS — feature supports contract/quest flow by making companion conversation callable from game loop, without introducing narrative dependency.
- **II. System-Modular Separation (AI and Game)**: PASS — changes are scoped to `ai/` with explicit HTTP interface boundaries for game integration.
- **III. Deterministic Progression and Risk Clarity**: PASS — AI service remains lifecycle source-of-truth, reducing ambiguous transition behavior.
- **IV. AI Companion Runtime Boundaries**: PASS — existing state-driven detection/pipeline logic is reused; no narrative expansion.
- **V. Localhost-Only Deployment Boundary**: PASS — contract targets localhost integration only.

No constitutional violations identified.

## Project Structure

### Documentation (this feature)

```text
/home/zak/school/s26/iproj/final/specs/001-http-api-conversations/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── http-api-v1.md
└── tasks.md  # created later by /speckit.tasks
```

### Source Code (repository root)

```text
/home/zak/school/s26/iproj/final/ai/
├── src/
│   ├── server.ts                 # new HTTP server entrypoint
│   ├── routes/
│   │   └── conversation.ts       # new route handlers + request/response mapping
│   ├── session-registry.ts       # new multi-conversation active/terminated caches
│   ├── lifecycle/
│   │   ├── detector.ts           # reused detection logic
│   │   └── pipeline.ts           # reused post-conversation pipeline
│   ├── notify/
│   │   └── game-api.ts           # reused outbound retry behavior
│   ├── client.ts                 # reused LLM conversation calls
│   ├── session.ts                # adapted for per-conversation state container
│   ├── characters.ts             # reused character loading/validation
│   ├── types.ts                  # extended request/response + state types
│   └── index.ts                  # existing TUI entrypoint (kept; may share core logic)
└── docs/
    └── api/
        └── README.md             # update inbound API documentation
```

**Structure Decision**: Keep a single-project layout under `ai/`, extending existing modules and adding HTTP-facing orchestration files without coupling game logic into AI internals.

## Phase 0: Research Output Summary

Research decisions are documented in [research.md](research.md), resolving transport, session lifecycle, idempotency, and timeout/cache behavior choices.

## Phase 1: Design Output Summary

- Data model: [data-model.md](data-model.md)
- HTTP contract: [contracts/http-api-v1.md](contracts/http-api-v1.md)
- Integration setup and validation: [quickstart.md](quickstart.md)

## Constitution Check (Post-Design)

**Post-Design Gate Review (PASS)**

- Design keeps AI/game boundary explicit through documented HTTP contract.
- Localhost-only usage remains explicit in quickstart and contract assumptions.
- Gameplay support remains mechanical (quest/phase transitions), not narrative.
- No new hidden progression logic introduced; lifecycle source-of-truth is explicit.

## Complexity Tracking

No constitutional violations or additional complexity waivers required.

## Implementation Notes

- Implemented HTTP runtime entrypoint in `ai/src/server.ts` with inbound `/conversation/*` routes.
- Added session registry, idempotency replay handling, timeout sweep, and terminated TTL cache.
- Preserved memory pipeline and notification retry integration through existing lifecycle modules.
- Pending validation: full manual acceptance run from `quickstart.md` once local TypeScript tooling (`tsx`) is installed.
