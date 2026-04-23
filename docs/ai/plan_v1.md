# AI + User Asset Integration Plan (v1)

## What I found in the repo

### `ai/` capabilities (current)
- Terminal-based AI runtime (not an inbound HTTP service yet).
- Uses local OpenAI-compatible endpoint at `http://localhost:1234/v1/chat/completions` for:
  - character chat replies
  - quest-offer classification
  - player acceptance intent classification
- Conversation lifecycle implemented conceptually as:
  - `ACTIVE -> ESCALATION -> DECISION -> TERMINATION`
- On termination, AI pipeline:
  - extracts behavior features
  - updates memory
  - posts quest notification to game API
- Outbound game notify contract (current): `POST /quest/start` (default `http://localhost:3000/quest/start`), with retry queue (`memory/pending-notifications.json`).

### `playtest/` capabilities (current)
- Browser game runtime (Vite + Phaser), no backend API layer currently.
- Overworld has many visible town NPCs (`overworldLayout.js`) but no dialogue interaction system yet.
- Core gameplay loop currently: overworld -> dungeon -> combat -> return.
- Strong user-asset workflows already exist:
  - explicit static imports (`assetPaths.js`)
  - auto asset manifest scanner (`autoAssetManifest.js`)
  - asset-canvas scene for compatibility checks
  - in-game developer world builder/palette tooling.

---

## Checklist: decisions to make before implementation

## 1) Integration architecture
- [ ] Decide where AI runs during playtest:
  - [ ] Keep `ai/` as separate process + build a bridge service
  - [ ] Convert `ai/` into a callable HTTP service (recommended for game integration)
- [ ] Decide process model:
  - [ ] One AI process per game session
  - [ ] Shared singleton AI service for all sessions
- [ ] Decide dev/prod parity target (local-only vs future deployable service).

## 2) API contract between game and AI
- [ ] Define inbound endpoints the game needs (example):
  - [ ] `POST /conversation/start`
  - [ ] `POST /conversation/message`
  - [ ] `POST /conversation/end`
  - [ ] `GET /conversation/state/:id`
- [ ] Define response payload for each turn:
  - [ ] npc text
  - [ ] quest offer status
  - [ ] phase/state
  - [ ] any UI hints (tone, urgency, etc.)
- [ ] Decide if AI remains source-of-truth for phase transitions, or game mirrors/validates.
- [ ] Decide idempotency/retry behavior for all game<->AI calls.

## 3) Conversation session ownership
- [ ] Decide session identity model:
  - [ ] use player id + npc id
  - [ ] use opaque conversation id
- [ ] Decide persistence boundaries:
  - [ ] memory in `ai/` only
  - [ ] mirrored summary in game save
- [ ] Decide when session ends automatically:
  - [ ] quest acceptance
  - [ ] distance from NPC
  - [ ] scene transition
  - [ ] timeout/idle

## 4) NPC mapping between playtest and AI characters
- [ ] Decide mapping from overworld NPC roles -> AI character archetypes/prompts (e.g., `shrine-keeper -> parasite/enabler/etc.`).
- [ ] Decide whether all visible NPCs are conversational, or only a subset.
- [ ] Decide fallback behavior for non-AI NPCs.

## 5) UI/UX in playtest
- [ ] Decide dialogue presentation style:
  - [ ] modal dialogue panel
  - [ ] side panel overlay
  - [ ] bottom-box RPG style
- [ ] Decide input style:
  - [ ] free text
  - [ ] selectable intents + optional free text
- [ ] Decide pacing constraints:
  - [ ] max tokens/length per reply
  - [ ] typing delay/animation
  - [ ] skip/fast-forward rules
- [ ] Decide debug affordances in browser (phase, confidence, quest id, raw payload).

## 6) Quest handshake and gameplay transition
- [ ] Decide authoritative quest trigger:
  - [ ] AI `quest/start` notification
  - [ ] game-side confirmation after explicit player choice
- [ ] Define mapping from AI `questId` -> playable dungeon content.
- [ ] Decide how failure/retry works if AI accepted quest but game transition fails.

## 7) User asset integration requirements
- [ ] Decide which user assets are required for AI feature slice:
  - [ ] NPC portrait sprites
  - [ ] chat UI frame/background assets
  - [ ] speaker indicators/icons
- [ ] Decide asset loading path strategy:
  - [ ] static imports in `assetPaths.js`
  - [ ] auto-manifest dynamic loading for dialogue assets
- [ ] Define naming conventions and registry for dialogue/UI assets.
- [ ] Decide how missing user assets degrade gracefully (placeholder art).

## 8) Data, safety, and observability
- [ ] Decide logging policy for conversation transcripts (dev only vs persisted).
- [ ] Decide if/where to store moderation/safety guardrails.
- [ ] Decide telemetry needed for tuning:
  - [ ] acceptance false positives
  - [ ] average turns to quest
  - [ ] error rates/latency
- [ ] Decide test harness for deterministic integration tests (mock LLM responses).

---

## Initial implementation plan

## Phase 0 - Contract + architecture lock (short)
1. Freeze architecture decision: **recommend AI HTTP bridge service** in `ai/`.
2. Write minimal API contract doc for browser game calls + existing `quest/start` flow.
3. Define NPC role -> AI character mapping table from current overworld NPC roster.
4. Define minimal required user assets for dialogue UI and placeholders.

**Deliverables**
- API contract markdown in `docs/ai/`
- Mapping table (`npc-role -> ai-character`)
- Asset naming/placement spec for dialogue UI assets

## Phase 1 - Vertical slice (one NPC, one quest path)
1. Add one interactable NPC in `OverworldScene` (proximity + interact key).
2. Add simple dialogue UI overlay in playtest.
3. Implement game->AI `start/message/end` calls against bridge API.
4. Handle AI quest acceptance and transition into existing dungeon flow.
5. Show debug phase/quest id in dev HUD.

**Success criteria**
- Player can talk to 1 NPC in overworld.
- AI response appears in-game UI.
- Accepting quest cleanly transitions player to gameplay loop.

## Phase 2 - Assetized dialogue experience
1. Integrate user-provided dialogue assets (portraits/panels/icons).
2. Add per-character portrait/icon mapping.
3. Add fallback pipeline for missing assets.
4. Validate visual consistency in asset-canvas/dev workflows where useful.

**Success criteria**
- Dialogue UI uses user assets by default.
- Missing asset does not break conversation flow.

## Phase 3 - Scale-out + reliability
1. Expand to selected subset of town NPCs.
2. Add reconnect/retry behavior for transient AI bridge failures.
3. Add integration tests with mocked AI responses.
4. Add instrumentation for latency, acceptance detection, and error rates.

**Success criteria**
- Multiple NPCs share stable AI conversation infrastructure.
- Failures degrade gracefully and are visible in debug tooling.

---

## Suggested first coding tasks (next)
1. Create `docs/ai/api_contract_v1.md` with explicit request/response schemas.
2. Implement a tiny `ai` HTTP adapter around existing `sendMessage` + session lifecycle.
3. Add an `NpcInteractionController` in `playtest/src/game/` for one interactable NPC.
4. Add dialogue UI scene/component and wire to controller.
5. Connect quest-accept event to existing overworld->dungeon transition path.
