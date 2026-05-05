# Feature -> npc-progression-combat-village-fix-pass

## Required Context Files

Read these before writing or revising requirements:

- [docs/feat/CONSTITUTION.md](docs/feat/CONSTITUTION.md)
- [MECHANICS-CONSTITUTION.txt](MECHANICS-CONSTITUTION.txt)
- [docs/game-design/game-functionality.md](docs/game-design/game-functionality.md)
- [specs/007-npc-friend-progression/spec.md](specs/007-npc-friend-progression/spec.md)
- [game/src/game/npc/npcConfig.js](game/src/game/npc/npcConfig.js)

## Requirements

- NPC progression must use NPC-specific reward pools from `game/src/game/npc/npcConfig.js` instead of relying on generic or placeholder rewards.
- Each active NPC must have rewards that match their archetype, rating, or quest tier, including at least one unique item or upgrade-relevant item per completed companion arc.
- The first NPC must not remain hard-coded as the `general` archetype unless debug override is explicitly active.
- Add a clear player-facing way to get upgrades after dungeon rewards, NPC completion rewards, or item purchases.
- Add a simple buy-item flow so the player can exchange earned currency or materials for consumables or upgrade materials.
- Add measurable type progression so items, upgrades, or NPC reward paths give the player clear growth over repeated overworld -> dungeon -> reward -> upgrade loops.
- Fix combat tuning so basic attack does not one-shot normal enemies by default.
- Heavy attack must have a distinct tactical purpose, such as higher damage with a stamina cost, cooldown, charge delay, or accuracy tradeoff.
- Early encounters must remain winnable without turning combat into attack-only spam.
- Village design work must be tracked as a separate work area from NPC reward/progression and combat balance.
- Village building hitboxes must match visible building footprints closely enough that the player can walk around buildings without invisible wall confusion.
- Village NPCs must connect to upgrade, shop, or progression interactions instead of existing only as unused scenery.
- Village buildings must have distinct gameplay roles, such as shop, upgrade station, quest hub, or dungeon access marker.

## Out Of Scope

- Full story writing, cutscenes, or narrative quest chains.
- Replacing the current Phaser scene architecture.
- A full economy rebalance for every future item, NPC, and dungeon.
- Adding unlimited NPCs or a final roster beyond the current companion progression needs.
- Rebuilding the entire overworld map if targeted village layout, collision, and building-role changes can solve the current problems.
- Adding complex branching dialogue; NPC dialogue should remain functional and tied to quests, rewards, upgrades, or progression.

## Clarification Step (Required)

Before implementation planning:

1. Confirm whether the first active NPC should be randomly selected from all non-`general` archetypes or from a curated starter list.
2. Confirm the minimum upgrade loop for this pass: item shop only, stat upgrades only, equipment upgrades only, or a small mix of all three.
3. Confirm what resource buys items: currency, upgrade materials, dungeon loot, or a combination.
4. Confirm how heavy attack should be balanced: cooldown, stamina cost, lower accuracy, or limited charges.
5. Confirm whether village buildings need interiors now or only distinct exterior roles and interaction prompts.
6. Rewrite requirements with resolved details and no vague language.
7. Re-check against all required context files above to ensure alignment.

## Clarifications

### Session 2026-05-04

- Initial notes identify three related but separable problem areas: NPC-specific rewards/progression, combat one-shot balance, and village design/usefulness.
- Village design should remain a separate work area so collision/layout/building identity changes do not get tangled with combat tuning.
- NPC reward work should start in `game/src/game/npc/npcConfig.js` by checking and expanding the `rewardPool` data.
- Combat balance should specifically investigate why regular attack one-shots enemies and makes heavy attack useless.
- Implementation assumption for this pass: the starter NPC remains the same world NPC id but uses the non-`general` `enabler` archetype unless the debug `?archetype=` override is explicitly supplied.
- Implementation assumption for this pass: upgrades use a small mixed model: attack, HP, and guard upgrades purchased in town with dungeon/NPC materials.
- Implementation assumption for this pass: item purchases use dungeon currency plus occasional trade materials.
- Implementation assumption for this pass: heavy attack uses higher damage with lower accuracy and a longer cooldown.
- Implementation assumption for this pass: village buildings and town NPCs need distinct exterior gameplay roles and prompts, not interiors.
- New item-pool direction: add roughly 20 new items; NPC pools should favor rare, unusual, archetype-specific relics and upgrade-relevant materials, while dungeon chests should carry common supplies, currency, common loot, and occasional non-specific rare finds.

## Implementation Plan

