import registrySource from './devAssetPalette.json';

export function loadDevAssetRegistry(sceneKey, textureManager) {
  const sceneTag = sceneKey ?? 'overworld';
  const groupsSource = Array.isArray(registrySource?.groups) ? registrySource.groups : [];
  const groups = groupsSource
    .filter((group) => {
      return !Array.isArray(group?.scenes) || group.scenes.includes(sceneTag);
    })
    .map((group) => {
      const rawAssets = Array.isArray(group?.assets) ? group.assets : [];
      const seen = new Set();
      const assets = rawAssets.filter((asset) => {
        if (!asset || typeof asset.key !== 'string' || asset.key.length === 0) {
          return false;
        }

        if (seen.has(asset.key)) {
          return false;
        }

        if (textureManager && typeof textureManager.exists === 'function' && !textureManager.exists(asset.key)) {
          return false;
        }

        seen.add(asset.key);
        return true;
      });

      return {
        ...group,
        assets,
      };
    })
    .filter((group) => Array.isArray(group.assets) && group.assets.length > 0);

  return {
    groups,
    byLayer: {
      floor: groups.filter((group) => group.layer === 'floor'),
      collision: groups.filter((group) => group.layer === 'collision'),
      decor: groups.filter((group) => group.layer === 'decor'),
    },
  };
}
