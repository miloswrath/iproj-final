# Feature -> asset-organization-playtest-reorg-inventory-ui

## Required Context Files

Read these before writing or revising requirements:

- [docs/feat/CONSTITUTION.md](docs/feat/CONSTITUTION.md)
- [MECHANICS-CONSTITUTION.txt](MECHANICS-CONSTITUTION.txt)
- [docs/game-design/game-functionality.md](docs/game-design/game-functionality.md)

## Requirements

- Normalize the top-level `assets/` directory so runtime-ready game assets live under stable category folders (`characters`, `enemies`, `objects`, `tilesets`, `ui`) and raw vendor/source packs are either moved into `_source` or clearly marked as pending import.
- Remove ambiguity around which folders are game-ready versus source-only so loader code and future teammates do not need to inspect vendor pack names to find usable files.
- Verify and document that the current playable game lives in `playtest/`, then define a reorganization path that makes the main app location explicit without breaking the current run/build workflow.
- Preserve the existing playable loop in `playtest/` while any folder or naming cleanup happens; asset cleanup must not break overworld, dungeon, or combat scene bootstrapping.
- Add a first inventory and items UI slice using the newly added `assets/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg` pack as the visual source.
- Inventory UI must support at minimum: opening/closing the inventory, showing item slots, showing a selected item detail area, and rendering placeholder or real item entries from structured game data.
- Item UI must support gameplay-first data fields that align with the mechanics constitution: item name, item type, stack count or quantity where relevant, and a short functional description of combat or progression use.
- The first UI slice must not stall gameplay flow; the inventory should be lightweight, readable, and compatible with the current simple Phaser scene structure.
- Define a clear import path for the new UI pack so selected UI sprites are copied or renamed into a stable runtime folder instead of being referenced directly from the vendor pack root forever.
- Keep scope mechanics-first: this feature is about project organization and usable inventory/items UI, not lore, dialogue writing, or narrative presentation.

## Out Of Scope

- Full migration from `playtest/` into a finalized production app folder if that requires broad build-system changes beyond clarifying and stabilizing the current structure.
- Full item economy balancing, crafting systems, shops, rarity tuning, or final loot tables.
- Equipment stat simulation for every combat action if the current combat prototype does not yet consume that data.
- UI theming for every scene in the game; this feature starts with inventory and item presentation.
- Reprocessing every source asset pack in `assets/_source` if it is unrelated to the current runtime or UI work.

## Clarification Step (Required)

Before implementation planning:

1. Ask targeted questions to resolve ambiguity in scope, controls, data flow, and success criteria.
2. Rewrite requirements with resolved details and no vague language.
3. Re-check against all three context files above to ensure alignment.

## Clarifications

### Session 2026-04-23

- Q: What does "cleaning up assets folder" mean in the current repo? -> A: Move or rename unorganized top-level vendor folders into a predictable runtime/source split, especially for packs that are still sitting at `assets/` root.
- Q: Is `playtest/` still the main game? -> A: Yes. Current runnable Vite/Phaser app files are under `playtest/`, so the feature should treat that as the active game until a later migration is approved.
- Q: Does "begin working on UI" mean whole-game HUD redesign or a focused slice? -> A: Focused slice. Start with inventory and item UI only.
- Q: Should the new Craftpix UI pack be consumed directly from its vendor folder? -> A: No. Use it as source material, then move the chosen runtime assets into a stable organized UI path.
- Q: Are inventory/items expected to be mechanics-first placeholders if backend systems are still thin? -> A: Yes. The first pass can use structured placeholder item data as long as the UI contract is real and ready to connect to combat/progression later.

## Resolved Implementation Requirements

- Treat `playtest/` as the active runnable Vite/Phaser app for this feature; do not move or rename it during this pass.
- Keep runtime-ready assets under stable category folders only: `assets/characters`, `assets/enemies`, `assets/objects`, `assets/tilesets`, and `assets/ui`.
- Move top-level vendor/source packs that are not direct runtime folders into `assets/_source`, then update any helper tooling that depends on their paths.
- Import the selected Craftpix RPG UI runtime files into `assets/ui/inventory` and load the game from those stable paths instead of the vendor pack root.
- Add a lightweight inventory overlay to the current playtest scenes that opens and closes with explicit player input and does not break overworld or dungeon bootstrapping.
- Support slot browsing with visible selection state and a detail panel that shows item name, item type, quantity, and a short mechanics-first description.
- Seed the overlay with structured placeholder items representing consumables, loot, quest items, equipment, or upgrade materials aligned with the combat/progression loop.
- Update repo-facing documentation so teammates can tell which asset folders are runtime-ready, where source packs live, and that `playtest/` is the current main app.

## Implementation Plan

Use short checkpoints that can be completed and committed independently.

### ***Checkpoint 1: Asset Folder Audit And UI Import Path***

- [ ] Audit top-level `assets/` folders and classify each as runtime-ready, source-only, archive, or pending import.
- [ ] Create a stable `assets/ui` organization for imported runtime UI elements from the new Craftpix RPG UI pack.
- [ ] Update asset inventory documentation to reflect the new UI pack and any moves/renames performed during cleanup.
- **Test**: Verify the repo still builds/runs after folder cleanup and confirm the selected UI files can be imported from stable non-vendor runtime paths.

### ***Checkpoint 2: Playtest App Location Clarification***

- [ ] Confirm `playtest/` as the current main playable app and document that decision in repo docs or README-facing guidance.
- [ ] Identify any path assumptions in loader code that depend on current folder placement and keep them stable during cleanup.
- [ ] Define a low-risk next-step reorganization plan if the app should later move out of `playtest/`, without blocking current feature work.
- **Test**: Run the current `playtest` development or build workflow and confirm overworld, dungeon entry, and combat still boot after documentation and path cleanup.

### ***Checkpoint 3: Inventory And Item UI First Slice***

- [ ] Import selected panel, frame, slot, and cursor assets from the new UI pack into organized runtime UI folders.
- [ ] Add an inventory overlay or scene-level panel that can open/close from player input without breaking the current scene loop.
- [ ] Introduce structured item data and render item slots plus a selected-item detail panel with functional labels and quantities.
- [ ] Seed the UI with representative items that match current mechanics direction, such as consumables, dungeon loot, or upgrade materials.
- **Test**: Open and close inventory in the running game, navigate visible item entries, and confirm selected item details update correctly without blocking return to overworld/combat flow.

## Scope Guardrails

- Checkpoints should be small enough to be separate commits.
- Each checkpoint must include a test/validation step.
- Keep architecture and file structure consistent with the current project.
- Avoid adding narrative/story dependencies unless the feature explicitly requires them.
