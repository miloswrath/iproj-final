# Feature -> proprietary-developer-mode-world-builder

## Required Context Files

Read these before writing or revising requirements:

- [docs/feat/CONSTITUTION.md](docs/feat/CONSTITUTION.md)
- [MECHANICS-CONSTITUTION.txt](MECHANICS-CONSTITUTION.txt)
- [docs/game-design/game-functionality.md](docs/game-design/game-functionality.md)

## Requirements

- Add an in-game proprietary developer mode that can be toggled on/off during local playtest.
- In developer mode, allow drag-and-drop placement of tiles and objects from loaded asset palettes directly onto a grid-aligned map canvas.
- Support placement for at least three layers: floor, collision/walls, and decor/objects.
- Add selection tools for single-place, rectangle-fill, erase, and move-selected-object.
- Add visual placement previews (ghost sprite + grid highlight) before commit.
- Add deterministic snapping rules so all placements align to tile boundaries.
- Add collision paint mode so designer-authored collision exactly matches placed walls/solid objects.
- Add undo/redo history for at least 100 operations per edit session.
- Add save/load for world data to JSON in project-local files so authored maps can be replayed and iterated.
- Add asset palette grouping and filtering by category (walls, floors, props, interactables).
- Add a runtime validation pass that checks for disconnected areas, blocked spawn, missing dungeon entry/exit markers, and invalid gate-key routing.
- Keep all tooling mechanics-only and local-only; no narrative, cloud sync, or external publishing requirements.

## Out Of Scope

- Multiplayer collaborative editing.
- Runtime economy balancing tools.
- Dialogue/narrative authoring tools.
- External map marketplace/import pipeline.
- Production anti-cheat or release build modding controls.

## Clarification Step (Required)

Before implementation planning:

1. Ask targeted questions to resolve ambiguity in scope, controls, data flow, and success criteria.
2. Rewrite requirements with resolved details and no vague language.
3. Re-check against all three context files above to ensure alignment.

## Clarifications

### Session 2026-04-20

- Q: Should this tool be in-game or a separate desktop app? -> A: In-game proprietary developer mode inside the existing playtest runtime.
- Q: Who is the primary user? -> A: Solo developer/designer (you), with manual map crafting and quick iteration as top priority.
- Q: What is the minimum export format? -> A: JSON map data stored in-repo so maps can be loaded directly by game scenes.
- Q: Is this for local dev only or networked collaboration? -> A: Local development only.
- Q: What is the minimum placement workflow? -> A: Drag/drop from asset palette, grid snap, layer selection, undo/redo, save/load.

## Implementation Plan

Use short checkpoints that can be completed and committed independently.

### ***Checkpoint 1: Developer Mode Foundation***

- [x] Add developer mode toggle with clear HUD state indicator.
- [x] Add world-editor scene module/hooks that can attach to existing overworld and dungeon scenes.
- [x] Add grid overlay, cursor cell coordinates, active layer indicator, and camera controls for editing.
- [x] Add asset registry loader that reads available tiles/objects from local metadata JSON.
- **Test**: Toggle developer mode on/off in runtime without breaking normal gameplay input, and show palette with selectable assets.

### ***Checkpoint 2: Placement Tools + Data Model***

- [x] Implement placement tools: single-place, rectangle-fill, erase, move-selected-object.
- [x] Implement layer-aware editing for floor/collision/decor with deterministic grid snapping.
- [x] Implement undo/redo stack (>=100 actions) and operation batching for drag paint.
- [x] Define world JSON schema (map bounds, tile layers, object instances, collision cells, markers).
- [x] Add save/load commands for editor state and map data.
- **Test**: Build a small room layout, undo/redo multiple actions, save JSON, reload, and verify map rehydrates exactly.

### ***Checkpoint 3: Validation + Runtime Integration***

- [ ] Add map validation rules: spawn reachable, entry/exit markers present, no hard-locked path, collision consistency.
- [ ] Add dungeon-specific validator for key/gate route correctness and branch-room presence.
- [ ] Add import path so authored JSON maps can be loaded by gameplay scenes in place of generated maps.
- [ ] Add quickstart controls doc for designer workflow.
- **Test**: Author one full dungeon map in dev mode, pass validation, load into game loop, and run overworld -> dungeon -> combat -> return without scene regressions.

## Scope Guardrails

- Checkpoints should be small enough to be separate commits.
- Each checkpoint must include a test/validation step.
- Keep architecture and file structure consistent with the current project.
- Avoid adding narrative/story dependencies unless the feature explicitly requires them.
