# Phase 0 Research: AI NPC Integration

**Feature**: 004-ai-npc-integration
**Date**: 2026-04-26

This phase resolves all open technical questions before Phase 1 design. Each item documents the **decision**, **rationale**, and **alternatives considered**.

---

## R1. Cross-process transport between `ai/` and `playtest/`

**Decision**: A single Node.js HTTP server (the "bridge") inside `ai/src/server/` running on `127.0.0.1:3000`, exposing a versioned `/api/v1/...` REST surface and a Server-Sent Events (`text/event-stream`) feed. The browser uses `fetch` for command/query and `EventSource` for live events.

**Rationale**:
- The browser cannot import Node modules directly; an HTTP boundary is unavoidable for any browser ↔ AI integration.
- SSE is one-way (server → client) which is exactly the shape of quest event delivery — simpler than WebSockets for this use case, no extra dependency, native browser API.
- Keeping the bridge inside `ai/` (vs. creating a new top-level package) avoids fragmenting AI ownership and matches the constitution's "modular separation": the playtest treats `ai/` as a single addressable service.
- Port 3000 is already the default in `notify/game-api.ts` (`GAME_API_URL`), so the existing notify path can address the same host without configuration changes.

**Alternatives considered**:
- **WebSocket**: Bidirectional and streaming, but overkill — the conversation flow is request/response, only events are push. Adds a dep (`ws`) and protocol surface area without a feature-driven need.
- **Polling**: Browser polls `/api/v1/events?since=…`. Works, but wastes CPU and adds latency vs. SSE. Rejected.
- **Direct browser → LM Studio**: Would require duplicating prompt construction, memory loading, lifecycle pipeline, and detector logic in browser JS. Massive duplication, violates DRY, and breaks Principle II by leaking AI logic into the game. Rejected.

---

## R2. HTTP framework for the bridge

**Decision**: Use Node's native `node:http` module with a small hand-rolled router (a `Map<method+path, handler>` with a regex-matched dynamic-segment fallback) and a JSON body parser helper. No new dependency.

**Rationale**:
- The route surface is small (~6 endpoints). A framework's value is low at this scale.
- Constitution Principle II asks for explicit, versioned, tested boundaries — those are independent of framework choice.
- Avoiding a new dep keeps the AI module lean (currently only `chalk` + `openai`) and reduces supply-chain surface.
- SSE is trivial in native http: set headers, `res.write("data: ...\n\n")`, keep the connection open.

**Alternatives considered**:
- **Fastify**: Excellent TS support, fast, but adds a dep + plugin ecosystem we don't need.
- **Express**: Larger, slower, common in tutorials. Rejected for the same reason as Fastify, plus weaker TS story.
- **Hono**: Modern, edge-friendly, small. Tempting, but still a new dep for a small surface. Held in reserve if route surface grows.

---

## R3. Preserving the existing `notify/game-api.ts` POST contract

**Decision**: Keep `ai/src/notify/game-api.ts` **completely unchanged**. The bridge mounts `POST /quest/start` and `POST /quest/complete` handlers that match the existing payload shape and **internally re-emit** each received payload onto a process-wide `EventEmitter` (`ai/src/server/eventBus.ts`). The SSE endpoint subscribes to the same emitter and forwards events to all connected browser clients. Quest acceptance inside the bridge invokes `notifyQuestStart()` exactly as the CLI does — the HTTP loopback is intentional and preserved.

**Rationale**:
- The spec explicitly mandates that the existing API be used "in its full intent" (Constraints).
- The existing `pending-notifications.json` retry mechanism stays meaningful: if the bridge ever crashes between `notifyQuestStart` and the SSE flush, retry-on-startup re-delivers.
- Loopback POST overhead on `127.0.0.1` is sub-millisecond — negligible.
- Zero changes to `notify/game-api.ts` means CLI behavior is unaffected (Principle II — independent delivery).

**Alternatives considered**:
- **Refactor `notify/game-api.ts` to a pluggable interface (HTTP impl + in-process impl)**: Cleaner architecturally but changes a working module that the CLI depends on, increases blast radius of this feature, and offers no user-visible benefit. Rejected for first pass.
- **Direct emitter call from `runWithNotification`**: Bypasses HTTP, removes retry semantics. Rejected.

---

## R4. Conversation session lifecycle and identity

**Decision**: Browser → Bridge conversation flow uses an explicit, server-issued **session id** (UUID v4):

