# Feature -> dungeon-combat-variety-balance-pass

## Status

Branch: `feature/dungeon-combat-variety-balance-pass`

This feature is now in progress. The original stability pass has been partly implemented, so this document separates completed work from remaining gameplay work.

## Required Context Files

Read these before writing or revising requirements:

- [docs/feat/CONSTITUTION.md](docs/feat/CONSTITUTION.md)
- [MECHANICS-CONSTITUTION.txt](MECHANICS-CONSTITUTION.txt)
- [docs/game-design/game-functionality.md](docs/game-design/game-functionality.md)

## Implemented So Far

- Dungeon viewport/camera sizing was adjusted so the dungeon renders centered at the current playtest resolution without the right-side black strip.
- Dungeon and overworld HUD command text was reduced to player-facing controls by default.
- Dungeon debug commands and audit/layout text were moved behind the `F2` dev overlay.
- Non-openable decorative dungeon chest placement was removed from the active dungeon route.
- Inventory icon rendering was updated so item icons can use either spritesheet frames or dedicated image textures.
- `Field Tonic` now uses a dedicated cropped icon texture instead of a clipped spritesheet frame.
- `Crystal Shard` and `Iron Ore` inventory icon frames were corrected.
- Combat defeat now resets player HP before returning to the overworld.
- Dungeon enemy positions are now persisted across combat scene transitions:
  - The enemy that starts combat returns to its spawn/idle position if it survives.
  - Other enemies, including enemies that were chasing the player, keep the exact position they had when combat started.
  - Defeated enemies remain removed through the existing defeated enemy tracking.

## Current Requirements

- Preserve the existing core loop: overworld -> dungeon -> turn-based combat -> chest/reward -> progression update -> overworld.
- Keep implementation mechanics-first and compatible with the current Phaser playtest structure.
- If this branch touches dungeon visual identity, limit it to color changes only; do not add, rename, or change displayed dungeon names because that belongs to the teammate's branch.
- Do not edit portal progression, four-clear gates, or NPC unlock logic in this branch.
- Continue to treat combat as the primary system; traps, puzzles, and traversal blockers must remain secondary.

## Remaining Requirements

### Combat Balance

- Enemy damage must scale by dungeon tier instead of dealing excessive flat damage in early runs.
- Defend must reduce enough incoming damage to be useful when the player expects a hit, while still costing the player's turn.
- Player attack variety must include at least one additional combat option after the player earns early dungeon rewards, such as a stronger attack with a cooldown, stamina cost, or limited charges.
- Early dungeon encounters should not kill a full-HP player in one or two enemy turns.

### Enemy Variety

- Dungeons must support at least five enemy archetypes total: basic, tank, glass cannon, support, and status or pressure enemy.
- Enemy selection must be tied to dungeon tier or dungeon identity so later dungeons clearly feel riskier.
- Each enemy archetype must have distinct stats or behavior that changes player decision-making, not just a renamed sprite.
- Battle log and HUD text must make special enemy behavior understandable without long explanations.

### Dungeon Enemy Pursuit

- Enemies must path toward the player through walkable dungeon cells instead of moving in a straight line through walls.
- Chasing enemies must not get permanently stuck behind walls, corners, or room boundaries while the player is reachable.
- Enemy chase speed must be tuned so sprinting away is possible but not always trivial.
- Enemy pursuit behavior may vary by archetype, such as vampire enemies using a short cooldown dash/lunge and slime enemies using a short hop toward the player.
- Pursuit abilities must create dungeon maneuvering pressure without replacing turn-based combat resolution; touching the player still starts combat.
- Entering combat must freeze and preserve non-engaged enemy positions for the eventual dungeon return.

### Items And Rewards

- Add at least four new item definitions across consumables, upgrade materials, and dungeon loot.
- At least two new items must be combat-usable from the battle item menu.
- Chest rewards must pull from dungeon-aware reward tables instead of always using the same small reward set.
- Reward text and inventory descriptions must stay short, functional, and aligned with the dungeon loop.

### Dungeon Layout And Room Interaction Variety

- Required dungeons must contain more than four rooms, with a target minimum of six meaningful rooms or equivalent traversal sections.
- Add obstacle variety beyond static decorations, starting with traps and at least one interactable gate, switch, hidden wall, or puzzle-style traversal blocker.
- Puzzle and trap mechanics must remain secondary to combat and must not hard-stop the run without a clear recovery path.
- Obstacle state must be clear through prompt text, visible feedback, and collision updates.

