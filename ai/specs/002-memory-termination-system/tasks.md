# Tasks: NPC Memory and Conversation Termination System

**Input**: `specs/002-memory-termination-system/` design documents  
**Branch**: `002-memory-termination-system` | **Date**: 2026-04-16

**Organization**: Tasks grouped by user story — each story is independently implementable and testable.  
**Tests**: Not included (not requested in spec).  
**Stack**: TypeScript 5.4 / Node.js 20 ESM | `openai ^4.x` | `chalk ^5.x` | `readline` (built-in) | `fs/promises` (atomic JSON persistence)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies on incomplete tasks)
- **[Story]**: User story the task belongs to (US1–US5, matching spec scenarios 1–5)

---

## Phase 1: Setup

**Purpose**: Runtime directory and gitignore — must complete before any memory files are created.

- [x] T001 Add `memory/` to `ai/.gitignore` so runtime state files are never committed
- [x] T002 Add startup routine to auto-create `memory/characters/` directory tree if absent (will be called in `src/index.ts` before session begins)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, atomic persistence helpers, and session state extensions required by every user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Extend `src/types.ts` — add `PlayerProfile` (emotional scores: `isolation`, `hope`, `burnout`; behavioral traits: `trustsQuickly`, `seeksValidation`, `skepticism`, `riskTolerance`), `PlayerSummary` (`playerGlobal`, `recentArc` strings), `CharacterMemory` (relationship metrics, archetype, questLevel, flags, promptSummary, keyMemories array), `AuthoritativeState` (player level/quests, world flags), `ConversationState` (phase enum `ACTIVE | ESCALATION | DECISION | TERMINATION`, questOffered, terminationReason, frozen boolean), and `ConversationFeatures` (7 numeric fields from research.md)
- [x] T004 Create `src/memory/store.ts` — implement `readJson<T>(path): Promise<T | null>`, `writeJsonAtomic(path, data): Promise<void>` (write to `.tmp` file then `fs.rename`), `defaultPlayerProfile(): PlayerProfile`, `defaultCharacterMemory(archetype): CharacterMemory`, `loadAllMemory(characterName): Promise<{ playerProfile, playerSummary, characterMemory }>` (reads from `memory/` with defaults when files are absent)
- [x] T005 [P] Extend `src/session.ts` — add `conversationState: ConversationState` field to `Session`; add helpers `setPhase(session, phase): void`, `setQuestOffered(session, questId): void`, `freezeSession(session, reason): void`; update `createSession()` to initialize `conversationState` to `{ phase: "ACTIVE", questOffered: null, terminationReason: null, frozen: false }`
- [x] T006 [P] Create `src/memory/context.ts` — implement `buildEnrichedSystemPrompt(basePrompt: string, characterMemory: CharacterMemory, playerSummary: PlayerSummary): string` that appends relationship summary block and player summary block to the base character system prompt

**Checkpoint**: Types compile, store reads/writes files atomically, session carries conversation state.

---

## Phase 3: User Story 3 — Relationship Memory Update Pipeline (MVP Core) 🎯

**Goal**: After any conversation ends, behavioral signals are extracted from the transcript, relationship metrics are updated and clamped, prompt summaries are regenerated via LLM, and all memory files are persisted atomically to disk.

**Spec scenario**: Scenario 3 — "After any conversation ends, the system extracts behavioral signals from the exchange."

**Independent Test**: Run `npm run dev`, have a conversation with any character, then `/quit` → inspect `memory/player-profile.json` and `memory/characters/<name>.json` — numeric metrics must differ from their default values and match expected direction (e.g., if player agreed throughout, `trust` and `bond` should be higher than baseline).

