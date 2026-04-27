---
description: "Task list for AI NPC integration (first crossover of ai/ and playtest/)"
---

# Tasks: AI NPC Integration — First Crossover

**Input**: Design documents from `/specs/004-ai-npc-integration/`
**Branch**: `004-ai-npc-integration`
**Prerequisites**: plan.md, spec.md (loaded), research.md, data-model.md, contracts/{bridge-http,bridge-sse,notify-loopback}.md, quickstart.md

**Tests**: Contract tests are included for the bridge HTTP/SSE/loopback surface — required by plan.md (Principle II "tested at interface boundaries"). Browser-side validation is manual via Chromium per spec FR-010.

**Organization**: Three user stories from spec.md mapped to phases. Phase 3 (US1) is the MVP slice: a single playable NPC conversation. Phases 4 (US2) and 5 (US3) are independently deliverable on top.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different file from other tasks in the same phase, no dependency on an incomplete task in the same phase.
- **[Story]**: Maps task to spec.md user story (US1, US2, US3). Setup / Foundational / Polish phases have no story label.

## Path Conventions

- Bridge backend: `ai/src/server/...`, tests under `ai/tests/server/...`
- Browser frontend: `playtest/src/game/...`
- Shared assets: `assets/characters/girl-1/`
- All paths shown are absolute from repo root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project-wide configuration that does not depend on, and is not specific to, any user story.

- [X] T001 [P] Add `"dev:server": "tsx src/server/http.ts"` script to `ai/package.json` (alongside existing `dev`, `build`, `start`, `test` scripts).
- [X] T002 [P] Configure Vite dev-server proxy in `playtest/vite.config.js` so `/api` and `/events` requests forward to `http://127.0.0.1:3000` (preserves same-origin in the browser; see research.md R6).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Bridge skeleton that all three user stories sit on top of.

**⚠️ CRITICAL**: Phases 3, 4, and 5 cannot start until this phase completes. The four `routes/*.ts` files are scaffolded as no-op `register(server)` exports here so each story can fill in its own file without touching `http.ts` again — avoiding cross-story merge conflicts on the central server bootstrap.

- [X] T003 [P] Create `ai/src/server/eventBus.ts` exporting a singleton `EventEmitter` with typed `emit("quest_start", QuestNotificationEvent)` / `emit("quest_complete", QuestNotificationEvent)` helpers and a `subscribe(listener)` returning an unsubscribe function (per data-model "QuestNotificationEvent").
- [X] T004 [P] Create `ai/src/server/sessionRegistry.ts` exporting a `Map<string, ConversationSession>` wrapper with `create(session, profile, summary)`, `get(sessionId)`, `remove(sessionId)`, and a 30-minute idle TTL sweeper started on first registry use (per data-model "ConversationSession" lifecycle, R13).
- [X] T005 Create `ai/src/server/http.ts` (native `node:http` server) with: JSON body parser helper, JSON error response helper, loopback-host guard refusing to bind anything other than `127.0.0.1` / `::1` (BridgeServerConfig invariant), route table that imports `register(server)` from each of `routes/conversation.ts`, `routes/events.ts`, `routes/questNotifications.ts`, `routes/questCompletion.ts`, startup banner `[bridge] listening on http://127.0.0.1:3000`, and a call to `retrySavedNotifications()` from `ai/src/notify/game-api.ts` on boot. Also create the four stub route files at `ai/src/server/routes/{conversation,events,questNotifications,questCompletion}.ts`, each exporting `export function register(_server: import("http").Server) {}` for now. (depends on T003, T004)

**Checkpoint**: `pnpm --filter ai-chat run dev:server` boots, logs the listening banner on `127.0.0.1:3000`, and responds to any HTTP request with `404 not_found`. Existing `ai/src/index.ts` TUI continues to run in a separate process.

---

## Phase 3: User Story 1 — Approach NPC and Start a Conversation (Priority: P1) 🎯 MVP

