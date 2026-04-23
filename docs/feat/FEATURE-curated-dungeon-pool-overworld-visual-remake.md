# Feature -> curated-dungeon-pool-overworld-visual-remake

## Required Context Files

Read these before writing or revising requirements:

- [docs/feat/CONSTITUTION.md](docs/feat/CONSTITUTION.md)
- [MECHANICS-CONSTITUTION.txt](MECHANICS-CONSTITUTION.txt)
- [docs/game-design/game-functionality.md](docs/game-design/game-functionality.md)

## Requirements

- Keep overworld structure handcrafted and deterministic across scene reloads, preserving existing spawn, traversal route, and dungeon gate interaction.
- Replace runtime-random dungeon selection with a curated local dungeon pool defined in project JSON files.
- Support at least 6 curated dungeon definitions at launch, each with unique room/corridor topology and explicit spawn cell.
- Add deterministic dungeon pool cycling behavior so `R` in dungeon rotates to the next curated entry instead of generating a fresh layout.
- Validate curated dungeon definitions at runtime before use (bounds-safe coordinates, valid rooms, valid corridors, valid spawn cell).
- If curated pool data is missing or invalid, fall back to a safe generated dungeon pool so playtest remains usable.
- Add a clear authoring workflow for adding new curated dungeons (JSON schema, coordinate rules, quick verification loop).
- Improve overworld visual quality with deterministic tile variant rendering (field/path/transition/water), while keeping collision and traversal behavior unchanged.
- Maintain mechanics-only scope: no narrative/story dependencies, no cloud sync, no external map publishing.
- Preserve core loop integrity (overworld -> dungeon -> combat -> return) with no regressions in scene transitions or controls.

## Out Of Scope

- Procedural generation tuning as the primary source of dungeon variety.
- Narrative worldbuilding or dialogue rewrite tied to visual changes.
- New combat systems, enemy AI rewrites, or progression economy rebalance.
- Multiplayer map editing or shared remote map repositories.
- Full biome expansion beyond the current overworld visual polish pass.

## Clarification Step (Required)

Before implementation planning:

1. Ask targeted questions to resolve ambiguity in scope, controls, data flow, and success criteria.
2. Rewrite requirements with resolved details and no vague language.
3. Re-check against all three context files above to ensure alignment.

## Clarifications

### Session 2026-04-21

- Q: Should the overworld remain fixed or become random? -> A: Overworld remains fixed/handcrafted.
- Q: Should dungeons be fully random or selected from a known set? -> A: Selected from a curated pool of dungeons.
- Q: Should dungeon authoring live in local project files? -> A: Yes, local JSON files in-repo.
- Q: Should the next step prioritize usability or visual quality? -> A: Both: start generating curated dungeons and remake overworld visuals.
- Q: Must this remain mechanics-first? -> A: Yes, no narrative dependency.

## Implementation Plan

Use short checkpoints that can be completed and committed independently.

### ***Checkpoint 1: Curated Dungeon Pool Core***

- [x] Define curated dungeon JSON schema and add initial pool file under playtest source data.
- [x] Build blueprint-to-layout conversion with runtime validation for rooms, corridors, and spawn.
- [x] Wire dungeon scene startup + regenerate command to curated pool cycling.
- [x] Add fallback generated pool when curated data is unavailable/invalid.
- **Test**: Enter dungeon and press `R` through all curated entries, confirming distinct layouts cycle deterministically and gameplay remains functional.

### ***Checkpoint 2: Dungeon Authoring Pipeline***

- [x] Document the curated dungeon JSON authoring contract and coordinate constraints.
- [x] Add at least 3 additional curated dungeon entries authored via the new schema.
- [x] Add lightweight identifier display in dungeon HUD to confirm active curated map while testing.
- [x] Validate spawn reachability and floor/collision coherence per curated entry before activation.
- **Test**: Author a new dungeon JSON entry, run playtest, load it through cycle order, and confirm traversal + encounter flow works without manual code edits.

### ***Checkpoint 3: Overworld Visual Remake Pass***

- [x] Replace flat ground rendering with deterministic texture variants and controlled tint diversity.
- [x] Improve water/transition visual readability with consistent style treatment and ambient pass.
- [x] Preserve blocked-cell logic, gate marker clarity, and minimap readability after visual changes.
- [ ] Run traversal audit and full loop regression (overworld -> dungeon -> combat -> overworld return).
- **Test**: Complete 3 overworld loops (normal + sprint) and 3 dungeon entries with no blocked-route regressions, then verify visual pass is deterministic across reloads.

## Validation Notes

- Automated build validation passed: `cd playtest && npm run build`.
- Curated dungeon pool validation passed: `cd playtest && npm run validate:dungeons`.
- Pool now includes 12 validated curated entries. The latest three are `crossroads-crypt`, `moonwell-switchback`, and `broken-causeway`.
- Remaining required validation is manual in-engine traversal/combat loop verification for the Checkpoint 3 regression test.

## Scope Guardrails

- Checkpoints should be small enough to be separate commits.
- Each checkpoint must include a test/validation step.
- Keep architecture and file structure consistent with the current project.
- Avoid adding narrative/story dependencies unless the feature explicitly requires them.