- [x] T007 [US3] Create `src/features/extractor.ts` — implement `extractFeatures(history: HistoryEntry[]): ConversationFeatures` using regex pattern matching over player-role messages: `agreementRatio` (affirmative word count / total turns), `questionCount` (messages containing "?"), `hedgingFrequency` (occurrences of "maybe", "sort of", "probably", "think", "kind of"), `validationSeeking` ("do you think", "is that okay", "right?", "make sense?"), `selfDisclosureDepth` (feelings/fear/past keyword list), `contradictionCount` ("but", "however", "actually" correction patterns), `engagementLength` (mean word count per player message)
- [x] T008 [P] [US3] Create `src/memory/updater.ts` — implement `ARCHETYPE_MODIFIERS` table (enabler, opportunist, honest_one, parasite, mirror) per research.md; implement `updateCharacterMemory(memory: CharacterMemory, features: ConversationFeatures): CharacterMemory` using formula `clamp(0, 100, old * 0.80 + archetypeModifier * weightedDelta)` for each metric; implement `updatePlayerProfile(profile: PlayerProfile, features: ConversationFeatures): PlayerProfile`; implement `computeDerivedMetrics(memory: CharacterMemory): { manipulationPressure: number, favorability: number }` (derived only, never stored)
- [x] T009 [US3] Create `src/memory/summarizer.ts` — implement `generateSummaries(characterName: string, memory: CharacterMemory, profile: PlayerProfile): Promise<{ playerSummary: PlayerSummary, updatedMemory: CharacterMemory }>` by calling the local LLM (reuse the `OpenAI` client from `src/client.ts` base URL) with a structured prompt requesting JSON output containing `playerGlobal`, `recentArc`, `npcView`, `currentTactic`, `tension`; merge returned strings into `memory.promptSummary` and `PlayerSummary`
- [x] T010 [US3] Create `src/lifecycle/pipeline.ts` — implement `runPostConversationPipeline(session: Session): Promise<void>` that orchestrates: (1) `extractFeatures(session.history)`, (2) `updateCharacterMemory(...)`, (3) `updatePlayerProfile(...)`, (4) `generateSummaries(...)`, (5) `writeJsonAtomic` for each of `player-profile.json`, `player-summary.json`, `characters/<name>.json`; log each step with `chalk.dim`
- [x] T011 [US3] Wire pipeline into session exit in `src/index.ts` — in the SIGINT handler and `/quit` handler, call `await runPostConversationPipeline(session)` before `process.exit(0)`; show a `chalk.dim("Updating memory...")` status line while pipeline runs

**Checkpoint**: `/quit` after a conversation → pipeline runs → memory files exist on disk with updated metric values → re-run session → `/state` shows persisted values (once US4 exists) or verify by direct file inspection.

---

## Phase 4: User Story 5 — Memory Informs Next Conversation

**Goal**: When a player starts a new session with an NPC they've interacted with before, the NPC's system prompt includes the relationship history and player profile summary, visibly shaping its behavior.

**Spec scenario**: Scenario 5 — "The NPC responds in a way consistent with the established relationship arc."

**Independent Test**: Complete one session, let memory update. Start a second session with the same character → inspect the outbound system prompt (add a `console.log` temporarily) — it must contain the `npcView`, `currentTactic`, and `playerGlobal` strings from the persisted summary files.

**Dependencies**: Requires Phase 3 pipeline to have produced at least one memory file.

- [x] T012 [US5] Extend `src/index.ts` startup — after loading characters, call `loadAllMemory(startChar.name)` to read persisted memory; call `buildEnrichedSystemPrompt(startChar.systemPrompt, characterMemory, playerSummary)` to produce context-injected prompt; pass enriched prompt into `createSession()` as `activeCharacter.systemPrompt`
- [x] T013 [P] [US5] Extend `src/session.ts` — store the loaded `CharacterMemory` on the `Session` so pipeline and debug commands can access it without re-reading disk; add `activeMemory: CharacterMemory` field to `Session`; update `createSession()` to accept `characterMemory` as a parameter

**Checkpoint**: After two sessions with the same character, the NPC's tone in session 2 observably reflects the stored `currentTactic` and `npcView` from session 1's summary.

---

