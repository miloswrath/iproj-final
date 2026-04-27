# Quickstart: AI NPC Integration

**Feature**: 004-ai-npc-integration
**Audience**: Developer bringing the feature up locally for the first time after `/speckit.tasks` and `/speckit.implement` complete.

---

## 1. Prerequisites

- Node.js 20.x with corepack enabled (for `pnpm` in `ai/`) and npm (for `playtest/`).
- LM Studio installed, with a chat-capable local model loaded and the **OpenAI-compatible local server** running on `http://localhost:1234`.
- This repo cloned at `/home/<you>/school/sp26/cs/final` (or any path — the relative paths inside the repo are stable).
- Asset pack already vendored at `assets/_source/craftpix-net-242415-free-schoolgirls-anime-character-pixel-sprite-pack/` (verified — present on this branch).

---

## 2. One-time setup

From the repo root:

```bash
# Install AI deps
( cd ai && pnpm install )

# Install playtest deps
( cd playtest && npm install )
```

If the implementation step copied Girl_1 sprites into the playtest pipeline (it should have), `assets/characters/girl-1/{idle,walk,dialogue}.png` will exist. If they're missing, run the asset move:

```bash
mkdir -p assets/characters/girl-1
cp "assets/_source/craftpix-net-242415-free-schoolgirls-anime-character-pixel-sprite-pack/Girl_1/Idle.png"     assets/characters/girl-1/idle.png
cp "assets/_source/craftpix-net-242415-free-schoolgirls-anime-character-pixel-sprite-pack/Girl_1/Walk.png"     assets/characters/girl-1/walk.png
cp "assets/_source/craftpix-net-242415-free-schoolgirls-anime-character-pixel-sprite-pack/Girl_1/Dialogue.png" assets/characters/girl-1/dialogue.png
```

---

## 3. Run the three local services

You need **three** processes running. Use three terminals.

**Terminal 1 — LM Studio**: Start the LM Studio server UI, load a model, and click **Start Server**. Confirm it's up:

```bash
curl -s http://localhost:1234/v1/models | head
```

You should see a JSON body listing the loaded model.

**Terminal 2 — AI bridge** (the new server introduced by this feature):

```bash
cd ai
pnpm run dev:server
```

Expected log output:

```
[bridge] listening on http://127.0.0.1:3000
[bridge] LM Studio target: http://localhost:1234/v1
[bridge] retried pending notifications: 0
```

**Terminal 3 — Playtest (Vite)**:

```bash
cd playtest
npm run dev
```

Vite reports a URL like `http://localhost:5173`. Open it in Chromium.

---

## 4. End-to-end smoke test

In Chromium with the playtest open:

1. **Find Girl_1.** From the player spawn, walk to the configured NPC tile (default `girl-1-east` — see `playtest/src/game/npc/npcConfig.js`). A small **`E`** prompt appears above the NPC when you're within range.
2. **Press `E`.** The conversation overlay opens with the parchment frame, Girl_1 portrait on the left, and a greeting in the dialogue panel.
3. **Type a few messages.** Each replies within ~10 s. After turn 3-5, Girl_1 should offer a quest (rule + LLM-classifier-driven, see `ai/src/lifecycle/detector.ts`).
4. **Accept.** Type "yes" or "I'll do it." The NPC sends a confirmation line, the overlay auto-closes after ~1.5 s, and a **quest_start toast** appears top-right showing the quest title.
5. **Trigger a completion.** From devtools console, simulate a dungeon outcome by POSTing:
   ```js
   await fetch('/api/v1/quest/complete', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       character: 'general',
       questId: '<paste from the toast>',
       outcome: 'success',
       rewardReceived: true
     })
   }).then(r => r.json());
   ```
   A **quest_complete toast** should appear within ~250 ms.

---

## 5. Try other archetypes (SC-003)

The same Girl_1 sprite, with different personalities:

```
http://localhost:5173/?archetype=parasite
http://localhost:5173/?archetype=enabler
http://localhost:5173/?archetype=opportunist
http://localhost:5173/?archetype=honest
http://localhost:5173/?archetype=mirror
http://localhost:5173/?archetype=general
```

Each should produce a distinguishable conversation tone driven by `ai/docs/prompts/<archetype>.md`.

---

## 6. Common failure modes

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Overlay opens, error banner: "Could not reach AI service." | Bridge not running | Start Terminal 2 |
| Overlay opens, error banner: "LM Studio unavailable" (HTTP 503) | LM Studio server not started or no model loaded | Start LM Studio server, load a model |
| Toast never appears after acceptance | SSE connection blocked or `/api/v1/events` not proxied | Verify `vite.config.js` proxies `/api` to `:3000`; check devtools Network → EventStream |
| `quest_complete` toast never appears, but POST returned `{"applied": true}` | `notifyQuestComplete` HTTP loopback failed | Check bridge logs for POST `/quest/complete`; check `ai/memory/pending-notifications.json` for queued retries |
| `pnpm run dev:server` exits with `EADDRINUSE :3000` | Old bridge still running, or another process owns 3000 | `lsof -i :3000` and kill, then restart |

---

## 7. Tests

From `ai/`:

```bash
pnpm test
```

Should run the existing test suite plus the new contract tests under `ai/tests/server/`.

From `playtest/`:

```bash
npm run validate:dungeons
```

The browser-side smoke test from §4 stands in for unit tests this pass — Chromium validation is the spec's stated bar (FR-010).

---

## 8. Constitution checkpoint

Before merging, confirm:

- ✅ The dungeon entry portal still works without speaking to the NPC (Principle I).
- ✅ Bridge binds `127.0.0.1` only — `lsof -i :3000` shows it bound to localhost (Principle V).
- ✅ Both the existing `ai/src/index.ts` TUI (`pnpm dev`) and the new bridge (`pnpm dev:server`) work standalone (Principle II).
- ✅ All six archetypes produce distinguishable conversations (FR-008, SC-003).
- ✅ HUD toasts are ≤ 10% of vertical screen height (SC-002) — measure in devtools.
