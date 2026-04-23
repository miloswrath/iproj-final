const imageModules = import.meta.glob('../../../assets/**/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}', {
  eager: true,
  import: 'default',
  query: '?url',
});

function toAssetRelativePath(modulePath) {
  const normalized = String(modulePath).replace(/\\/g, '/');
  const marker = '/assets/';
  const markerIndex = normalized.indexOf(marker);

  if (markerIndex === -1) {
    return normalized;
  }

  return normalized.slice(markerIndex + marker.length);
}

function toAutoAssetKey(relativePath) {
  return `asset-auto:${relativePath.toLowerCase()}`;
}

export const autoAssetEntries = Object.entries(imageModules)
  .map(([modulePath, url]) => {
    const relativePath = toAssetRelativePath(modulePath);
    return {
      key: toAutoAssetKey(relativePath),
      relativePath,
      url,
    };
  })
  .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

const autoAssetRelativePathByKey = new Map(autoAssetEntries.map((entry) => [entry.key, entry.relativePath]));

export function preloadAutoAssetImages(scene) {
  for (const entry of autoAssetEntries) {
    scene.load.image(entry.key, entry.url);
  }
}

export function getAutoAssetRelativePath(textureKey) {
  return autoAssetRelativePathByKey.get(textureKey) ?? null;
}