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
    archetype: 'general',
    spriteKey: 'npc-girl-1-idle',
    portraitKey: 'npc-girl-1-dialogue',
    overworldTile: { x: 18, y: 12 },
    interactionRadius: 36,
    displayName: 'Girl',
    questSetId: 'starter-field-quests',
    rewardPool: [
      { itemId: 'crystal-shard', quantity: 1, grantMode: 'guaranteed' },
      { itemId: 'field-tonic', quantity: 2, grantMode: 'guaranteed' },
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
    questSetId: 'mirror-grove-quests',
    rewardPool: [
      { itemId: 'iron-ore', quantity: 1, grantMode: 'guaranteed' },
      { itemId: 'field-tonic', quantity: 1, grantMode: 'chance', chance: 0.5 },
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
