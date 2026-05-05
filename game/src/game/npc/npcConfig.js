const ARCHETYPE_ALIASES = {
  honest: 'honest_one',
};

export const ARCHETYPES = [
  'general',
  'enabler',
  'opportunist',
  'honest_one',
  'mirror',
  'parasite',
];

export const STARTER_ARCHETYPES = [
  'parasite',
  'enabler',
  'honest_one',
  'mirror',
  'opportunist',
];

export const REQUIRED_CHARACTER_MAPPINGS = {
  parasite: 'Countess_Vampire',
  enabler: 'Converted_Vampire',
  honest_one: 'girl-1',
  mirror: 'girl-2',
  opportunist: 'girl-3',
};

export const CHARACTER_ASSET_PROFILES = {
  Countess_Vampire: {
    characterId: 'Countess_Vampire',
    spriteKey: 'npc-countess-vampire-idle',
    walkKey: 'npc-countess-vampire-walk',
    portraitKey: 'npc-countess-vampire-dialogue',
    interactKey: 'npc-countess-vampire-interact',
    requiredAnimations: ['idle', 'walk', 'interact'],
    textureKeys: {
      idle: 'npc-countess-vampire-idle',
      walk: 'npc-countess-vampire-walk',
      dialogue: 'npc-countess-vampire-dialogue',
      interact: 'npc-countess-vampire-interact',
    },
    scale: 0.72,
    tint: 0xffd0a6,
  },
  Converted_Vampire: {
    characterId: 'Converted_Vampire',
    spriteKey: 'npc-converted-vampire-idle',
    walkKey: 'npc-converted-vampire-walk',
    portraitKey: 'npc-converted-vampire-dialogue',
    interactKey: 'npc-converted-vampire-interact',
    requiredAnimations: ['idle', 'walk', 'interact'],
    textureKeys: {
      idle: 'npc-converted-vampire-idle',
      walk: 'npc-converted-vampire-walk',
      dialogue: 'npc-converted-vampire-dialogue',
      interact: 'npc-converted-vampire-interact',
    },
    scale: 0.72,
    tint: 0xc9c7ff,
  },
  'girl-1': {
    characterId: 'girl-1',
    spriteKey: 'npc-girl-1-idle',
    walkKey: 'npc-girl-1-walk',
    portraitKey: 'npc-girl-1-dialogue',
    interactKey: 'npc-girl-1-dialogue',
    requiredAnimations: ['idle', 'walk', 'interact'],
    textureKeys: {
      idle: 'npc-girl-1-idle',
      walk: 'npc-girl-1-walk',
      dialogue: 'npc-girl-1-dialogue',
      interact: 'npc-girl-1-dialogue',
    },
    scale: 0.72,
    tint: 0xe8d0b0,
  },
  'girl-2': {
    characterId: 'girl-2',
    spriteKey: 'npc-girl-2-idle',
    walkKey: 'npc-girl-2-walk',
    portraitKey: 'npc-girl-2-dialogue',
    interactKey: 'npc-girl-2-protect',
    requiredAnimations: ['idle', 'walk', 'interact'],
    textureKeys: {
      idle: 'npc-girl-2-idle',
      walk: 'npc-girl-2-walk',
      dialogue: 'npc-girl-2-dialogue',
      interact: 'npc-girl-2-protect',
    },
    scale: 0.72,
    tint: 0xded6ff,
  },
  'girl-3': {
    characterId: 'girl-3',
    spriteKey: 'npc-girl-3-idle',
    walkKey: 'npc-girl-3-walk',
    portraitKey: 'npc-girl-3-dialogue',
    interactKey: 'npc-girl-3-protect',
    requiredAnimations: ['idle', 'walk', 'interact'],
    textureKeys: {
      idle: 'npc-girl-3-idle',
      walk: 'npc-girl-3-walk',
      dialogue: 'npc-girl-3-dialogue',
      interact: 'npc-girl-3-protect',
    },
    scale: 0.72,
    tint: 0xf2d59f,
  },
};