## Phase 5: User Story 1 — Quest Acceptance and Automatic Conversation Termination

**Goal**: When the player accepts a quest (via explicit keywords or LLM-classified intent), the conversation is frozen, the NPC delivers a final confirmation, the memory pipeline runs, the external game system is notified, and the session closes.

**Spec scenario**: Scenario 1 — "System detects acceptance, freezes the conversation ... Memory is updated and the game system is notified."

**Independent Test**: Start a session, say "yes I'll do it" or "okay, count me in" → conversation must freeze after the NPC's next response → `memory/characters/<name>.json` must be updated on disk → `memory/pending-notifications.json` must contain the quest notification payload (if no game API is running).

- [x] T014 [US1] Create `src/lifecycle/detector.ts` — implement `ACCEPTANCE_KEYWORDS` array ("yes", "okay", "fine", "i'll do it", "let's go", "count me in", "i accept", "sure", "i'll handle it", "i'll clear it"); implement `EXECUTION_FOLLOWUPS` array ("where do i go", "what do i need", "how do i help"); implement `checkRuleTrigger(text: string): boolean` (normalize to lowercase, check arrays); implement `classifyIntent(text: string, questContext: string): Promise<{ intent: "accept" | "reject" | "uncertain", confidence: number }>` (LLM call returning JSON); implement `detectAcceptance(text: string, questContext: string): Promise<boolean>` returning true if rule fires OR (model intent === "accept" AND confidence > threshold from env var `ACCEPT_CONFIDENCE_THRESHOLD`, default 75)
- [x] T015 [P] [US1] Create `src/notify/game-api.ts` — implement `notifyQuestStart(payload: { character, questId, playerState, relationshipSnapshot, terminationReason }): Promise<void>` that POSTs to `process.env.GAME_API_URL ?? "http://localhost:3000/quest/start"`; on network error or 5xx, append payload to `memory/pending-notifications.json`; on 4xx, log error and skip (do not retry); implement `retrySavedNotifications(): Promise<void>` that reads `pending-notifications.json` and re-sends each payload on session start
- [x] T016 [US1] Extend `src/lifecycle/pipeline.ts` — add `runWithNotification(session: Session, questId: string): Promise<void>` that calls `runPostConversationPipeline(session)` then `notifyQuestStart(...)` with a relationship snapshot from `session.activeMemory`
- [x] T017 [US1] Extend the `readline` message handler in `src/index.ts` — after each NPC response, if `session.conversationState.phase >= "ESCALATION"` call `detectAcceptance(userText, questContext)`; if true: call `freezeSession(session, "rule" | "model")`, generate one final NPC response with acceptance-confirmation framing, render it, call `runWithNotification(session, questId)`, then exit; if conversation phase is still ACTIVE, do not check acceptance

**Checkpoint**: Typing "yes I'll do it" during a session → conversation freezes after NPC's next response → pipeline runs → notification payload appears in `memory/pending-notifications.json` → process exits cleanly.

---

## Phase 6: User Story 2 — Player Exits Without Accepting

**Goal**: When the player quits without accepting a quest, memory still updates to reflect the partial interaction, and any pending notification from a prior failed delivery is retried on session start.

**Spec scenario**: Scenario 2 — "Memory is updated to reflect the partial interaction (relationship metrics still evolve). Game system is notified of the non-acceptance outcome."

**Independent Test**: Start a session, have a conversation, then `/quit` without saying yes → `terminationReason` must be "exit" → metrics must still update (same as US3 but with reason tagged) → no new notification sent to game API (exit is not quest acceptance).

**Dependencies**: Phase 3 pipeline already handles exit; this phase adds pending-notification retry on session start.

- [x] T018 [US2] Extend session exit handlers in `src/index.ts` — set `session.conversationState.terminationReason = "exit"` before calling `runPostConversationPipeline(session)` so the persisted memory records why the session ended
- [x] T019 [US2] Call `retrySavedNotifications()` at session start in `src/index.ts` (before readline loop begins) so any previously failed quest notifications are replayed

