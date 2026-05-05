# Quickstart: NPC Asset & Behavior Fixes

**Feature**: 008-fix-npc-asset-behavior

## Prerequisites

- Node.js 20+
- LM Studio running at `http://localhost:1234/v1`
- Dependencies installed for repo, `ai/`, and `game/`

## Run locally

### Terminal 1 — AI checks

```bash
cd /home/zak/school/sp26/cs/final/ai
npm test
```

### Terminal 2 — Game runtime

```bash
cd /home/zak/school/sp26/cs/final/game
npm run validate:npcs
npm run dev
```

Open the local Vite URL.

## Validation flow

1. Start a fresh progression run multiple times.
2. Confirm initial starter archetype is random among eligible entries and never `general`.
3. Force each target archetype and verify mappings:
   - parasite -> Countess_Vampire
   - enabler -> Converted_Vampire
   - honest_one -> girl-1
   - mirror -> girl-2
   - opportunist -> girl-3
4. For each mapped character, verify required movement and interaction animations play.
5. In an active conversation, submit `I will do it`; confirm immediate quest activation starts and required setup completes.
6. Repeat with `i will do it`; confirm same behavior.
7. Submit near-miss text (e.g., `I will do it!`) and confirm no debug activation trigger.
8. In overworld traversal, confirm designated follower NPC tracks player movement.
9. Trigger a transition (battle return or scene change) and confirm follower automatically resumes follow behavior.

## Suggested regression commands

From repo root:

```bash
cd ai && npm test
cd ../game && npm run validate:npcs && npm run build
```

Then run browser smoke tests for starter selection, mapping visuals/animations, debug activation, and follow recovery.
