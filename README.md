# Playtest Foundation (Vertical Slice A)

This branch contains a minimal JavaScript playtest runtime focused on mechanics only.

## Runtime

- Framework: Vite + Phaser 3
- Playtest app location: `playtest/`

## Local Development

1. Open a terminal at the repository root.
1. Install dependencies:

```bash
cd playtest
npm install
```

1. Start the dev server with hot reload:

```bash
npm run dev
```

1. Open the local URL shown by Vite (default `http://localhost:5173/`).

## Build Validation

Run a production build from `playtest/`:

```bash
npm run build
```

## Current Playtest Loop

- Boot scene -> preload scene -> overworld test scene
- Move player with WASD or arrow keys
- Collide with static wall blockers in overworld
- Enter highlighted dungeon gate zone and press E to transition scenes
- Press Q in dungeon (or click Return to Overworld) to return

## Out of Scope (Deferred to Next Branch)

- Combat system
- Puzzle / QTE system
- Reward loop
- Story and narrative systems

## Handoff Notes

- AI behavior and story systems are intentionally isolated from this branch.
- Entry integration point for future systems is scene transition logic between overworld and dungeon.
