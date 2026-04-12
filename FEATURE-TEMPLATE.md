# Feature -> Playtest Foundation + Overworld Entry

## Requirements

---

- Build a minimal JavaScript playtest environment for fast gameplay iteration.
- Implement overworld movement for the player character using witchKitty assets.
- Implement dungeon entry trigger from overworld into one dungeon test scene.
- Keep combat, puzzle/QTE, and reward systems out of this feature and defer them to the next branch.
- Keep this feature focused on mechanics only; story and narrative systems remain out of scope.

## Implementation Plan

### ***Checkpoint 1: Playtest Environment Foundation***

- [x] Initialize JavaScript test runtime (recommended: Vite + Phaser) in project structure.
- [x] Add a boot scene and preload scene that load representative assets from [assets](assets).
- [x] Add a dev start command and verify the game runs locally with hot reload.
- [x] Document run steps in [README.md](README.md).

- **Test**: Game launches locally and renders a boot/playtest scene without missing asset errors.

### ***Checkpoint 2: Overworld Movement + Dungeon Entry***

- [x] Create an overworld test map scene with collision and camera follow.
- [x] Add witchKitty movement controls (WASD/arrow keys).
- [x] Add at least one dungeon entry trigger zone.
- [x] Transition from overworld scene to dungeon scene on trigger.

- **Test**: Player can move, collide with walls, and enter dungeon scene via trigger reliably.

### ***Checkpoint 3: Vertical Slice A Validation + Handoff***

- [x] Validate full loop for this scope: boot -> overworld movement -> dungeon entry.
- [x] Confirm no missing asset references in startup and scene transitions.
- [x] Record deferred systems for next branch: combat, puzzle/QTE, reward loop.
- [x] Prepare short handoff notes for teammate integration touchpoints (AI/story remain isolated).

- **Test**: Vertical Slice A runs end-to-end without blocking bugs.
