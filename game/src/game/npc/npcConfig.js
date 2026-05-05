export const ARCHETYPES = [
  'general',
  'enabler',
  'opportunist',
  'honest',
  'mirror',
  'parasite',
];

export const npcs = [
  {
    id: 'girl-1-east',
    archetype: 'enabler',
    spriteKey: 'npc-girl-1-idle',
    portraitKey: 'npc-girl-1-dialogue',
    overworldTile: { x: 18, y: 12 },
    interactionRadius: 36,
    displayName: 'Ember',
    tint: 0xffd0a6,
    questSetId: 'starter-field-quests',
    rewardPool: [
      { itemId: 'enabling-ribbon', quantity: 1, grantMode: 'guaranteed' },
      { itemId: 'echo-thread', quantity: 2, grantMode: 'guaranteed' },
      { itemId: 'sun-coins', quantity: 18, grantMode: 'guaranteed' },
      { itemId: 'hearth-badge', quantity: 1, grantMode: 'chance', chance: 0.55 },
      { itemId: 'violet-lens', quantity: 1, grantMode: 'chance', chance: 0.2 },
    ],
    unlocksNpcId: 'mirror-1-north',
  },
  {
    id: 'mirror-1-north',
    archetype: 'mirror',
    spriteKey: 'npc-girl-1-idle',
    portraitKey: 'npc-girl-1-dialogue',
    overworldTile: { x: 33, y: 18 },
    interactionRadius: 36,
    displayName: 'Mirror',
    tint: 0xc9c7ff,
    questSetId: 'mirror-grove-quests',
    rewardPool: [
      { itemId: 'mirror-sigil', quantity: 1, grantMode: 'guaranteed' },
      { itemId: 'rift-spindle', quantity: 1, grantMode: 'guaranteed' },
      { itemId: 'crystal-shard', quantity: 2, grantMode: 'guaranteed' },
      { itemId: 'pact-ink', quantity: 1, grantMode: 'chance', chance: 0.35 },
      { itemId: 'moon-pearl', quantity: 1, grantMode: 'chance', chance: 0.25 },
    ],
    unlocksNpcId: null,
  },
];

export function resolveNpcConfig(id) {
  return npcs.find((npc) => npc.id === id) ?? null;
}

export function getActiveArchetype(npc) {
  if (!npc) return null;
  if (typeof window !== 'undefined' && window.location?.search) {
    const override = new URLSearchParams(window.location.search).get('archetype');
    if (override) {
      const trimmed = override.trim().toLowerCase();
      if (ARCHETYPES.includes(trimmed)) {
        return trimmed;
      }
      console.warn(
        `[npcConfig] Unknown archetype "${override}", defaulting to ${npc.archetype}`,
      );
    }
  }
  return npc.archetype;
}