## Out Of Scope

- Full story writing, cutscenes, or narrative quest chains.
- Replacing the existing Phaser scene structure or moving the project to a new engine.
- Full party combat, multi-enemy battle formations, or companion battlers.
- Final economy tuning for every future item, enemy, and upgrade.
- Procedural dungeon generation rewrite if curated dungeon pool updates can satisfy this feature.
- Adding every enemy asset in the repository; this pass only needs enough enemy variety to make combat decisions meaningful.
- Portal progression, four-dungeon level gates, and NPC unlock changes; that work belongs to a teammate's branch.
- Displayed dungeon-name changes, portal name labels, or any player-facing dungeon naming UI; this branch may only adjust colors if visual dungeon identity work is needed.

## Clarification Step

The initial clarification step has been completed for this feature. Any new requirement change should be captured below with a dated note before implementation.

## Clarifications

### Session 2026-04-28

- Q: Which ideas work best together for one branch? -> A: Group combat balance, enemy/item variety, dungeon room variety, and current playability fixes. Defer portal progression, NPC unlock gates, broad story, full equipment economy, and every possible dungeon puzzle type.
- Q: Should all listed ideas be implemented at once? -> A: No. Implement in checkpoints so the branch can stop after a stable slice if time runs short.
- Q: Should this branch include the one-portal, four-dungeon progression gate, or NPC unlock? -> A: No. That work is reserved for a teammate and is explicitly out of scope here.
- Q: Should this branch change displayed dungeon names? -> A: No. If dungeon identity visuals are touched, only color should change. Displayed names and name labels belong to the teammate's branch.
- Q: Should all visible chests open? -> A: Yes. Decorative chests that look like rewards should be removed from active routes or converted into real interactable chests.
- Q: What is the minimum dungeon size improvement? -> A: Required progression dungeons should have at least six meaningful rooms or equivalent sections, with traversal choices and enough room for combat, rewards, and secondary interactions.
- Q: How should combat balance be measured? -> A: A normal early dungeon encounter should not kill a full-HP player in one or two enemy turns, and defending should reduce expected incoming damage enough that it can preserve a run.
- Q: What should happen to the command text in the top-left HUD? -> A: Default HUD text should read like a player-facing game UI, showing only controls needed to play the current scene. Debug commands such as dungeon switching and layout selection should be hidden unless dev mode is active.
- Q: How should chasing enemies work? -> A: They should use walkable dungeon paths instead of straight-line movement into walls. Different enemy archetypes can add movement pressure, such as vampire lunges or slime hops, as long as contact still resolves into normal turn-based combat.
- Q: Are these requirements aligned with the context files? -> A: Yes. They preserve turn-based combat as the primary system, support overworld -> dungeon -> reward -> upgrade progression, keep puzzles secondary, and avoid narrative dependency.

### Session 2026-04-29

- Q: What should happen to other enemies that were chasing when combat starts with one enemy? -> A: Only the enemy that actually starts combat should return to its spawn/idle position after combat. Other chasing enemies should keep their combat-start positions when the dungeon resumes.

## Implementation Plan

Use short checkpoints that can be completed and committed independently.

### Checkpoint 1: Stability And Visual Bug Fixes

- [x] Fix dungeon scene viewport/camera sizing so the dungeon window is centered and fills the intended play area without right-side black space.
- [x] Fix `Field Tonic` inventory icon rendering so it stays inside the inventory slot bounds and looks like the intended potion/tonic asset.
- [x] Correct `Crystal Shard` and `Iron Ore` inventory icons.
- [x] Ensure visible active-route dungeon chests are reward-bearing by removing non-openable decorative chest placement.
- [x] Preserve non-engaged enemy positions when combat starts, including enemies that were chasing the player.
- [x] Reset the engaged enemy to its spawn/idle position after combat if it survives.
- [x] Reset player HP after defeat before returning to the overworld.
- [x] Replace top-left player HUD command text with only gameplay-essential controls.
- [x] Move dungeon layout cycling, dungeon number entry, sandbox labels, audit labels, and other debug-only text into an `F2` dev overlay.
- **Validation done**: `npm.cmd run build` passed after the stability fixes.
- **Manual test still useful**: Run the playtest as a normal player, enter a dungeon, trigger combat while multiple enemies chase, return from combat, inspect inventory icons, and confirm no dungeon viewport black strip appears. Then enable dev mode and confirm debug commands are still discoverable there.