Use short checkpoints that can be completed and committed independently.

### ***Checkpoint 1: NPC Reward Pools And Starter Archetype***

- [x] Audit `game/src/game/npc/npcConfig.js` for current NPC archetypes, reward pools, unlock chains, and any placeholder `general` usage.
- [x] Replace the hard-coded starter `general` archetype with the clarified non-`general` starter behavior.
- [x] Add NPC-specific reward pools that include guaranteed rewards and chance-based rewards where useful.
- [x] Ensure each NPC reward pool includes at least one reward that supports upgrades, item buying, or type progression.
- [x] Validate that friendship or completion rewards are granted once per NPC and persist across scene transitions/reloads.
- **Test**: Complete the required quests for at least two NPCs, verify each NPC grants the configured rewards once, verify the starter NPC is not `general`, and confirm reward results appear in inventory/progression state.

### ***Checkpoint 2: Upgrade, Shop, And Type Progression Loop***

- [x] Define the smallest complete upgrade model for this pass, including upgrade cost, benefit, persistence, and UI text.
- [x] Add a player-facing upgrade interaction through an NPC or village building.
- [x] Add a buy-item interaction for consumables or upgrade materials using the clarified resource type.
- [x] Connect dungeon loot and NPC rewards to upgrade/shop costs so rewards have clear progression value.
- [x] Add type progression display or state tracking so the player can see how their build has improved.
- [ ] Keep interactions short and functional without adding narrative dependency.
- **Test**: From a fresh progression state, earn dungeon or NPC rewards, buy at least one item, purchase at least one upgrade, reload, and confirm inventory/progression values persist and affect the next dungeon or combat encounter.

### ***Checkpoint 3: Combat One-Shot And Heavy Attack Balance***

- [x] Locate the damage formula and enemy HP definitions used by normal attacks and heavy attacks.
- [x] Fix the regular attack one-shot issue by tuning player damage, enemy HP, scaling, or accidental duplicated damage application.
- [x] Tune heavy attack so it is stronger than regular attack but constrained by the clarified cost or cooldown.
- [ ] Ensure defend and item use remain meaningful turn options where currently supported.
- [x] Update battle log text so regular attack and heavy attack outcomes are readable without long explanations.
- **Test**: Run early and mid-tier encounters using regular attacks, heavy attacks, defend, and combat items; confirm normal enemies usually survive at least one regular attack, heavy attack has a useful tradeoff, and early combat remains fair.

### ***Checkpoint 4: Village Design Pass***

- [x] Audit current village collision rectangles, building sprites, NPC placement, and interaction prompts.
- [ ] Adjust building hitboxes to match visible footprints and remove confusing invisible blockage.
- [x] Assign distinct gameplay roles to important village buildings, such as shop, upgrade station, quest hub, or dungeon access marker.
- [x] Connect village NPCs to those roles where appropriate so upgrade/shop/progression systems are discoverable through play.
- [x] Make building interactions readable through concise prompts without adding interiors unless clarified as required.
- [ ] Verify NPCs and building interactions do not overlap or block core navigation paths.
- **Test**: Walk the full village perimeter and main paths, interact with each role-bearing building/NPC, confirm hitboxes match visuals, confirm each important building has a distinct function, and confirm the player can reach quest/dungeon/upgrade/shop interactions without collision confusion.

### ***Checkpoint 5: Integration And Regression Validation***

- [x] Run existing automated tests for game and AI areas affected by NPC progression, rewards, and combat.
- [x] Build the game project and fix any compile or asset-reference errors.
- [ ] Manually validate the full loop: overworld -> NPC quest -> dungeon -> combat -> reward -> shop/upgrade -> harder repeat.
- [ ] Verify village changes do not break NPC spawn placement, post-battle return placement, or dungeon access.
- [ ] Document any remaining tuning values that should be revisited after playtesting.
- **Test**: Complete one end-to-end playtest from a clean state through an NPC reward, one item purchase, one upgrade, one balanced combat encounter, and a village interaction pass.

## Scope Guardrails

- Checkpoints should be small enough to be separate commits.
- Each checkpoint must include a test/validation step.
- Keep architecture and file structure consistent with the current project.
- Avoid adding narrative/story dependencies unless the feature explicitly requires them.
- Prefer extending existing files and systems before adding new framework-level abstractions.
- Keep village work separate from combat and NPC reward commits when possible.
- Do not make dialogue quality or story content a blocker for this feature; dialogue only needs to expose gameplay state and choices.
- Do not let shops or upgrades bypass the core dungeon reward loop; they should spend or transform rewards earned through play.
