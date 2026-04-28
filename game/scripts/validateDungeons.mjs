import { readFile } from 'node:fs/promises';
import { buildDungeonLayoutsFromBlueprints } from '../src/game/dungeonPoolBuilder.js';

const GRID_COLS = 40;
const GRID_ROWS = 28;
const MIN_CURATED_DUNGEONS = 6;

const poolUrl = new URL('../src/game/data/dungeons/curatedDungeonPool.json', import.meta.url);
const pool = JSON.parse(await readFile(poolUrl, 'utf8'));
const blueprints = Array.isArray(pool?.dungeons) ? pool.dungeons : [];
const layouts = buildDungeonLayoutsFromBlueprints(blueprints, GRID_COLS, GRID_ROWS);

const blueprintIds = blueprints.map((blueprint, index) => blueprint.id ?? `index-${index}`);
const layoutIds = new Set(layouts.map((layout) => layout.id));
const duplicateIds = blueprintIds.filter((id, index) => blueprintIds.indexOf(id) !== index);
const invalidIds = blueprintIds.filter((id) => !layoutIds.has(id));

if (blueprints.length < MIN_CURATED_DUNGEONS) {
  console.error(`Expected at least ${MIN_CURATED_DUNGEONS} curated dungeons, found ${blueprints.length}.`);
  process.exit(1);
}

if (duplicateIds.length > 0) {
  console.error(`Duplicate dungeon ids: ${[...new Set(duplicateIds)].join(', ')}`);
  process.exit(1);
}

if (layouts.length !== blueprints.length || invalidIds.length > 0) {
  console.error(`Invalid dungeon blueprints: ${invalidIds.join(', ') || 'unknown'}`);
  console.error(`Validated ${layouts.length} of ${blueprints.length} curated dungeons.`);
  process.exit(1);
}

console.log(`Validated ${layouts.length} curated dungeons: ${blueprintIds.join(', ')}`);
