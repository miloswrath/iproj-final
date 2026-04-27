# Phase 1 Data Model: AI NPC Integration

**Feature**: 004-ai-npc-integration
**Date**: 2026-04-26

This document captures the entities introduced by this feature, their fields, and state transitions. Existing entities in `ai/src/types.ts` (`Session`, `CharacterMemory`, `PlayerProfile`, `ConversationState`, `QuestStartPayload`, `QuestCompletionPayload`, etc.) are reused unchanged and not redefined here — only their **integration-relevant invariants** are noted.

---

## Entity: NpcConfig (browser, frontend)

A single source of truth for which NPCs exist in the overworld and how they map to AI archetypes.

**Location**: `playtest/src/game/npc/npcConfig.js`

**Fields**:

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| `id` | string | Required, kebab-case, unique | Stable identifier for analytics + URL params. Example: `girl-1-east`. |
| `archetype` | string | Required, one of `general` \| `enabler` \| `opportunist` \| `honest` \| `mirror` \| `parasite` | Maps to a file in `ai/docs/prompts/<archetype>.md`. |
| `spriteKey` | string | Required, must match a key registered in `PreloadScene` | Frame 0 of this key is shown idle. |
| `portraitKey` | string | Required, must match a key registered in `PreloadScene` | Used as the portrait in `ConversationOverlay`. |
| `overworldTile` | `{x:number, y:number}` | Required, both within layout bounds | Tile coordinates within `overworldLayout`. |
| `interactionRadius` | number | Required, > 0, default 36 | Pixel radius for proximity prompt. |
| `displayName` | string \| null | Optional | Shown above the NPC and in the overlay header. Defaults to a title-cased archetype. |

**Relationships**:
- One `NpcConfig` ↔ one `Character` in `ai/docs/prompts/` (resolved by `archetype` field).
- One `NpcConfig` ↔ zero-or-one active `ConversationSession` (one NPC, one conversation at a time).

**Invariants**:
- For this feature pass, `spriteKey` is always `npc-girl-1-idle` (constraint: only Girl_1 visual).
- `archetype` may be overridden at runtime by URL param `?archetype=<name>` for the NPC matching `?npc=<id>`.

---

## Entity: ConversationSession (server, in-memory)

A live conversation between the browser and an NPC, identified by a server-issued UUID. Wraps the existing `Session` from `ai/src/types.ts` and adds bridge bookkeeping.

**Location**: `ai/src/server/sessionRegistry.ts` — `Map<string, ConversationSession>`

**Fields**:

| Field | Type | Notes |
|-------|------|-------|
| `sessionId` | string | UUID v4, generated server-side. |
| `session` | `Session` (existing type) | Wraps history, `activeCharacter`, `activeMemory`, `conversationState`. |
| `playerProfile` | `PlayerProfile` (existing) | Loaded at start, mutated by pipeline. |
| `playerSummary` | `PlayerSummary` (existing) | Updated by the post-conversation pipeline. |
| `createdAt` | `Date` | For TTL sweeping. |
| `lastActivityAt` | `Date` | Updated on every message. |
| `terminated` | boolean | True once `runWithNotification` or `runPostConversationPipeline` has run. |

**Lifecycle / state transitions**:

```text
[start endpoint]
   │ create Session via existing createSession()
   │ load memory via loadAllMemory()
   │ build enriched system prompt via buildEnrichedSystemPrompt()
   ▼
ACTIVE ──── /message ────► ACTIVE (turns 1..2)
   │                          │
   │                          │ detector: quest offer at turn 3..5
   ▼                          ▼
ACTIVE ─── detected ───► ESCALATION
                              │
                              │ next /message: detectAcceptance()
                              ▼
                        ESCALATION ── accept ──► TERMINATION
                                                    │
                                                    │ runWithNotification()
                                                    │ → POST localhost:3000/quest/start
                                                    │ → eventBus emits "quest_start"
                                                    │ → SSE clients receive event
                                                    ▼
                                                  terminated: true
                                                  session removed from registry
                                                  on next /message → 404

[end endpoint]   any phase ── frozen=true ─► TERMINATION (reason=exit), runPostConversationPipeline
[idle TTL 30m]  any phase ── sweeper ─► drop session, no pipeline run
```

**Validation / invariants**:
- `sessionId` is opaque to the browser; the bridge does not accept browser-supplied ids.
- A session in `terminated: true` state rejects further `/message` calls with HTTP 410 Gone.
- Once `runWithNotification` returns, the bridge MUST remove the session from the registry to free memory and prevent stale `/end` calls running the pipeline twice.

---

## Entity: QuestNotificationEvent (bridge eventBus + browser SSE)

Internal event published by the loopback `POST /quest/start` and `POST /quest/complete` handlers, consumed by both the SSE responder (re-broadcast to browser) and any future server-side listeners.

**Shape (server-internal)**:

```ts
type QuestNotificationEvent =
  | { kind: "quest_start"; payload: QuestStartPayload; receivedAt: string /* ISO */ }
  | { kind: "quest_complete"; payload: QuestCompletionPayload; receivedAt: string };
```

**SSE wire format** (browser-facing):