1. `POST /api/v1/conversation/start` body `{character: "general"}` → creates a new `Session`, runs the detector autostart logic, returns `{sessionId, greeting, conversationState}`.
2. `POST /api/v1/conversation/{sessionId}/message` body `{text}` → returns `{reply, conversationState, terminated}`. The bridge runs the same quest-offer detection and acceptance pipeline as the CLI's `rl.on("line", ...)` loop. On acceptance, the bridge runs `runWithNotification`, marks the session terminated, and the response sets `terminated: true`.
3. `POST /api/v1/conversation/{sessionId}/end` body `{reason: "exit"}` → if not already terminated, freeze with `"exit"` and run `runPostConversationPipeline`.

Sessions live in an in-process `Map<sessionId, Session>`; on bridge restart they are dropped (this is a single-player local tool — no persistence requirement).

**Rationale**:
- Mirrors the existing CLI lifecycle 1:1 — same session, same detector, same pipeline. No new logic paths in `ai/` core.
- Server-issued session ids prevent the browser from forging or guessing session keys.
- Stateful per-connection is unavoidable because `Session.history` and `conversationState.assistantResponseCount` drive detector windowing.

**Alternatives considered**:
- **Stateless API (browser sends full history each turn)**: Possible but the detector's `firstQuestOfferTurn` and quest-acceptance pipeline depend on server-persisted lifecycle state. Would require shipping `ConversationState` to the client and trusting it. Rejected — server is authoritative.
- **One implicit session per character**: Loses the ability to have multiple concurrent players. Not a current concern but the explicit-session pattern costs nothing.

---

## R5. Quest completion reporting (game → AI)

**Decision**: Add `POST /api/v1/quest/complete` body `{character, questId, outcome, rewardReceived}` for the browser to call after a dungeon finishes. The handler invokes `runQuestCompletionPipeline` (existing) and then `notifyQuestComplete` (existing) with the same loopback semantics as quest start. Idempotent thanks to existing `processed-completions.json`.

**Rationale**:
- The spec includes `quest_complete` as part of the integration (User Story 2 acceptance scenario 2).
- Reuses both existing pipeline functions — no new memory mutation logic.
- Browser is the only authority on dungeon outcome (success/failure/abandoned), so it must POST upward.

**Alternatives considered**:
- **Have the browser write directly to AI memory files**: Violates Principle II (cross-module coupling on file format) and breaks atomicity. Rejected.

---

## R6. Vite ↔ Bridge wiring (CORS / proxy)

**Decision**: Configure Vite's dev server to proxy `/api` and `/events` to `http://127.0.0.1:3000`. The browser code uses same-origin URLs (`/api/v1/conversation/start`, `/events`). The bridge does **not** need CORS headers in dev. For Chromium playtest validation (FR-010), the player launches Vite (`npm run dev` in `playtest/`) and the bridge (`pnpm --filter ai-chat run dev:server`) — same-origin via the proxy.

**Rationale**:
- Same-origin is the simplest CORS model — no headers needed, no preflight surprises.
- Constitution V (localhost-only) is satisfied: bridge binds 127.0.0.1; Vite proxies same-host.
- If a developer ever launches the built browser bundle from `vite preview`, Vite preview also supports the proxy config.

**Alternatives considered**:
- **Bridge sets `Access-Control-Allow-Origin: *`**: Functional but invites accidental cross-origin use; principle V says localhost-only, which is best enforced by binding 127.0.0.1 + same-origin via proxy.
- **Run Vite and bridge on the same port via reverse proxy**: Overkill.

---

## R7. Girl_1 sprite sheet dimensions and animation registration

**Decision**: Verified via PNG inspection. Each sheet is a horizontal strip of **128×128 square frames**:

| Sheet | Pixel size | Frame count | Phaser key |
|-------|-----------|-------------|-----------|
| `Girl_1/Idle.png` | 1152 × 128 | 9 | `npc-girl-1-idle` |
| `Girl_1/Walk.png` | 1536 × 128 | 12 | `npc-girl-1-walk` |
| `Girl_1/Dialogue.png` | 1408 × 128 | 11 | `npc-girl-1-dialogue` |

Register all three with `frameWidth: 128, frameHeight: 128`. Render the overworld NPC at `setScale(0.5)` so the on-screen footprint matches the 64-px-tall witch-kitty player (visual parity).

`Attack.png`, `Book.png`, `Protection.png` are **not** loaded for this feature pass (out of scope; combat-side work).