const BASE_NPCS = [
  {
    id: 'girl-1-east',
    archetype: 'parasite',
    displayName: 'Ember Voss',
    overworldTile: { x: 18, y: 12 },
    interactionRadius: 36,
    questSetId: 'starter-field-quests',
    unlocksNpcId: 'mirror-1-north',
    rewardPool: [
      { itemId: 'parasite-needle', quantity: 1, grantMode: 'guaranteed' },
      { itemId: 'echo-thread', quantity: 2, grantMode: 'guaranteed' },
      { itemId: 'sun-coins', quantity: 18, grantMode: 'guaranteed' },
      { itemId: 'hearth-badge', quantity: 1, grantMode: 'chance', chance: 0.55 },
      { itemId: 'violet-lens', quantity: 1, grantMode: 'chance', chance: 0.2 },
    ],
  },
  {
    id: 'mirror-1-north',
    archetype: 'mirror',
    displayName: 'Lyra Mirror',
    overworldTile: { x: 33, y: 18 },
    interactionRadius: 36,
    questSetId: 'mirror-grove-quests',
    unlocksNpcId: 'enabler-1-west',
    rewardPool: [
      { itemId: 'mirror-sigil', quantity: 1, grantMode: 'guaranteed' },
      { itemId: 'rift-spindle', quantity: 1, grantMode: 'guaranteed' },
      { itemId: 'crystal-shard', quantity: 2, grantMode: 'guaranteed' },
      { itemId: 'pact-ink', quantity: 1, grantMode: 'chance', chance: 0.35 },
      { itemId: 'moon-pearl', quantity: 1, grantMode: 'chance', chance: 0.25 },
    ],
  },
  {
    id: 'enabler-1-west',
    archetype: 'enabler',
    displayName: 'Marcus Vale',
    overworldTile: { x: 28, y: 21 },
    interactionRadius: 36,
    questSetId: 'enabler-workshop-quests',
    unlocksNpcId: 'honest-1-south',
    rewardPool: [
      { itemId: 'enabling-ribbon', quantity: 1, grantMode: 'guaranteed' },
      { itemId: 'hearth-badge', quantity: 1, grantMode: 'guaranteed' },
      { itemId: 'echo-thread', quantity: 2, grantMode: 'guaranteed' },
      { itemId: 'sun-coins', quantity: 20, grantMode: 'guaranteed' },
      { itemId: 'tempered-bloom', quantity: 1, grantMode: 'chance', chance: 0.35 },
    ],
  },
  {
    id: 'honest-1-south',
    archetype: 'honest_one',
    displayName: 'Iona Reed',
    overworldTile: { x: 42, y: 22 },
    interactionRadius: 36,
    questSetId: 'honest-crossroads-quests',
    unlocksNpcId: 'opportunist-1-pond',
    rewardPool: [
      { itemId: 'honest-whetstone', quantity: 1, grantMode: 'guaranteed' },
      { itemId: 'iron-ore', quantity: 1, grantMode: 'guaranteed' },
      { itemId: 'steel-button', quantity: 2, grantMode: 'guaranteed' },
      { itemId: 'ash-glass', quantity: 1, grantMode: 'chance', chance: 0.34 },
      { itemId: 'moon-pearl', quantity: 1, grantMode: 'chance', chance: 0.15 },
    ],
  },
  {
    id: 'opportunist-1-pond',
    archetype: 'opportunist',
    displayName: 'Kade Flint',
    overworldTile: { x: 54, y: 16 },
    interactionRadius: 36,
    questSetId: 'opportunist-pond-quests',
    unlocksNpcId: null,
    rewardPool: [
      { itemId: 'opportunist-token', quantity: 1, grantMode: 'guaranteed' },
      { itemId: 'sun-coins', quantity: 24, grantMode: 'guaranteed' },
      { itemId: 'cracked-fang', quantity: 2, grantMode: 'guaranteed' },
      { itemId: 'bone-charm', quantity: 1, grantMode: 'chance', chance: 0.35 },
      { itemId: 'pact-ink', quantity: 1, grantMode: 'chance', chance: 0.28 },
    ],
  },
];

export function normalizeArchetype(archetype) {
  if (typeof archetype !== 'string') {
    return null;
  }
  const normalized = archetype.trim().toLowerCase();
  return ARCHETYPE_ALIASES[normalized] ?? normalized;
}

export function resolveCharacterIdForArchetype(archetype) {
  const normalized = normalizeArchetype(archetype);
  if (!normalized || normalized === 'general') {
    return REQUIRED_CHARACTER_MAPPINGS.parasite;
  }
  return REQUIRED_CHARACTER_MAPPINGS[normalized] ?? null;
}

export function getCharacterAssetProfile(characterId) {
  if (!characterId) return null;
  return CHARACTER_ASSET_PROFILES[characterId] ?? null;
}

function buildNpcConfig(baseNpc) {
  const archetype = normalizeArchetype(baseNpc.archetype) ?? 'parasite';
  const characterId = resolveCharacterIdForArchetype(archetype) ?? 'girl-1';
  const assets = getCharacterAssetProfile(characterId);
  return {
    ...baseNpc,
    archetype,
    characterId,
    spriteKey: assets?.spriteKey ?? 'npc-girl-1-idle',
    walkKey: assets?.walkKey ?? 'npc-girl-1-walk',
    portraitKey: assets?.portraitKey ?? 'npc-girl-1-dialogue',
    interactKey: assets?.interactKey ?? 'npc-girl-1-dialogue',
    requiredAnimations: [...(assets?.requiredAnimations ?? ['idle', 'walk', 'interact'])],
    textureKeys: { ...(assets?.textureKeys ?? {}) },
    scale: assets?.scale ?? 0.72,
    tint: baseNpc.tint ?? assets?.tint,
  };
}

export const npcs = BASE_NPCS.map(buildNpcConfig);

export function getStarterArchetypePool() {
  return [...STARTER_ARCHETYPES];
}

export function getStarterNpcPool() {
  return npcs.filter((npc) => STARTER_ARCHETYPES.includes(npc.archetype));
}

export function selectStarterNpc(random = Math.random) {
  const starterPool = getStarterNpcPool();
  if (starterPool.length === 0) {
    return null;
  }
  const index = Math.max(0, Math.min(starterPool.length - 1, Math.floor(random() * starterPool.length)));
  return starterPool[index] ?? starterPool[0];
}

export function resolveNpcConfig(id) {
  return npcs.find((npc) => npc.id === id) ?? null;
}

export function resolveNpcConfigForArchetype(archetype) {
  const normalized = normalizeArchetype(archetype);
  if (!normalized) return null;
  return npcs.find((npc) => npc.archetype === normalized) ?? null;
}

export function getActiveArchetype(npc) {
  if (!npc) return null;
  if (typeof window !== 'undefined' && window.location?.search) {
    const override = new URLSearchParams(window.location.search).get('archetype');
    if (override) {
      const normalized = normalizeArchetype(override);
      if (normalized && ARCHETYPES.includes(normalized)) {
        return normalized;
      }
      console.warn(
        `[npcConfig] Unknown archetype "${override}", defaulting to ${npc.archetype}`,
      );
    }
  }
  return normalizeArchetype(npc.archetype);
}
