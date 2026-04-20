import registrySource from './devAssetPalette.json';

export function loadDevAssetRegistry(sceneKey) {
  const sceneTag = sceneKey ?? 'overworld';
  const groups = registrySource.groups.filter((group) => {
    return !Array.isArray(group.scenes) || group.scenes.includes(sceneTag);
  });

  return {
    groups,
    byLayer: {
      floor: groups.filter((group) => group.layer === 'floor'),
      collision: groups.filter((group) => group.layer === 'collision'),
      decor: groups.filter((group) => group.layer === 'decor'),
    },
  };
}
