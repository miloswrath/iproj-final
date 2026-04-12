# Asset Inventory

## Scope
This inventory tracks organized game-ready assets under assets/ and maps them to gameplay systems in the mechanics constitution.

## Playable Character Decision
- Primary playable character: witchKitty
- Deferred/archived character: calicoKitty (kept for future alternate skin or NPC use)

## Asset Pack Usage

| Asset Pack | Source Path | Organized Path | Usage | Status |
| --- | --- | --- | --- | --- |
| Free Village Pixel Tileset | craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense | assets/tilesets/overworld, assets/objects/overworld, assets/objects/animated | Overworld navigation tiles, decor, props, animated world objects | Active |
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
| Animated objects | assets/objects/animated | Environmental animation and visual feedback | Active |
| Swordsman enemy sprites | assets/enemies/swordsman | Turn-based combat enemies (humanoid archetype) | Active |
| Animal enemy sprites | assets/enemies/animals | Turn-based combat enemies (beast archetype) | Active |
| Source authoring files | assets/_source | PSD/ASEPRITE/Tiled references and edits | Archive |

## Current Format Snapshot
- PNG files: 648
- ASEPRITE files: 190
- PSD files: 58
- TMX files: 6

## Notes for Next Cleanup Pass
- Remove non-game metadata files from assets/_source where safe (for example .DS_Store and ._ prefixed files).
- Standardize runtime asset filenames to lowercase kebab-case when integrating with JavaScript loader manifests.
- Build a loader manifest (JSON or JS module) after mechanic scenes are scaffolded.
