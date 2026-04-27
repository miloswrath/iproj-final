# Feature -> combat-revamp-item-command-ui-animation-pass

## Required Context Files

Read these before writing or revising requirements:

- [docs/feat/CONSTITUTION.md](docs/feat/CONSTITUTION.md)
- [MECHANICS-CONSTITUTION.txt](MECHANICS-CONSTITUTION.txt)
- [docs/game-design/game-functionality.md](docs/game-design/game-functionality.md)

## Requirements

- Replace the current `Attack/Defend` combat sandbox panel with a fuller turn-based command layout that feels closer to classic creature-battle JRPG flow while staying inside the current single-player dungeon loop.
- Combat command UI must support at minimum: `Attack`, `Item`, `Defend`, and `Flee` or a clearly disabled flee slot when fleeing is not allowed in the current encounter.
- The `Item` command must open a combat-only item picker that reads from the existing inventory/progression state and lets the player use eligible consumables during battle without leaving combat.
- Combat item usage must follow a clear rule set: only combat-usable items can be activated, using one consumes quantity from inventory, and the battle log plus HUD must reflect the effect immediately.
- The first combat item pass must explicitly support at least one healing consumable already present in item data, so the player can recover HP mid-battle in a "Pokemon-style" command flow.
- Combat UI must show clear player and enemy status panels, readable HP values, turn state, recent action log text, and current command focus using a more polished visual presentation than the current monospace debug box.
- Remodel the combat screen so it looks intentionally game-like rather than like a sandbox prototype, using imported UI art, layered panels, and cleaner composition while preserving readability on the current playtest resolution.
- Add visible player combat animations in addition to enemy animations, including at minimum idle plus one offensive action state and one hit/react state if sprite support exists or can be approximated cleanly.
- Add enemy action feedback beyond idle looping, including attack motion, damage reaction, and defeat feedback through sprite animation, tweening, flashes, or other clear visual timing cues.
- Combat flow must remain strictly turn-based and deterministic in input resolution, with item usage occupying the player's turn just like attacking or defending.
- Preserve return-to-dungeon and defeat-to-overworld transitions, but update them so the new combat state correctly carries forward HP, consumed items, and encounter completion outcome.
- Keep the feature mechanics-first: this is a combat system and combat presentation upgrade, not a story/cutscene/dialogue feature.

## Out Of Scope

- Party-size expansion, multi-enemy formations, or companion battlers in the same pass unless needed only as future-proof UI placeholders.
- Deep status-effect systems, elemental typing, capture mechanics, or full Pokemon battle rules replication.
- Final balance tuning for every item, enemy, and action.
- Full equipment/stat build system if the current progression layer is not ready to drive it yet.
- Narrative intros, battle dialogue scenes, or cinematic cut-ins unrelated to combat readability.

## Clarification Step (Required)

Before implementation planning:

1. Ask targeted questions to resolve ambiguity in scope, controls, data flow, and success criteria.
2. Rewrite requirements with resolved details and no vague language.
3. Re-check against all three context files above to ensure alignment.

## Clarifications

### Session 2026-04-23

- Q: What does "Pokemon combat" mean for this project? -> A: Use a command-menu battle flow where `Item` is a first-class combat action and item selection happens inside battle rather than only from overworld/dungeon inventory overlay.
- Q: Should combat item access use the existing inventory state or a separate battle bag? -> A: Use the existing inventory/progression state so dungeon loot and consumables feed directly into combat.
- Q: What is the minimum required combat item behavior for the first pass? -> A: Support at least one healing consumable already defined in item data, consume quantity on use, and reflect the HP change immediately in combat HUD/log.
- Q: Is the request mainly visual or also mechanical? -> A: Both. Upgrade command options plus item access, then remodel the combat UI and add clearer player/enemy animations.
- Q: Must the combat revamp stay within the current single-enemy playtest loop? -> A: Yes. Keep it compatible with the current dungeon -> combat -> return loop rather than expanding into a full party battle system immediately.

## Implementation Plan

Use short checkpoints that can be completed and committed independently.

### ***Checkpoint 1: Combat Command And Item Flow Upgrade***

- [ ] Expand combat command handling from two actions to a structured command menu with `Attack`, `Item`, `Defend`, and `Flee` or disabled flee behavior.
- [ ] Add combat-only item selection that reads from existing progression inventory and filters to usable battle items.
- [ ] Implement first-pass consumable resolution, quantity reduction, battle log messaging, and HP updates for item use.
- [ ] Ensure item use, defend, and attack each spend the player's turn and transition cleanly into enemy action resolution.
- **Test**: Start combat with at least one usable consumable in inventory, use it from the `Item` menu, confirm quantity decreases, HP updates immediately, and turn order remains correct.

### ***Checkpoint 2: Combat UI Remake Pass***

- [ ] Replace the sandbox-style panel layout with a more polished combat composition using stable imported UI assets and clearer panel hierarchy.
- [ ] Add dedicated player and enemy status panels, command focus feedback, and battle log placement that stays readable on current playtest viewport sizes.
- [ ] Add a combat submenu presentation for item selection that does not obscure state clarity or break keyboard/controller-style navigation.
- [ ] Keep fallback readability high even if some imported UI art is decorative rather than perfectly tailored to current Phaser scene dimensions.
- **Test**: Run combat on the current playtest resolution, navigate commands and item menu with no overlap or unreadable text, and verify all key battle information remains visible throughout a full encounter.

### ***Checkpoint 3: Animation And Battle Feedback Pass***

- [ ] Add player-side combat visuals for idle plus action feedback, using sprite animation, frame changes, or tweened motion depending on available art.
- [ ] Add enemy attack, damage, and defeat feedback so battle outcomes are visually legible without relying only on log text.
- [ ] Sync combat feedback timing so attacks, item use, HP updates, and result states feel intentional rather than instantaneous debug updates.
- [ ] Preserve and validate post-battle transitions back to dungeon/overworld with consumed items and battle results carried forward correctly.
- **Test**: Complete one victory and one defeat flow, confirming player/enemy feedback animates during action resolution and the correct post-combat state persists after scene transition.

## Scope Guardrails

- Checkpoints should be small enough to be separate commits.
- Each checkpoint must include a test/validation step.
- Keep architecture and file structure consistent with the current project.
- Avoid adding narrative/story dependencies unless the feature explicitly requires them.