**Rationale**:
- Concrete dimensions remove an implementation unknown — the spritesheet load calls and animation frame ranges are deterministic.
- `setScale(0.5)` keeps NPCs visually consistent with the existing 64-px player sprite while keeping the asset at native resolution for crisp rendering.
- Loading only what we render keeps preload time fast and memory low.
- Using the Dialogue sheet as a portrait inside the conversation overlay is a low-effort way to satisfy the "build a UI around conversations" spec line — the dialogue portrait at native 128 px reads well in the overlay's left-side portrait region.

**Alternatives considered**:
- **Render at native 128×128 with no scaling**: Makes the NPC twice the height of the player — visually jarring. Rejected.
- **Load all six sheets up front**: Wasted bandwidth/memory. Rejected.

---

## R8. Asset organization — moving Girl_1 into the playtest pipeline

**Decision**: Copy (not move) the three needed PNGs from `assets/_source/craftpix-net-242415-free-schoolgirls-anime-character-pixel-sprite-pack/Girl_1/` into a new `assets/characters/girl-1/` directory, lowercase-kebab-case filenames (`idle.png`, `walk.png`, `dialogue.png`). The `_source/` originals are preserved as the canonical source per existing repo convention (`assets/_source/...` is also referenced from `assetPaths.js` for undead tiles).

**Rationale**:
- Mirrors existing structure: `assets/characters/witch-kitty/witchKitty_walk.png` is the player sprite location.
- Keeps `_source` as the immutable origin pack — important if Craftpix updates or licensing changes.
- Lowercase-kebab filenames match the `assetPaths.js` import naming.

**Alternatives considered**:
- **Reference `_source/.../Girl_1/Idle.png` directly from `assetPaths.js`**: Works (the existing undead tiles do this) but mixes concerns; the source pack should be treated as a vendored input, not a runtime asset path. Rejected.

---

## R9. Conversation overlay UI language

**Decision**: Build `ConversationOverlay.js` as a Phaser overlay using:

- The same color palette and stroke language as `InventoryOverlay` (parchment `0xe8d1a2` background, `0x55361f` outer stroke, `0x59b68a` header band, monospace text).
- Three-region layout: a left **portrait** panel (showing `npc-girl-1-dialogue` + character archetype label), a center **dialogue history** panel (scrolling text), and a bottom-edge **input strip** (Phaser `Phaser.GameObjects.DOMElement` wrapping a real `<input type="text">` for native IME and selection support).
- Toggle key: **`E`** to open when in proximity, **`Esc`** to close.
- Closes pause: while open, `OverworldScene` ignores movement keys but the scene continues to update animations and the conversation overlay animates a typing indicator.

**Rationale**:
- Reusing the inventory UI language satisfies spec FR-004 ("styled using pieces from `assets/ui/inventory/`") and gives the player a coherent visual vocabulary.
- A real `<input>` element via `DOMElement` avoids reimplementing text editing (cursor, backspace, IME, paste) on top of Phaser keyboard primitives.
- `E` is a conventional "interact" key in top-down RPGs and is not currently bound in `OverworldScene`.

**Alternatives considered**:
- **All-Phaser text input (no DOMElement)**: Possible (Phaser has rex-ui plugins) but adds a dep and weak IME support. Rejected.
- **Modal HTML dialog floated above the canvas**: Breaks the in-world feel and visual coherence with InventoryOverlay. Rejected.
- **Reuse `InventoryOverlay` directly**: The data shapes are too different (inventory grid vs. dialogue stream). A separate overlay is cleaner.

---

## R10. Quest notification HUD presentation

**Decision**: A small toast HUD anchored top-right of the viewport, parchment-themed (matching the inventory palette). Toast contains an icon glyph (✦ from existing fonts, no new asset), the quest title (`questId` slug rendered with `_` and `-` → spaces, title-cased), and a brief flavor line ("Quest started" / "Quest complete"). Auto-dismisses after **4 s** with a fade tween. Maximum **two stacked** toasts at once; older toasts auto-dismiss early if a third arrives.

**Rationale**:
- Top-right is the conventional MMO/RPG notification anchor and avoids overlapping the bottom-of-screen subtitle area used by InventoryOverlay.
- 4 s gives the player time to read without lingering — well under the 10% screen-height cap (SC-002) when the toast height is ~64 px on a 720 px tall canvas.
- Stacking limit prevents queue buildup if the AI emits multiple events quickly.