### Checkpoint 2: Combat Balance And Item Expansion

- [ ] Add a small combat tuning table keyed by dungeon tier or dungeon id for player-safe enemy HP/damage scaling.
- [ ] Tune defend reduction so defending meaningfully lowers damage while still costing the player turn.
- [ ] Add at least four item definitions, with at least two marked combat-usable and connected to `applyCombatItemEffect`.
- [ ] Update chest reward generation to use dungeon-aware reward tables with consumables, loot, and upgrade materials.
- [ ] Add one additional player combat option after early dungeon rewards are available, keeping it deterministic and easy to validate.
- **Test**: Complete early and later dungeon encounters using attack-only, defend, and item strategies; confirm early enemies do not overkill the player, defend changes survival math, and combat items consume inventory quantities correctly.

### Checkpoint 3: Enemy Variety And Dungeon Identity

- [ ] Expand enemy definitions to at least five archetypes: basic, tank, glass cannon, support, and status or pressure enemy.
- [ ] Assign enemy pools by dungeon id or tier so required dungeons select different enemy mixes.
- [ ] If dungeon identity colors are adjusted while wiring enemy pools, keep the change color-only and do not alter displayed dungeon names or labels.
- [ ] Add battle log and HUD text that makes special enemy behavior understandable without long explanations.
- [ ] Validate enemy variety with available sprite assets first, using stat and behavior differences even when a sprite must be reused.
- **Test**: Cycle through the required dungeons and confirm at least five enemy archetypes can appear, each with a distinct stat profile or combat behavior.

### Checkpoint 4: Path-Aware Enemy Pursuit

- [ ] Replace straight-line enemy chase movement with path-aware movement over walkable dungeon cells.
- [ ] Add stuck recovery so enemies can recalculate a route if the player moves around corners or into another room.
- [ ] Tune baseline enemy chase speed so the player can escape with smart movement but cannot ignore enemies by sprinting in a straight line forever.
- [ ] Add at least two archetype pursuit behaviors, starting with a vampire dash/lunge and slime hop, with readable cooldowns or animation cues.
- [ ] Keep combat start rules unchanged: enemy contact starts the turn-based encounter.
- [ ] Preserve current combat-return positioning rule: the engaged enemy resets if it survives, while all other enemies keep their combat-start positions.
- **Test**: In a multi-room dungeon, pull enemies around walls and corners, confirm they route through openings instead of pushing into walls, verify vampire/slime movement abilities make avoidance harder without causing unavoidable instant combat, and confirm non-engaged chasers do not snap back to spawn after combat.

### Checkpoint 5: Larger Dungeons And Secondary Obstacles

- [ ] Update required dungeon layouts so each has at least six meaningful rooms or equivalent traversal sections.
- [ ] Add trap placements that cost HP, time, or positioning but do not hard-stop the run.
- [ ] Add one interactable secondary obstacle type such as a switch gate, hidden wall, or simple puzzle lock.
- [ ] Make obstacle state clear through prompt text, visible feedback, and collision updates.
- [ ] Keep combat density higher than puzzle density so puzzles remain secondary.
- **Test**: Traverse each required dungeon from spawn to completion, confirming there are no blocked routes, traps provide feedback, the obstacle interaction opens the intended path, and combat remains the main activity.

## Scope Guardrails

- Checkpoints should be small enough to be separate commits.
- Each checkpoint must include a test/validation step.
- Keep architecture and file structure consistent with the current project.
- Avoid adding narrative/story dependencies unless the feature explicitly requires them.
- Prefer extending current files such as `playtestProgression`, `inventoryData`, `DungeonScene`, `OverworldScene`, and curated dungeon data before introducing new framework-level abstractions.
- Stop after any completed checkpoint if deadline pressure requires a smaller stable branch; Checkpoint 1 is the minimum quality gate before larger mechanics changes.
- Do not edit portal progression, four-clear gates, or NPC unlock logic in this branch.
- Do not change displayed dungeon names, dungeon name labels, or portal name text in this branch; color-only visual changes are allowed if needed.