**Checkpoint**: `/quit` mid-conversation → memory files updated → `terminationReason` field in character memory file reads "exit" → on next session start, any `pending-notifications.json` entries are replayed.

---

## Phase 7: User Story 4 — Developer Memory Inspection Commands

**Goal**: Developer can inspect all memory layers, feature scores, and character state at runtime without leaving the terminal.

**Spec scenario**: Scenario 4 — "Developer invokes `/state` → system displays all active memory layers."

**Independent Test**: Run a session → `/state` shows player profile values and character metrics → `/features` shows 7 extracted feature scores from the current conversation → `/char <name>` shows full character memory → `/reload` reads updated files from disk → `/simulate_accept` triggers full pipeline and exits with `[SIMULATED]` label.

- [x] T020 [P] [US4] Extend `src/ui.ts` — add `renderState(playerProfile, playerSummary, characterMemory, conversationState)` (multi-section display with chalk formatting), `renderCharacterMemory(name, memory)` (full character detail with derived metrics), `renderConversationFeatures(features, state)` (7 scores with phase + termination trigger line) per contracts/cli-commands.md output formats
- [x] T021 [P] [US4] Add `/state` command handler in `src/index.ts` dispatch — call `renderState(session.activeMemory, loadedPlayerSummary, session.activeMemory, session.conversationState)`
- [x] T022 [P] [US4] Add `/char <name>` command handler in `src/index.ts` dispatch — call `store.loadAllMemory(name).characterMemory` (handle missing file error), call `renderCharacterMemory(name, memory)`
- [x] T023 [P] [US4] Add `/features` command handler in `src/index.ts` dispatch — call `extractFeatures(session.history)`, call `renderConversationFeatures(features, session.conversationState)`
- [x] T024 [US4] Add `/reload` command handler in `src/index.ts` dispatch — call `loadAllMemory(session.activeCharacter.name)`, rebuild enriched prompt, update `session.activeCharacter.systemPrompt` and `session.activeMemory`, print file modification timestamps
- [x] T025 [US4] Add `/simulate_accept` command handler in `src/index.ts` dispatch — set `terminationReason: "simulate"`, `frozen: true`, render a final NPC response with `chalk.dim("[SIMULATED]")` prefix, call `runWithNotification(session, "simulated_quest")`, exit

**Checkpoint**: All 5 commands work as documented in `contracts/cli-commands.md`; `/simulate_accept` produces same memory update behavior as genuine acceptance.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T026 [P] Add `ACCEPT_CONFIDENCE_THRESHOLD` env var support in `src/lifecycle/detector.ts` — read `parseInt(process.env.ACCEPT_CONFIDENCE_THRESHOLD ?? "75")` once at module load; document in `quickstart.md` (already present)
- [x] T027 [P] Add `GAME_API_URL` env var documentation comment in `src/notify/game-api.ts` — already used, add JSDoc noting default and expected format
- [x] T028 Update `src/ui.ts` help text — add all 5 new commands to the `/help` output (`/state`, `/char <name>`, `/features`, `/reload`, `/simulate_accept`)
- [x] T029 Verify `pnpm build` compiles cleanly with no TypeScript errors (`tsc --noEmit`); confirm `memory/` directory is auto-created on first run with an empty `characters/` subdirectory

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user story phases**
- **Phase 3 (US3 — Pipeline)**: Depends on Phase 2 — delivers MVP: memory persists after conversation
- **Phase 4 (US5 — Context Injection)**: Depends on Phase 3 (needs at least one memory file to inject)
- **Phase 5 (US1 — Termination)**: Depends on Phase 3 (pipeline must exist before termination triggers it)
- **Phase 6 (US2 — Exit Path)**: Depends on Phase 3 (same pipeline, different reason tag); independent of Phase 5
- **Phase 7 (US4 — Debug Commands)**: Depends on Phase 2 (types + store); can be developed alongside Phases 4–6
- **Phase 8 (Polish)**: Depends on all prior phases complete

