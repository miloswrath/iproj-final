# Quickstart: NPC Memory and Conversation Termination System

**Feature**: 002-memory-termination-system
**Date**: 2026-04-16

---

## Prerequisites

- Existing `001-local-llm-chat-api` session working (LM Studio at localhost:1234)
- Node.js 20, pnpm installed
- `docs/prompts/` directory populated with character files

---

## Memory Directory Setup

Memory files live at `memory/` (created automatically on first run):

```
memory/
├── player-profile.json
├── player-summary.json
├── pending-notifications.json   ← created only if API notify fails
└── characters/
    ├── kind_guide.json
    └── ...
```

On first launch, all memory files are initialized with defaults (neutral metrics, empty summaries).

---

## Running a Session

```bash
npm run dev
```

Conversation works exactly as before. The memory system runs transparently — metrics update when you exit or accept a quest.

---

## Inspecting Memory During a Session

```bash
# Full state of all memory layers
/state

# Inspect one character's memory
/char kind_guide

# See current conversation feature scores
/features

# Reload memory from disk (without restarting)
/reload
```

---

## Testing Termination and Pipeline

```bash
# Force quest acceptance and trigger the full pipeline
/simulate_accept
```

This exercises the complete flow: feature extraction → metric update → summary regeneration → disk write → external API notify. Useful for verifying memory persistence before a real conversation.

---

## Verifying Memory Persistence

After a session ends (naturally or via `/simulate_accept`), inspect the updated files:

```bash
cat memory/player-profile.json
cat memory/characters/kind_guide.json
cat memory/player-summary.json
```

Metrics should have shifted from their previous values. The `promptSummary` fields in the character file should reflect the conversation's tone.

---

## External API Integration

The system posts to `http://localhost:3000/quest/start` by default (configurable via `GAME_API_URL` env var).

If the game API is not running, the notification payload is saved to `memory/pending-notifications.json` and retried automatically on the next session start.

To test with a stub:
```bash
GAME_API_URL=http://localhost:9999 npm run dev
```

Use any HTTP echo server on port 9999 to capture and inspect the outbound payload.

---

## Confidence Threshold Tuning

The LLM intent classifier threshold defaults to 75 (0–100 scale). To adjust:

Set `ACCEPT_CONFIDENCE_THRESHOLD=80` (or any 0–100 integer) in your shell before running.

```bash
ACCEPT_CONFIDENCE_THRESHOLD=85 npm run dev
```

Higher = stricter (fewer false positives, may miss soft acceptances).
Lower = looser (catches more paraphrasing, may over-trigger).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| No memory files created | `memory/` dir missing write permission | `chmod 755 memory/` |
| Conversation never terminates | Rule triggers disabled, model confidence low | Check input phrasing; try `/simulate_accept` |
| API notify fails silently | Game API not running | Check `memory/pending-notifications.json` |
| Metrics not changing | Features all scoring zero | Run `/features` to inspect; check transcript length |