**Goal**: Player walks to the Girl_1 NPC, presses **E**, opens a conversation panel that round-trips text through the AI bridge to LM Studio and back.

**Independent Test**: With LM Studio + bridge + Vite running, open Chromium → walk to the NPC sprite → press **E** → see the parchment overlay open with an AI-generated greeting → type a message → see a reply. Acceptance scenarios 1–3 of spec User Story 1 satisfied.

### Tests for User Story 1

- [X] T006 [P] [US1] Contract tests for the conversation HTTP surface in `ai/tests/server/conversation-routes.test.ts` covering cases C-1, C-2, C-3, C-4, C-5, C-6, C-7, and C-10 from `contracts/bridge-http.md`. Use `tsx --test` (existing convention). Spin up the server on an ephemeral port per test, hit it with `fetch`, assert response shape and side effects (registry size, memory file timestamps where applicable).

### Implementation for User Story 1

- [X] T007 [P] [US1] Copy the three Girl_1 PNGs from `assets/_source/craftpix-net-242415-free-schoolgirls-anime-character-pixel-sprite-pack/Girl_1/` into a new `assets/characters/girl-1/` directory, lowercased: `idle.png`, `walk.png`, `dialogue.png` (per research.md R8).
- [X] T008 [US1] Add three import statements + corresponding `assetPaths` exports in `playtest/src/game/assetPaths.js`: `npcGirl1IdleUrl`, `npcGirl1WalkUrl`, `npcGirl1DialogueUrl`. (depends on T007)
- [X] T009 [US1] Register Girl_1 spritesheets in `playtest/src/game/scenes/PreloadScene.js` with `frameWidth: 128, frameHeight: 128` (verified dimensions per research.md R7) under keys `npc-girl-1-idle`, `npc-girl-1-walk`, `npc-girl-1-dialogue`. (depends on T008)
- [X] T010 [US1] Implement conversation route handlers in `ai/src/server/routes/conversation.ts` — `POST /api/v1/conversation/start`, `POST /api/v1/conversation/:sessionId/message`, `POST /api/v1/conversation/:sessionId/end`. Wire existing modules: `loadCharacters` (`PROMPTS_DIR = ai/docs/prompts`), `findCharacter`, `loadAllMemory`, `buildEnrichedSystemPrompt`, `createSession`, `sendMessage`, `detectQuestOffer`, `detectAcceptance`, `setQuestOffered`, `freezeSession`, `runWithNotification`, `runPostConversationPipeline`, `notifyQuestComplete`. Use UUID v4 for sessionIds (`crypto.randomUUID()`). Manage lifetime via `sessionRegistry` (T004). Map LM Studio failure to HTTP 503 `lm_studio_unavailable`. Implement the "introduce yourself briefly" greeting on `/start` (research.md R4). Match the response shapes in `contracts/bridge-http.md`. (depends on T005, T006)
- [X] T011 [P] [US1] Create the browser AI client in `playtest/src/game/services/aiClient.js` exposing `startConversation(character)`, `sendMessage(sessionId, text)`, `endConversation(sessionId, reason = "exit")`. Each function throws a typed error (`AiClientError` with `code` and `httpStatus`) on non-2xx so the overlay can render specific error copy.
- [X] T012 [US1] Create `playtest/src/game/ui/ConversationOverlay.js` — Phaser overlay matching `InventoryOverlay` palette (`0xe8d1a2` parchment, `0x55361f` outer stroke, `0x59b68a` header band, monospace text), three regions: left portrait (frame 0 of `npc-girl-1-dialogue`, ~128×128 displayed), center scrolling dialogue panel (newest-last, monospace), bottom DOM input (Phaser `add.dom().createFromHTML('<input type="text" />')` styled to match). Toggle keys: open via external API (`open(npcConfig)`), close on `Esc` (calls `aiClient.endConversation` best-effort). Handles awaiting state (typing indicator), error banner (with retry), and terminated state (auto-close 1500 ms after final NPC line). Imports from `aiClient` (T011). (depends on T011)
- [X] T013 [P] [US1] Create `playtest/src/game/npc/npcConfig.js` exporting `npcs` array with one entry: `{ id: 'girl-1-east', archetype: 'general', spriteKey: 'npc-girl-1-idle', portraitKey: 'npc-girl-1-dialogue', overworldTile: { x: 18, y: 12 }, interactionRadius: 36, displayName: 'Girl' }`. Plus a `resolveNpcConfig(id)` helper. (Place a `getActiveArchetype(npc)` returning the archetype with no override for now — T026 adds the URL-param override.)
- [X] T014 [US1] Add `aiNpcs` array to the layout in `playtest/src/game/overworld/overworldLayout.js` derived from `npcConfig.npcs` so the OverworldScene reads NPC tile positions from one source. Pick a tile location near the spawn that is on a walkable surface and not colliding with existing town NPCs / decor. (depends on T013)
- [X] T015 [US1] Render Girl_1 NPC + interaction in `playtest/src/game/scenes/OverworldScene.js`: in `create()`, iterate `layout.aiNpcs`, instantiate a sprite at the tile center using `spriteKey`, scale 0.5 (per R7), depth-sort with the existing y+offset pattern; create idle animation `npc-girl-1-idle-loop` (frames 0..end, frameRate 6, repeat -1); add a proximity check in `update()` that shows a small "[ E ]" prompt above the NPC when player is within `interactionRadius`; add `Phaser.Input.Keyboard.KeyCodes.E` listener that opens a single `ConversationOverlay` instance (lazy-created and cached on the scene) when in range; while overlay `isOpen`, suppress player movement keys (skip the velocity-update block but keep the camera + animations updating). (depends on T009, T012, T014)

