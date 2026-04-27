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