**Alternatives considered**:
- **Center-screen banner**: Too disruptive — violates "MUST NOT block player interaction" (FR-007).
- **Bottom-center**: Conflicts with conversation overlay close hint and inventory subtitle.
- **No auto-dismiss**: Forces player input — rejected by spec edge case ("appears and disappears on its own").

---

## R11. Bridge process management during dev

**Decision**: Add a new script to `ai/package.json`: `"dev:server": "tsx src/server/http.ts"`. The developer runs the bridge in one terminal and Vite in another. **No** orchestrator (`concurrently`, `npm-run-all`) is added in this pass — the constitution's localhost-only stance and the small surface argue against extra tooling. Document the two-terminal flow in `quickstart.md`.

**Rationale**:
- Adding `concurrently` is a real dep with marginal value for a 2-process setup.
- Future MVP can introduce a `Procfile` or `nx`-style orchestration if more services accrue.

**Alternatives considered**:
- **Auto-start the bridge from Vite via `vite-plugin-…`**: Couples build to runtime; rejected.
- **Bundle bridge + Vite into one process**: Architectural mismatch (Vite is dev/build tooling, the bridge is a runtime service).

---

## R12. Archetype selection mechanism (FR-008)

**Decision**: A single source-of-truth file at `playtest/src/game/npc/npcConfig.js` exporting an array:

```js
export const npcs = [
  {
    id: 'girl-1-east',
    archetype: 'general',  // one of: general | enabler | opportunist | honest | mirror | parasite
    spriteKey: 'npc-girl-1-idle',
    portraitKey: 'npc-girl-1-dialogue',
    overworldTile: { x: 18, y: 12 },  // tile coordinates within layout
    interactionRadius: 36,
  },
];
```

The browser passes `archetype` as the `character` field on `POST /api/v1/conversation/start`. The bridge resolves the character via the existing `findCharacter` from `loadCharacters(PROMPTS_DIR)`.

For developer iteration, archetype can be overridden by URL param `?npc=girl-1-east&archetype=parasite` so playtest validation can swap archetypes without editing code.

**Rationale**:
- Single config file = single edit surface to swap archetypes.
- URL param = friction-free testing of all six archetypes during Chromium validation (SC-003).
- Reuses the existing `findCharacter` → no new resolution logic.

**Alternatives considered**:
- **Archetype baked into NPC sprite**: Couples visual to behavior — rejected; the constraint is one sprite, all archetypes selectable.
- **Archetype chosen via in-game UI**: Out of scope (not in spec); URL param is dev-only and the in-game setting can be added later.

---

## R13. Error handling and graceful degradation

**Decision**:

- **Bridge unreachable on first conversation request** (FR error scenario): browser shows a non-blocking inline error inside the conversation overlay ("Could not reach AI service. Make sure the bridge is running.") and leaves the overlay open with a retry button. Player can dismiss with `Esc` and continue playing.
- **LM Studio down** (existing `__CONNECTION_ERROR__` path in `client.ts`): bridge returns HTTP `503` with body `{error: "lm_studio_unavailable"}`. Browser surfaces the same kind of inline error.
- **SSE connection drops**: `EventSource` auto-reconnects; the bridge's `pending-notifications.json` retry covers any events that were emitted while disconnected.
- **Browser closes mid-conversation**: SSE connection closes; the bridge keeps the session in memory. On reconnect/start of a new conversation, the previous session is orphaned and garbage-collected after 30 minutes idle (TTL sweep on the session registry). No memory pipeline run, mirroring the CLI's behavior on `SIGKILL`.
- **Player rapidly reopens the panel** (spec edge case): browser enforces a single overlay; if reopen is requested while an existing `sessionId` is active, the same overlay is brought back to foreground rather than starting a new session.

**Rationale**:
- Aligns with "graceful error" language in spec FR scenarios.
- Idle-TTL session cleanup prevents memory leaks without requiring browser cooperation.
- Single-overlay invariant prevents duplicate sessions and double-charged quest detection.

**Alternatives considered**:
- **Hard fail / kick to title screen**: Hostile UX. Rejected.
- **Persist sessions to disk on close**: Out of scope; sessions are ephemeral by design.

---

## Summary of Open Items

| Item | Status |
|------|--------|
| All NEEDS CLARIFICATION from spec | None remaining (spec passed checklist) |
| New dependencies | **Zero** — native `node:http`, native `EventSource`, existing libs |
| Constitutional concerns | None |
| Action items for Phase 1 | Inspect Girl_1 PNG dimensions during contract authoring (R7) |