**Checkpoint**: All 5 acceptance scenarios for spec User Story 1 are satisfied. The MVP is shippable here. Validate against quickstart.md §4 steps 1–3.

---

## Phase 4: User Story 2 — Receive a Quest Notification In-Game (Priority: P2)

**Goal**: When the AI emits `quest_start` or `quest_complete`, a small auto-dismissing toast appears in the HUD without blocking gameplay.

**Independent Test**: With bridge + Vite running, in Chromium devtools console run `await fetch('/quest/start', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({character:'general', questId:'test_L1_demo', playerState:{level:1}, relationshipSnapshot:{trust:50,dependency:50,bond:50,wariness:50}, terminationReason:'rule'})})`. A small parchment toast labelled "Demo" / "Quest started" appears top-right and fades after 4 s without blocking movement. Acceptance scenarios 1–3 of spec User Story 2 satisfied.

### Tests for User Story 2

- [X] T016 [P] [US2] Contract tests for loopback receivers in `ai/tests/server/notify-loopback.test.ts` covering cases L-1, L-2, L-3, L-4, L-5 from `contracts/notify-loopback.md`. Test must verify that calling `notifyQuestStart` from the same process (the bridge) results in an `eventBus` emission within 100 ms, and that bridge-down → `pending-notifications.json` retry → bridge-up replays exactly once.
- [X] T017 [P] [US2] Contract tests for SSE in `ai/tests/server/events-sse.test.ts` covering cases S-1, S-2, S-3, S-4, S-5 from `contracts/bridge-sse.md`. Use a raw `http.request` client that reads the chunked stream rather than EventSource (no DOM in Node tests). Assert `: connected`, periodic ping, `event: quest_start` arrival on `eventBus.emit`, and clean cleanup on req close.
- [X] T018 [P] [US2] Contract tests for `POST /api/v1/quest/complete` in `ai/tests/server/quest-complete-route.test.ts` covering cases C-8 and C-9 from `contracts/bridge-http.md` (invalid outcome → 400; duplicate completion → `{applied:false, reason:"duplicate"}`).

