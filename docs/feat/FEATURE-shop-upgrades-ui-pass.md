# Feature -> shop-upgrades-ui-pass

## Required Context Files

Read these before writing or revising requirements:

- [docs/feat/CONSTITUTION.md](docs/feat/CONSTITUTION.md)
- [MECHANICS-CONSTITUTION.txt](MECHANICS-CONSTITUTION.txt)
- [docs/game-design/game-functionality.md](docs/game-design/game-functionality.md)
- [docs/feat/FEATURE-npc-progression-combat-village-fix-pass.md](docs/feat/FEATURE-npc-progression-combat-village-fix-pass.md)
- [docs/feat/FEATURE-presentation-demo-readiness-pass.md](docs/feat/FEATURE-presentation-demo-readiness-pass.md)

## Requirements

- Add a player-facing UI for village shop, healer, trainer, quest hub, and upgrade interactions.
- Show available items, upgrade ranks, current resources, costs, and whether each purchase is affordable.
- Let the player buy shop items and upgrades through mouse or keyboard selection.
- Keep the existing village NPC roles, inventory state, and progression persistence.
- Keep the UI compact enough for the presentation build and avoid changing combat balance.
- Out of scope: new economy tuning, new shop buildings, interiors, crafting, or new item definitions.

## Clarification Step

1. Confirm whether one shared panel can cover both shops and upgrades. -> Assumption: yes, use one shared overlay with different modes.
2. Confirm whether purchases should still use the existing inventory/progression functions. -> Assumption: yes, keep current persistence and cost rules.
3. Confirm whether all upgrade categories should be accessible from any upgrade NPC. -> Assumption: blacksmith can show all upgrades, while healer and trainer should open role-specific panels.
4. Confirm whether the quest hub should remain a hint-only interaction. -> Assumption: no, it should open a lightweight records panel for presentation clarity.

## Implementation Plan

### ***Checkpoint 1: Shared Shop/Upgrade Overlay***

- [x] Add a compact overlay class for village purchases.
- [x] Show resources, player combat stats, item rows, upgrade rows, costs, and affordability.
- [x] Support mouse selection and keyboard selection/purchase/close.
- [x] Add role-specific panel modes for healer, trainer, and quest hub records.
- **Test**: Open the overlay in the overworld and confirm rows render without overlapping controls.

### ***Checkpoint 2: Village Interaction Wiring***

- [x] Route shop NPCs into shop mode instead of instant purchase.
- [x] Route upgrade NPCs into upgrade mode instead of instant purchase.
- [x] Route healer, trainer, and quest hub NPCs into distinct panel modes.
- [x] Refresh HUD labels and wallet after purchases.
- **Test**: Buy an affordable item or upgrade and confirm inventory/progression labels update.

### ***Checkpoint 3: Runtime Validation***

- [x] Extend or run runtime diagnostics against the title, overworld, shop, upgrade, healer, trainer, quest hub, dungeon, and combat scenes.
- [x] Capture shop, upgrade, healer, trainer, and quest hub overlay screenshots for quick demo review.
- [x] Confirm build passes.
- **Test**: Run `npm.cmd run build` and `npm.cmd run diagnose:runtime`.

## Scope Guardrails

- Do not add new item economy rules unless the existing UI cannot display current costs clearly.
- Do not make the village more complex than the current exterior interaction model.
- Keep the panel presentation-first and readable at the current game resolution.
