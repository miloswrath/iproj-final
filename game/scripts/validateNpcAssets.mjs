import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const npcConfigPath = path.join(repoRoot, 'game', 'src', 'game', 'npc', 'npcConfig.js');
const npcConfigUrl = pathToFileURL(npcConfigPath).href;

const {
  CHARACTER_ASSET_PROFILES,
  REQUIRED_CHARACTER_MAPPINGS,
  getStarterArchetypePool,
  npcs,
  selectStarterNpc,
} = await import(npcConfigUrl);

const REQUIRED_TEXTURE_KEYS = ['idle', 'walk', 'dialogue', 'interact'];

function fail(message) {
  console.error(`[validate:npcs] ${message}`);
  process.exitCode = 1;
}

const starterPool = getStarterArchetypePool();
if (starterPool.includes('general')) {
  fail('starter pool must exclude general');
}
const sampledStarters = new Set();
for (let index = 0; index < 100; index += 1) {
  const sample = selectStarterNpc(() => index / 100);
  if (sample?.archetype === 'general') {
    fail('starter sampling produced the blocked general archetype');
  }
  if (sample?.archetype) {
    sampledStarters.add(sample.archetype);
  }
}
if (sampledStarters.size < 2) {
  fail('starter sampling should vary across the eligible starter pool');
}

for (const archetype of Object.keys(REQUIRED_CHARACTER_MAPPINGS)) {
  const npc = npcs.find((entry) => entry.archetype === archetype);
  if (!npc) {
    fail(`missing NPC config for archetype ${archetype}`);
    continue;
  }

  const expectedCharacterId = REQUIRED_CHARACTER_MAPPINGS[archetype];
  if (npc.characterId !== expectedCharacterId) {
    fail(`archetype ${archetype} must map to ${expectedCharacterId}, found ${npc.characterId}`);
  }

  const profile = CHARACTER_ASSET_PROFILES[expectedCharacterId];
  if (!profile) {
    fail(`missing asset profile for ${expectedCharacterId}`);
    continue;
  }

  const missingTextureKeys = REQUIRED_TEXTURE_KEYS.filter((key) => !profile.textureKeys?.[key]);
  if (missingTextureKeys.length > 0) {
    fail(`asset profile ${expectedCharacterId} is missing texture keys: ${missingTextureKeys.join(', ')}`);
  }

  const missingAnimations = (profile.requiredAnimations ?? []).filter((animationName) => {
    if (animationName === 'interact') {
      return !profile.textureKeys?.interact;
    }
    return !profile.textureKeys?.[animationName];
  });
  if (missingAnimations.length > 0) {
    fail(`asset profile ${expectedCharacterId} is missing required animations: ${missingAnimations.join(', ')}`);
  }
}

const assetChecks = [
  ['assets/characters/Countess_Vampire/Idle.png', 'Countess_Vampire idle'],
  ['assets/characters/Countess_Vampire/Walk.png', 'Countess_Vampire walk'],
  ['assets/characters/Converted_Vampire/Idle.png', 'Converted_Vampire idle'],
  ['assets/characters/Converted_Vampire/Walk.png', 'Converted_Vampire walk'],
  ['assets/characters/girl-1/idle.png', 'girl-1 idle'],
  ['assets/characters/girl-1/walk.png', 'girl-1 walk'],
  ['assets/characters/girl-2/Idle.png', 'girl-2 idle'],
  ['assets/characters/girl-2/Walk.png', 'girl-2 walk'],
  ['assets/characters/girl-3/Idle.png', 'girl-3 idle'],
  ['assets/characters/girl-3/Walk.png', 'girl-3 walk'],
];

for (const [relativePath, label] of assetChecks) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`missing required asset: ${label} (${relativePath})`);
  }
}

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}

console.log('[validate:npcs] starter pool and archetype asset mappings passed');
