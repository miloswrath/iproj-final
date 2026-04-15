# Tasks: Local LLM Chat API with Terminal UI

**Input**: `specs/001-local-llm-chat-api/` design documents  
**Branch**: `1-finalize-story` | **Date**: 2026-04-14

**Organization**: Tasks grouped by user story — each story is independently implementable and testable.  
**Tests**: Not included (not requested in spec).  
**Stack**: TypeScript 5.4 / Node.js 20 ESM | `openai ^4.x` | `chalk ^5.x` | `readline` (built-in)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: User story the task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Project scaffolding — must complete before any source files can be built.

- [x] T001 Create `ai/package.json` with `"type": "module"`, scripts (`dev`, `build`, `start`), and dependencies (`openai ^4`, `chalk ^5`, `tsx`, `typescript`, `@types/node`)
- [x] T002 Create `ai/tsconfig.json` with `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `outDir: dist`, `rootDir: src`, `strict: true`
- [x] T003 Install dependencies — run `pnpm install` in `ai/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and state modules required by all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Create `ai/src/types.ts` — define `Message`, `Character`, `HistoryEntry` (discriminated union with `kind: "message"` and `kind: "switch"`), and `Session` interfaces
- [x] T005 [P] Create `ai/src/characters.ts` — implement `loadCharacters(promptsDir: string): Character[]` (globs `*.md`, reads each with `fs.readFileSync`) and `findCharacter(characters, name): Character | undefined` (case-insensitive)
- [x] T006 [P] Create `ai/src/session.ts` — implement `createSession(character): Session`, `appendMessage(session, role, content): void`, `appendSwitch(session, from, to, newCharacter): void`, and `getHistoryMessages(session): Message[]` (filters to `kind: "message"`, maps to `{role, content}`)

**Checkpoint**: Types and state modules complete — all user story phases can now begin.

---

## Phase 3: User Story 1 — Chat with a Selected Character (MVP) 🎯

**Goal**: Developer launches the tool, selects a character, sends a message, and receives an in-character LLM response.

**Independent Test**: `pnpm dev` → type `enabler` at startup → send any message → response reflects the enabler's tone and persona.

- [x] T007 [US1] Create `ai/src/client.ts` — instantiate `OpenAI({ baseURL: "http://localhost:1234/v1", apiKey: "lm-studio" })`; implement `sendMessage(session, userText): Promise<string>` that builds `[system, ...historyMessages, user]` array from `getHistoryMessages()` and calls `chat.completions.create`
- [x] T008 [P] [US1] Create `ai/src/ui.ts` (partial) — implement `renderMessage(entry)` (cyan for user, green for assistant), `renderCharacterList(characters)`, and `renderError(msg)` (red) using `chalk`
- [x] T009 [US1] Create `ai/src/index.ts` — resolve `PROMPTS_DIR` via `fileURLToPath(import.meta.url)` + `path.resolve`, call `loadCharacters()`, print startup banner and character list, prompt for starting character (default: `general`), call `createSession()`, enter readline loop that sends free-text input through `sendMessage()` and appends both user and assistant `HistoryEntry` records via `appendMessage()`

**Checkpoint**: `pnpm dev` → full chat session with one character works end-to-end.

---

## Phase 4: User Story 2 — Switch Characters Mid-Session

**Goal**: Developer can change the active character at the `> ` prompt; the new system prompt takes effect on the next message; a switch divider appears in the terminal.

**Independent Test**: Start session with `enabler` → `/switch mirror` → yellow divider prints → next message receives a mirror-archetype response.

- [x] T010 [US2] Extend `ai/src/ui.ts` — add `renderSwitch(entry)` (yellow `--- switched from X to Y ---`)
- [x] T011 [US2] Add `/switch` command handler in `ai/src/index.ts` readline dispatch — parse argument, call `findCharacter()`, call `appendSwitch()` (which updates `session.activeCharacter`), call `renderSwitch()` with the new history entry; print usage error if no arg, not-found error if unknown name

**Checkpoint**: Character switching works; switch events appear in terminal and are recorded in `session.history`.

---

## Phase 5: User Story 3 — Review Conversation History

**Goal**: Developer can replay the full ordered session log — all messages and switch events — without restarting.

**Independent Test**: Chat with `enabler`, `/switch mirror`, chat again → `/history` prints all turns in correct order with the switch divider between them, correctly attributed by character name.

- [x] T012 [US3] Extend `ai/src/ui.ts` — implement `renderHistory(session)` that iterates `session.history` and calls `renderMessage()` or `renderSwitch()` based on `entry.kind`
- [x] T013 [US3] Add `/history` command handler in `ai/src/index.ts` readline dispatch — call `renderHistory(session)`