### Implementation for User Story 2

- [X] T019 [P] [US2] Implement loopback receivers in `ai/src/server/routes/questNotifications.ts` — `POST /quest/start` and `POST /quest/complete` parse the existing `QuestStartPayload` / `QuestCompletionPayload` shapes from `ai/src/types.ts`, emit `{kind, payload, receivedAt}` on `eventBus` (T003), respond `200` with empty body. Best-effort validation only (log warning on missing fields, never reject — the existing `notify/game-api.ts` retry semantics depend on 2xx). (depends on T005, T003, T016)
- [X] T020 [P] [US2] Implement SSE endpoint in `ai/src/server/routes/events.ts` — `GET /api/v1/events` writes headers `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no`; sends `: connected\n\n` immediately, schedules a `: ping\n\n` every 25 s; subscribes to `eventBus`; on each event writes `event: <kind>\nid: <ms>-<seq>\ndata: <json>\n\n`; on `req.on("close", ...)` clears the heartbeat interval and unsubscribes. (depends on T005, T003, T017)
- [X] T021 [P] [US2] Implement quest completion endpoint in `ai/src/server/routes/questCompletion.ts` — `POST /api/v1/quest/complete` validates outcome ∈ {success,failure,abandoned} and character ∈ loaded prompts, builds a `QuestCompletionPayload` (with `eventTimestamp = new Date().toISOString()` if missing), passes to `runQuestCompletionPipeline` against a synthetic empty `Session` (since browser doesn't own a session here — see how `index.ts` /complete handler does it), then calls `notifyQuestComplete`. Response shape `{applied, reason}` per `contracts/bridge-http.md`. (depends on T005, T018)
- [X] T022 [P] [US2] Create `playtest/src/game/services/questEvents.js` — opens `new EventSource('/api/v1/events')`, listens for `quest_start` and `quest_complete` events, exposes a Phaser-style `onQuestStart(handler)` / `onQuestComplete(handler)` API plus `dispose()` that closes the EventSource. Logs reconnect attempts with `[questEvents]` prefix.
- [X] T023 [P] [US2] Create `playtest/src/game/ui/QuestToast.js` — Phaser `Container` factory `spawnQuestToast(scene, {kind, title, bodyLine})`. Anchored top-right (`scene.scale.width - 24, 24 + stackOffset`), parchment palette matching InventoryOverlay, ✦ glyph + title-cased title + body line, 4 s lifetime with 200 ms fade-in / 250 ms fade-out tweens. Maintains a module-local `activeToasts` array; max 2 visible — incoming third triggers oldest's early fade. Cleanup destroys all child game objects.
- [X] T024 [US2] Create `playtest/src/game/ui/HUDController.js` — constructor `(scene)` opens `questEvents` (T022), wires `onQuestStart` / `onQuestComplete` handlers that derive a title from the `questId` slug (`general_L1_clear-the-cellar` → `Clear The Cellar`) and call `spawnQuestToast` (T023); exposes `destroy()` that disposes the EventSource and removes any visible toasts. (depends on T022, T023)
- [X] T025 [US2] Add `this.hud = new HUDController(this);` in `OverworldScene.create()` (after the existing landmark/portal renders, before the player update loop) and `this.events.once('shutdown', () => this.hud.destroy())`. Single-line edit; coordinates with T015 which also touches `OverworldScene.js` — apply T025 after T015 (sequential edit on same file). (depends on T024)

**Checkpoint**: User Story 2 testable independently of acceptance flow — toasts render via the manual `fetch` in the independent test. With both US1 and US2 done, the full happy path (talk → accept → toast → manual quest_complete fetch → toast) works.

---

## Phase 5: User Story 3 — Character Archetype Is Selectable (Priority: P3)

**Goal**: All six archetypes (`general`, `enabler`, `opportunist`, `honest`, `mirror`, `parasite`) selectable while the visual remains Girl_1.

**Independent Test**: Open Chromium with `?archetype=parasite` (and the other five values), speak to the NPC, and confirm the conversation tone differs while the rendered sprite is unchanged. Acceptance scenarios 1–2 of spec User Story 3 satisfied.

- [X] T026 [US3] Add URL-param override in `playtest/src/game/npc/npcConfig.js` — extend `getActiveArchetype(npc)` to read `new URLSearchParams(window.location.search).get('archetype')`; if present, validate against the six known archetype names and return the override; on unknown value, `console.warn('[npcConfig] Unknown archetype "<value>", defaulting to <npc.archetype>')` and return the default. (depends on T013)
- [X] T027 [P] [US3] Add startup pre-flight in `ai/src/server/http.ts` — after route registration, call `loadCharacters(PROMPTS_DIR)` once and log `[bridge] characters loaded: <count> [names...]`. If any of the six expected archetype names is missing from the loaded set, log `[bridge] WARNING: missing archetype prompt files: <names>`.
- [ ] T028 [US3] Manual Chromium verification — for each of `?archetype=general|enabler|opportunist|honest|mirror|parasite`, open the playtest, speak to Girl_1, send "tell me about yourself" + 2 follow-ups, screenshot or note distinguishable conversational tone (per quickstart.md §5, SC-003). Confirm the sprite remains `npc-girl-1-idle` across all six.

**Checkpoint**: All three user stories independently testable. Spec FR-008 and FR-009 satisfied.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T029 [P] Run `pnpm test` from `ai/` and confirm all bridge contract tests (T006, T016, T017, T018) plus existing test suite pass (per Constitution Principle II "tested at interface boundaries").
- [ ] T030 Run the full quickstart.md §4 end-to-end smoke test in Chromium — LM Studio + bridge + Vite all running; complete one conversation through quest acceptance; trigger `quest_complete` via devtools fetch; confirm two toasts and conversation overlay all behave per spec (FR-010, SC-001, SC-002, SC-004, SC-005).
- [X] T031 Constitution checkpoint review per quickstart.md §8 — verify (a) the dungeon entry portal in `OverworldScene.renderDungeonPortal()` still works without speaking to the NPC (Principle I), (b) `lsof -i :3000` shows the bridge bound only to `127.0.0.1` (Principle V), (c) `pnpm dev` (TUI) and `pnpm dev:server` (bridge) both still work standalone (Principle II), (d) toast pixel height ≤ 72 px on a 720 px-tall canvas (10 % cap, SC-002).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001 and T002 can start immediately and in parallel.
- **Foundational (Phase 2)**: Depends on Setup. T003, T004 in parallel; T005 depends on both. **BLOCKS** all user stories.
- **User Stories (Phases 3-5)**: All depend on Foundational. After Phase 2 they can proceed in parallel by different developers, with one merge coordination point on `OverworldScene.js` between T015 (US1) and T025 (US2).
- **Polish (Phase 6)**: Depends on all user stories complete.

### User Story Dependencies

- **US1 (P1)**: Independent of US2 and US3. Can ship as MVP.
- **US2 (P2)**: Independent of US1 functionally — independent test uses a manual `fetch`; in production usage US2 is most useful after US1 because acceptance triggers `quest_start`. Shares `OverworldScene.js` edits with US1 (sequential, not concurrent).
- **US3 (P3)**: Depends on US1's `npcConfig.js` (T013) and conversation routes (T010) existing. US3 is mostly verification + a small URL-param parser.

### Within Each User Story

- Tests (T006, T016, T017, T018) MUST be written before the matching implementation tasks (T010, T019, T020, T021).
- Models / pure-data files (`npcConfig`, `eventBus`, `sessionRegistry`) before consumers.
- Routes implemented before scene wiring.

### Parallel Opportunities

- **Phase 1**: T001 ∥ T002 (different repo files).
- **Phase 2**: T003 ∥ T004; T005 sequential.
- **Phase 3 (US1)**: T006 (tests) ∥ T007 (asset copy) ∥ T011 (aiClient) ∥ T013 (npcConfig). Then T008 → T009; T012 after T011; T014 after T013; T010 after T006 + T005; T015 after T009 + T012 + T014.
- **Phase 4 (US2)**: T016 ∥ T017 ∥ T018 ∥ T022 ∥ T023 (all different files, independent). T019 / T020 / T021 in parallel after their tests. T024 after T022 + T023; T025 sequential after T024.
- **Phase 5 (US3)**: T026 ∥ T027 (different files). T028 manual.
- **Phase 6**: T029 in parallel with T030 / T031 if a second tester is available.

---

## Parallel Example: User Story 1

```bash
# After Phase 2 completes, kick off these four in parallel:
Task: "T006 contract tests in ai/tests/server/conversation-routes.test.ts"
Task: "T007 copy Girl_1 PNGs to assets/characters/girl-1/"
Task: "T011 aiClient service in playtest/src/game/services/aiClient.js"
Task: "T013 npcConfig in playtest/src/game/npc/npcConfig.js"

# Then converge:
T008 (assetPaths.js after T007) → T009 (PreloadScene.js)
T010 (conversation.ts after T006) — bridge route impl
T012 (ConversationOverlay after T011)
T014 (overworldLayout after T013)
# Finally:
T015 (OverworldScene wiring after T009 + T012 + T014)
```

## Parallel Example: User Story 2

```bash
# All five test + service files can be authored simultaneously:
Task: "T016 notify-loopback tests"
Task: "T017 events-sse tests"
Task: "T018 quest-complete-route tests"
Task: "T022 questEvents.js"
Task: "T023 QuestToast.js"

# Then:
Task: "T019 questNotifications.ts (after T016)"
Task: "T020 events.ts (after T017)"
Task: "T021 questCompletion.ts (after T018)"
Task: "T024 HUDController.js (after T022 + T023)"

# Finally:
T025 (one-line OverworldScene edit, sequential after T015)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001-T002) — ~10 min.
2. Phase 2: Foundational (T003-T005) — bridge skeleton.
3. Phase 3: User Story 1 (T006-T015) — playable conversation.
4. **STOP and VALIDATE**: Run quickstart §4 steps 1–3. The conversation panel and AI roundtrip are the demonstrable outcome.

### Incremental Delivery

1. Setup + Foundational → bridge boots, `404`s every request.
2. + US1 → MVP: conversation works. Demo-able.
3. + US2 → quest toasts visible. Acceptance flow end-to-end.
4. + US3 → all six archetypes verified. Feature complete.
5. Polish phase → guardrail verification.

### Coordination Notes

- **Single-file edit conflict**: T015 (US1) and T025 (US2) both edit `OverworldScene.js`. Apply T015 first; T025 is a single-line addition with no logical conflict, but they MUST be applied sequentially.
- **Single-file edit conflict**: T013 (US1) and T026 (US3) both edit `npcConfig.js`. Apply T013 first; T026 extends the helper exported by T013.
- **No new dependencies are introduced.** If the task author is tempted to `pnpm add <something>`, stop and revisit research.md R2 / R11 first.

---

## Notes

- All file paths are absolute from repo root.
- `[P]` only when a task touches a different file from every concurrent task **and** has no dependency on an incomplete task in the same phase.
- Browser-side has no automated test harness in this pass; Chromium validation (T028, T030, T031) stands in.
- Constitution Principle II ("tested at interface boundaries") is satisfied by the contract tests T006, T016, T017, T018 — not by browser-side unit tests.
- Existing `ai/src/notify/game-api.ts` is **not** modified by any task; loopback POSTs to `localhost:3000/quest/{start,complete}` continue as today.
- Existing `ai/src/index.ts` TUI is **not** modified by any task; both the TUI and the bridge can run simultaneously.
