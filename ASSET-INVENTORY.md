# Asset Inventory

## Scope
This inventory tracks organized game-ready assets under assets/ and maps them to gameplay systems in the mechanics constitution.

## Top-Level Asset Rules
- Runtime-ready assets live only under stable category folders: `assets/characters`, `assets/enemies`, `assets/objects`, `assets/tilesets`, and `assets/ui`.
- Vendor/source packs and authoring files live under `assets/_source`.
- New runtime imports should be copied into a stable category path before loader code references them.

## Playable Character Decision
- Primary playable character: witchKitty
- Deferred/archived character: calicoKitty (kept for future alternate skin or NPC use)

## Asset Pack Usage

| Asset Pack | Source Path | Organized Path | Usage | Status |
| --- | --- | --- | --- | --- |
| Free Village Pixel Tileset | craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense | assets/tilesets/overworld, assets/objects/overworld, assets/objects/animated | Overworld navigation tiles, decor, props, animated world objects | Active |
| Free Top Down Pixel Art Guild Hall Asset Pack | craftpix-net-189780-free-top-down-pixel-art-guild-hall-asset-pack | assets/_source/craftpix-net-189780-free-top-down-pixel-art-guild-hall-asset-pack, assets/objects/overworld/guild-hall | Town buildings, street walls, windows/doors, and guild themed props for overworld town composition | Active |
| Free Forest Objects Top Down Pixel Art | craftpix-net-505052-free-forest-objects-top-down-pixel-art | assets/_source/craftpix-net-505052-free-forest-objects-top-down-pixel-art, assets/objects/overworld/forest-objects | Forest trees, mushrooms, and nature landmarks (with-shadow and no-shadow variants) for outskirts/decor passes | Active |
| Free Basic Pixel Art UI For RPG | craftpix-net-255216-free-basic-pixel-art-ui-for-rpg | assets/_source/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg, assets/ui/inventory | Inventory panel art, slot frames, and item icon sheet for the first inventory/items UI slice | Active |
| Free 2D Top Down Pixel Dungeon Pack | craftpix-net-169442-free-2d-top-down-pixel-dungeon-asset-pack | assets/tilesets/dungeon | Dungeon floors/walls/object tiles for generated dungeon rooms | Active |
| Free Swordsman 1-3 Level Sprite Character | craftpix-net-180537-free-swordsman-1-3-level-pixel-top-down-sprite-character | assets/enemies/swordsman | Enemy combat sprites and animation sets for melee humanoid encounters | Active |
| Free Top Down Animals Farm Pixel Art Sprites | craftpix-net-291971-free-top-down-animals-farm-pixel-art-sprites | assets/enemies/animals | Additional enemy/NPC sprite variants for encounter diversity | Active |
| witchKitty custom sprites | witchKitty | assets/characters/witch-kitty | Main player character sprite sheets/animations | Active |
| calicoKitty custom sprites | calicoKitty | assets/characters/_archive/calico-kitty | Deferred alt character set for future content | Archived |

## Organized Structure

| Asset Type | Location | Usage | Status |
| --- | --- | --- | --- |
| Playable character sprites | assets/characters/witch-kitty | Player movement/idle animations | Active |
| Archived alt character sprites | assets/characters/_archive/calico-kitty | Future optional character/NPC | Archived |
| Overworld tilesets | assets/tilesets/overworld | Handcrafted overworld map | Active |
| Dungeon tilesets | assets/tilesets/dungeon | Procedural/random dungeon map generation | Active |
| Overworld objects | assets/objects/overworld | Non-combat map dressing/interactables | Active |
| Guild hall town props | assets/objects/overworld/guild-hall | Overworld town facades, interiors, windows/doors, and wall sets | Active |
| Forest objects (no-shadow) | assets/objects/overworld/forest-objects/no-shadow | Runtime-ready foliage and forest landmarks with clean layering control | Active |
| Forest objects (with-shadow) | assets/objects/overworld/forest-objects/with-shadow | Shadow-baked variants for quick composition tests | Active |
| Animated objects | assets/objects/animated | Environmental animation and visual feedback | Active |
| Inventory UI runtime assets | assets/ui/inventory | Stable imported UI art for inventory layout, frame tiles, and item icons | Active |
| Swordsman enemy sprites | assets/enemies/swordsman | Turn-based combat enemies (humanoid archetype) | Active |
| Animal enemy sprites | assets/enemies/animals | Turn-based combat enemies (beast archetype) | Active |
| Source authoring files | assets/_source | PSD/ASEPRITE/Tiled references and edits | Archive |

## Current Format Snapshot
- PNG files: 2678
- ASEPRITE files: 852
- PSD files: 444
- TMX files: 40

## Notes for Next Cleanup Pass
- Remove non-game metadata files from assets/_source where safe (for example .DS_Store and ._ prefixed files).
- Standardize runtime asset filenames to lowercase kebab-case when integrating with JavaScript loader manifests.
- Build a loader manifest (JSON or JS module) after mechanic scenes are scaffolded.
- Continue migrating remaining runtime folders with numbered vendor names such as `assets/objects/overworld/5 Grass` toward clearer semantic subfolders when that cleanup will not destabilize current imports.