**Checkpoint**: `/history` replays the full session in order at any point during a run.

---

## Phase 6: User Story 4 — Session Management and Discoverability

**Goal**: Developer can exit cleanly, get command help, list available characters, and see a readable error when LM Studio is not running.

**Independent Test**: `/help` prints command reference; `/list` shows all 6 characters; `/quit` exits with `Goodbye.`; stop LM Studio → send message → readable error appears instead of a stack trace.

- [x] T014 [US4] Add SIGINT handler (`process.on("SIGINT", ...)`) and `/quit` command to `ai/src/index.ts` readline dispatch — print `Goodbye.` and call `process.exit(0)`
- [x] T015 [P] [US4] Add `/list` command handler in `ai/src/index.ts` dispatch — call `renderCharacterList(characters)`
- [x] T016 [P] [US4] Add `/help` command handler in `ai/src/index.ts` dispatch — print command reference table (all commands with descriptions)
- [x] T017 [US4] Add error handling in `ai/src/client.ts` `sendMessage()` — catch errors where `message` includes `ECONNREFUSED` or `fetch failed` and return the string `"LM Studio is not running at localhost:1234. Start LM Studio and load a model, then try again."` instead of rethrowing; render this as a `renderError()` call in the readline loop

**Checkpoint**: All 6 success criteria from spec.md are verifiable — run through `quickstart.md` validation checklist.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T018 [P] Improve startup UX in `ai/src/index.ts` — handle empty Enter at character prompt (default to `general`), re-prompt once on unknown character name before defaulting, print `Type /help for commands.` after entering the loop
- [x] T019 Verify `pnpm build` compiles cleanly with no TypeScript errors (`tsc --noEmit`), then run `node dist/index.js` to confirm compiled output matches dev behavior

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (needs `pnpm install` complete) — **blocks all US phases**
- **Phase 3 (US1)**: Depends on Phase 2 — MVP; delivers core value
- **Phase 4 (US2)**: Depends on Phase 3 (adds to established readline loop)
- **Phase 5 (US3)**: Depends on Phase 2 — independent of US2
- **Phase 6 (US4)**: Depends on Phase 2 — independent of US2/US3
- **Phase 7 (Polish)**: Depends on all desired stories complete

### User Story Dependencies

- **US1 (P1)**: Core flow — blocks nothing but delivers the MVP
- **US2 (P2)**: Extends the readline loop from US1; naturally after US1
- **US3 (P3)**: Adds `/history` — independent of US2; can be done alongside US2
- **US4 (P4)**: Exit, help, list, error handling — independent of US2/US3; can be done in parallel with them

### Parallel Opportunities

Within Phase 2:
- T005 (`characters.ts`) and T006 (`session.ts`) can run in parallel

Within Phase 3:
- T007 (`client.ts`) and T008 (`ui.ts` rendering) can run in parallel; T009 depends on both

Within Phase 6:
- T015 (`/list`) and T016 (`/help`) can run in parallel (both add to dispatch, different output functions)

---

## Parallel Example: Phase 2

```
Parallel:
  Task T005 — Create ai/src/characters.ts
  Task T006 — Create ai/src/session.ts

Then sequential:
  Task T004 — Create ai/src/types.ts (both T005 and T006 import from here — write first)
```

> Note: T004 should actually be done before T005/T006 since both import from `types.ts`. T005 and T006 are then parallel.

---

## Implementation Strategy

### MVP (US1 only — Phases 1–3)

1. Phase 1: Scaffold project
2. Phase 2: Write types, characters loader, session module
3. Phase 3: Write client, ui rendering, entry point
4. **STOP**: Run `pnpm dev`, chat with a character end-to-end — if this works, MVP is done

### Incremental Delivery

1. MVP (above) → full chat session works
2. Add US2 (Phase 4) → character switching works
3. Add US3 (Phase 5) → `/history` works  
4. Add US4 (Phase 6) → help, list, exit, error handling complete
5. Polish (Phase 7) → UX refinement + build verification

---

## Notes

- `types.ts` must be written before `characters.ts` and `session.ts` (both import from it)
- `client.ts` and `ui.ts` (partial) are independent and can be written in parallel during Phase 3
- The readline dispatch in `index.ts` grows incrementally — each US phase adds new command branches
- All `chalk` calls use top-level `import chalk from "chalk"` (ESM default export)
- All file reads use `fs.readFileSync` with `"utf-8"` encoding (synchronous, loaded once at startup)
- `path.resolve(__dirname, "../docs/prompts")` works from both `ai/src/` (tsx) and `ai/dist/` (compiled)