```text
event: quest_start
id: 1714123456789-0
data: {"character":"general","questId":"general_L1_clear-the-cellar","relationshipSnapshot":{...},...}

event: quest_complete
id: 1714123456790-0
data: {"character":"general","questId":"...","outcome":"success","rewardReceived":true,...}
```

**Validation**:
- Payload shapes match existing `QuestStartPayload` / `QuestCompletionPayload` from `ai/src/types.ts` exactly. The bridge does not transform field names.
- The SSE `id:` field is `<receivedAt-millis>-<seq>` for trivial dedup if a client reconnects with `Last-Event-ID`.

**Relationships**:
- One `ConversationSession` produces zero-or-one `quest_start` event over its lifetime.
- One quest produces zero-or-one `quest_complete` event (idempotent — `processed-completions.json` guards duplicates inside the AI pipeline).

---

## Entity: QuestToast (browser UI)

A transient HUD element rendered in `playtest/src/game/ui/QuestToast.js`.

**Fields**:

| Field | Type | Notes |
|-------|------|-------|
| `kind` | `"quest_start"` \| `"quest_complete"` | Drives icon and copy. |
| `title` | string | Title-cased, derived from the questId slug (e.g. `general_L1_clear-the-cellar` → "Clear The Cellar"). |
| `bodyLine` | string | "Quest started" or "Quest complete (success)" / "(failure)" / "(abandoned)". |
| `createdAt` | number (ms) | Wall-clock. |
| `expiresAt` | number (ms) | `createdAt + 4000`. |
| `phaserGameObjects` | array | The Phaser `Container` and its children for cleanup. |

**State transitions**:

```text
arrived ── tween in (200ms) ──► visible
visible ── 4s timer or new toast pushes 3rd ──► fading
fading ── tween out (250ms) ──► destroyed
```

**Invariants**:
- Maximum 2 visible toasts; arrival of a 3rd transitions the oldest to `fading` immediately.
- A toast's destruction removes all `phaserGameObjects` from the scene.

---

## Entity: ConversationOverlayState (browser UI)

In-memory state for the `ConversationOverlay`.

**Fields**:

| Field | Type | Notes |
|-------|------|-------|
| `isOpen` | boolean | Whether the overlay is showing. |
| `npc` | `NpcConfig` \| null | Which NPC owns the conversation. |
| `sessionId` | string \| null | Server-issued. Null until `/start` returns. |
| `messages` | `Array<{role: "npc"\|"player", text: string}>` | Newest-last. |
| `inputBuffer` | string | Current text in the DOMElement input. |
| `awaitingReply` | boolean | True from message-send to reply-arrival; renders a typing indicator. |
| `error` | string \| null | Set when `/start` or `/message` fails; cleared on retry/dismiss. |

**State transitions**:

```text
closed ── E pressed in proximity ──► opening
opening ── /start succeeds ──► open + greeting visible
opening ── /start fails ──► open + error banner (overlay still open, retry button)
open ── Enter on input ──► awaitingReply
awaitingReply ── /message returns reply ──► open (reply appended)
awaitingReply ── /message returns terminated:true ──► open (final NPC line) → 1.5s pause → closed
open ── Esc ──► closing → /end fired (best-effort) → closed
```

**Invariants**:
- Only one `ConversationOverlay` instance exists per scene.
- `inputBuffer` clears on send; cannot send while `awaitingReply`.
- On scene shutdown the overlay calls `/end` if a session is still active and not terminated.

---

## Entity: BridgeServerConfig (server, environment)

Read once at bridge startup.

**Fields**:

| Field | Source | Default | Notes |
|-------|--------|---------|-------|
| `BRIDGE_HOST` | env | `127.0.0.1` | Constitution V mandates loopback. |
| `BRIDGE_PORT` | env | `3000` | Matches existing `GAME_API_URL`. |
| `LM_STUDIO_BASE_URL` | env (read by `client.ts` indirectly) | `http://localhost:1234/v1` | Existing. |
| `SESSION_TTL_MS` | env | `1800000` (30 min) | Idle session cleanup. |
| `GAME_API_URL` | env | `http://localhost:3000/quest/start` | Existing — points to bridge itself for loopback. |
| `GAME_API_URL_COMPLETE` | env | `http://localhost:3000/quest/complete` | Existing — points to bridge itself. |

**Invariants**:
- `BRIDGE_HOST` MUST resolve to a loopback address; the bridge logs a warning and refuses to bind otherwise.

---

## Cross-cutting integration invariants

1. **No direct file sharing across modules.** The browser never reads `ai/memory/*.json`; the bridge mediates all access.
2. **No new memory schema.** All persisted JSON files keep their existing shapes — this feature does not migrate or extend `CharacterMemory`, `PlayerProfile`, or `PlayerSummary`.
3. **Idempotency of quest completion** is preserved by the existing `processed-completions.json` mechanism and the `runQuestCompletionPipeline` reason codes (`applied` | `duplicate` | `invalid`).
4. **TUI compatibility.** `ai/src/index.ts` (the existing readline UI) remains usable while the bridge is running, provided the LM Studio model isn't saturated. The bridge does not lock memory files exclusively.