### User Story Dependencies

- **US3 (P1)**: No dependencies within feature — foundation of all other stories
- **US5 (P2)**: Depends on US3 having produced memory files
- **US1 (P3)**: Depends on US3 pipeline; independent of US5
- **US2 (P4)**: Depends on US3 pipeline; independent of US1 and US5
- **US4 (P5)**: Depends on Phase 2 types/store only; independent of US1–US3 implementations

### Parallel Opportunities

**Within Phase 2**:
- T005 (`session.ts` extension) and T006 (`memory/context.ts`) can run in parallel — different files, both depend on T003 types only

**Within Phase 3**:
- T007 (`features/extractor.ts`) and T008 (`memory/updater.ts`) can run in parallel — different files, no dependency between them
- T009 (`memory/summarizer.ts`) can start after T008 (needs archetype types)
- T010 (`lifecycle/pipeline.ts`) depends on T007, T008, T009 all complete

**Within Phase 5**:
- T014 (`lifecycle/detector.ts`) and T015 (`notify/game-api.ts`) can run in parallel — independent files

**Within Phase 7**:
- T020 (rendering functions), T021 (`/state`), T022 (`/char`), T023 (`/features`) can all run in parallel — different output functions

---

## Parallel Example: Phase 3 (US3)

```
Parallel batch 1:
  Task T007 — Create src/features/extractor.ts
  Task T008 — Create src/memory/updater.ts

Sequential:
  Task T009 — Create src/memory/summarizer.ts  (needs updater types)

Sequential:
  Task T010 — Create src/lifecycle/pipeline.ts  (needs T007, T008, T009 complete)

Sequential:
  Task T011 — Wire pipeline into index.ts exit handlers  (needs T010)
```

---

## Implementation Strategy

### MVP (US3 only — Phases 1–3)

1. Phase 1: Add gitignore entry; add directory init
2. Phase 2: Write types, store, session extensions, context builder
3. Phase 3: Write extractor, updater, summarizer, pipeline; wire into `/quit`
4. **STOP**: `/quit` after a conversation → inspect `memory/*.json` files → metrics updated and readable

This is the smallest complete slice: memory persists correctly after a session. All other user stories extend from here.

### Incremental Delivery

1. **MVP (Phases 1–3)** → memory pipeline works; files written on exit
2. **Add US5 (Phase 4)** → second session with same character uses prior memory in prompt
3. **Add US1 (Phase 5)** → saying "yes" terminates conversation and triggers pipeline automatically
4. **Add US2 (Phase 6)** → exit path tagged correctly; pending notifications retried on start
5. **Add US4 (Phase 7)** → all debug commands working; `/simulate_accept` validates pipeline end-to-end
6. **Polish (Phase 8)** → env var tuning, help text, build verification

---

## Notes

- `src/types.ts` must be written before any other module (all imports originate here)
- The `OpenAI` client base URL (`http://localhost:1234/v1`) is shared between `client.ts` (chat) and `summarizer.ts` + `detector.ts` (classification); avoid duplicating the client — export a shared instance or accept it as a parameter
- `writeJsonAtomic` uses `fs.promises.rename` which is atomic on Linux/macOS; no additional locking needed for single-process Node
- `memory/` files should be pretty-printed (`JSON.stringify(data, null, 2)`) for developer inspectability
- The `mirror` archetype modifier dynamically mirrors the dominant player trait — implement as a runtime lookup against `PlayerProfile` rather than a static table entry
- All `chalk` calls use ESM default import (`import chalk from "chalk"`)
- The `ESCALATION` phase detection (NPC introducing a quest) is currently manual — the NPC must call `setPhase(session, "ESCALATION")` and `setQuestOffered(session, questId)` from within the response handling. For first pass, this can be triggered by a `/quest <id>` developer command until automatic NPC-side detection is built
