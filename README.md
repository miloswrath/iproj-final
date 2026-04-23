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

## Sprint 2 Overworld Validation

Use these steps for the handcrafted field -> city overworld baseline.

1. Start playtest (`npm run dev`) and load overworld.
2. Confirm HUD shows:
- Ambient loops count <= 35
- Traversal audit PASS
3. Run 3 full overworld loops at normal speed:
- Spawn outskirts -> city route -> dungeon gate -> backtrack
4. Run 3 full loops while holding sprint where possible.
5. Confirm gate marker and route landmarks are readable within 10 seconds from initial view.
6. Confirm no hidden blocker interrupts critical route.
7. Trigger dungeon entry with `E` and verify return-to-overworld behavior still works.

Acceptance criteria:
- Traversal audit reports PASS.
- No stuck points in all 6 traversal loops.
- Route/objective readability preserved after decor/ambient rendering.
- Overworld rendering remains deterministic across scene reloads.

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

## Curated Dungeon Pool Workflow

Dungeon selection now uses a curated JSON pool instead of pure runtime generation.

1. Edit `playtest/src/game/data/dungeons/curatedDungeonPool.json`.
2. Add a new object under `dungeons` with:
- `id`: unique identifier
- `tileTheme`: `classic` or `undead`
- `spawnCell`: `{ "x": <int>, "y": <int> }`
- `rooms`: array of `{ "x", "y", "w", "h" }`
- `corridors`: array of `{ "from": {"x","y"}, "to": {"x","y"}, "width" }`
3. Run `npm run dev` from `playtest/` and press `R` in dungeon to cycle pool entries.
4. Confirm the HUD line `Active layout: <name> [<id>]` changes as you cycle.

Validation contract enforced at runtime:
- Rooms: integer `x/y/w/h`, minimum room size `3x3`, all room tiles must remain inside playable interior bounds.
- Corridors: each entry must define integer `from` and `to` cells and integer `width` between `1` and `3`.
- Spawn: `spawnCell` must be an interior walkable floor tile after rooms/corridors are carved.
- Reachability: every floor tile must be connected to spawn through 4-direction walkable paths.

Quick verification loop:
1. Add or edit one curated dungeon entry.
2. Start playtest with `npm run dev` in `playtest/`.
3. Enter dungeon and press `R` until your layout ID appears.
4. Traverse from spawn through rooms/corridors and verify no isolated floor islands.
5. If the layout never appears, fix schema/bounds/connectivity issues and retest.

Fallback behavior:
- If curated pool data is missing or all entries fail validation, runtime falls back to generated layouts so playtest remains usable.

## Out of Scope (Deferred)

- Puzzle / QTE system
- Reward loop
- Story and narrative systems

## Handoff Notes

- AI behavior and story systems are intentionally isolated from this branch.
- Entry integration point for future systems is scene transition logic between overworld and dungeon.
