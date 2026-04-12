# Feature -> Asset Organization & Inventory

## Requirements
---
- Organize all craftpix asset packs into a standardized, game-engine-ready folder structure
- Create a comprehensive asset inventory document mapping each asset to its purpose in the game (tilesets, characters, enemies, objects)
- Keep only PNG files in active game assets; archive source files (PSD, ASEPRITE) separately for future reference
- Verify that core assets (overworld tileset, dungeon tileset, witchKitty character, enemy sprites) are correctly cataloged and accessible
- Ensure folder structure supports easy asset loading in JavaScript (Phaser or similar)
- Establish a clear separation between playable character assets (witchKitty only for now) and other collectible/NPC assets (calicoKitty archived or noted for future use)

## Implementation Plan

### ***Checkpoint 1: Folder Structure Setup***
- [x] Create `/assets/` root directory with subdirectories: `characters/`, `enemies/`, `tilesets/`, `objects/`, `_source/`
- [x] Migrate craftpix PNG files into appropriate subdirectories (e.g., PNG files from village tileset → `/assets/tilesets/overworld/`)
- [x] Move all PSD, ASEPRITE, and Tiled files into `/assets/_source/` for archival
- [x] Verify folder structure matches expected game engine load paths
- **Test**: Confirm all asset folders exist and are free of duplicate/conflicting files

### ***Checkpoint 2: Asset Inventory & Mapping Document***
- [x] Create `ASSET-INVENTORY.md` documenting:
  - Which asset packs are used (e.g., "Free Dungeon Asset Pack v1.0")
  - Breakdown by game system (e.g., "overworld tilesets: 32x32 village tileset with 4 variations")
  - Character assignments (witchKitty = main playable; calicoKitty = archived for Phase X)
  - Enemy sprite sources (swordsman enemies, farm animals, etc.)
  - Object mappings (decorations, boxes, houses, tents, shadows)
- [x] Create a quick reference table: `| Asset Type | Location | Usage | Status |`
- **Test**: Inventory document is complete and matches actual folder contents

### ***Checkpoint 3: Asset Verification & Cleanup***
- [x] Load a sample of key assets (witchKitty sprites, dungeon tileset, swordsman enemy) in a test JavaScript environment to verify format/naming
- [x] Remove any unused/duplicate asset files
- [ ] Verify naming conventions are consistent (e.g., all lowercase, kebab-case or snake_case)
- [x] Document any missing assets needed for Phase 2 (e.g., UI sprites, item icons)
- **Test**: At least 5 key assets load successfully; no conflicts or missing files detected