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
- Enter highlighted dungeon gate zone and press E
- In dungeon sandbox, press R to regenerate random layout
- Find encounter marker and press E to enter combat
- Combat actions: Attack (1) or Defend (2)
- On victory, return to the same dungeon layout with encounter marked complete
- Press Q in dungeon to return to overworld with completion status
- On defeat, return directly to overworld with failed status

## Slice Test Steps

1. Enter dungeon from the overworld gate.
2. Confirm the layout differs across multiple R regenerations.
3. Confirm encounter marker is reachable from spawn in each generated layout.
4. Start combat and use Attack for one run, Defend for at least one round in another run.
5. Verify victory returns to dungeon with encounter disabled.
6. Verify defeat returns to overworld with failed status text.

## Out of Scope (Deferred)

- Puzzle / QTE system
- Reward loop
- Story and narrative systems

## Handoff Notes

- AI behavior and story systems are intentionally isolated from this branch.
- Entry integration point for future systems is scene transition logic between overworld and dungeon.
