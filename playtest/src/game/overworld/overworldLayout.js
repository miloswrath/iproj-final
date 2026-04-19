const TILE_SIZE = 40;
const COLS = 78;
const ROWS = 44;

const GROUND_FIELD = 'field';
const GROUND_PATH = 'path';
const GROUND_WATER = 'water';
const GROUND_TRANSITION = 'transition';
const GROUND_TOWN = 'town';

const SPAWN_CELL = { x: 4, y: 37 };
const DUNGEON_ENTRY_CELL = { x: 67, y: 11 };

const TOWN_RECT = { x: 54, y: 5, w: 20, h: 16 };

const CRITICAL_PATH_POINTS = [
  { x: 4, y: 37 },
  { x: 14, y: 37 },
  { x: 14, y: 31 },
  { x: 26, y: 31 },
  { x: 26, y: 25 },
  { x: 40, y: 25 },
  { x: 40, y: 20 },
  { x: 53, y: 20 },
  { x: 53, y: 15 },
  { x: 60, y: 15 },
  { x: 60, y: 11 },
  { x: 67, y: 11 },
];

const BASE_DECOR_CLUSTERS = [
  {
    name: 'outskirts-greens',
    items: [
      { x: 6, y: 36, kind: 'willow-tree', layer: 'foreground' },
      { x: 7, y: 35, kind: 'grass', layer: 'decor' },
      { x: 10, y: 39, kind: 'grass', layer: 'decor' },
      { x: 11, y: 34, kind: 'willow-tree', layer: 'foreground' },
      { x: 12, y: 33, kind: 'grass', layer: 'decor' },
      { x: 18, y: 29, kind: 'mega-tree', layer: 'foreground' },
      { x: 9, y: 31, kind: 'mega-tree', layer: 'foreground' },
      { x: 16, y: 29, kind: 'grass', layer: 'decor' },
    ],
  },
  {
    name: 'route-guides',
    items: [
      { x: 26, y: 24, kind: 'grass', layer: 'decor' },
      { x: 39, y: 19, kind: 'grass', layer: 'decor' },
      { x: 53, y: 14, kind: 'grass', layer: 'decor' },
      { x: 59, y: 12, kind: 'grass', layer: 'decor' },
    ],
  },
  {
    name: 'town-set',
    items: [
      { x: 56, y: 7, kind: 'house-1', layer: 'foreground' },
      { x: 61, y: 7, kind: 'house-2', layer: 'foreground' },
      { x: 67, y: 8, kind: 'guild-hall-exterior', layer: 'foreground' },
      { x: 71, y: 7, kind: 'house-4', layer: 'foreground' },
      { x: 56, y: 18, kind: 'house-3', layer: 'foreground' },
      { x: 62, y: 18, kind: 'house-2', layer: 'foreground' },
      { x: 70, y: 18, kind: 'house-1', layer: 'foreground' },
      { x: 58, y: 12, kind: 'tent-1', layer: 'foreground' },
      { x: 64, y: 12, kind: 'tent-3', layer: 'foreground' },
      { x: 69, y: 12, kind: 'tent-4', layer: 'foreground' },
      { x: 55, y: 10, kind: 'grass', layer: 'decor' },
      { x: 60, y: 10, kind: 'grass', layer: 'decor' },
      { x: 66, y: 10, kind: 'grass', layer: 'decor' },
      { x: 72, y: 10, kind: 'grass', layer: 'decor' },
      { x: 55, y: 15, kind: 'grass', layer: 'decor' },
      { x: 60, y: 15, kind: 'grass', layer: 'decor' },
      { x: 66, y: 15, kind: 'grass', layer: 'decor' },
      { x: 71, y: 15, kind: 'grass', layer: 'decor' },
      { x: 54, y: 6, kind: 'willow-tree', layer: 'foreground' },
      { x: 73, y: 19, kind: 'willow-tree', layer: 'foreground' },
      { x: 54, y: 19, kind: 'mega-tree', layer: 'foreground' },
    ],
  },
  {
    name: 'town-detail',
    items: [
      { x: 57, y: 9, kind: 'grass', layer: 'decor' },
      { x: 58, y: 9, kind: 'grass', layer: 'decor' },
      { x: 59, y: 9, kind: 'grass', layer: 'decor' },
      { x: 63, y: 9, kind: 'grass', layer: 'decor' },
      { x: 64, y: 9, kind: 'grass', layer: 'decor' },
      { x: 65, y: 9, kind: 'grass', layer: 'decor' },
      { x: 68, y: 14, kind: 'grass', layer: 'decor' },
      { x: 67, y: 14, kind: 'grass', layer: 'decor' },
      { x: 62, y: 14, kind: 'grass', layer: 'decor' },
      { x: 61, y: 14, kind: 'grass', layer: 'decor' },
    ],
  },
];

const BASE_DECOR_ITEMS = BASE_DECOR_CLUSTERS.flatMap((cluster) => {
  return cluster.items.map((item) => ({ ...item, cluster: cluster.name }));
});

const AMBIENT_ITEMS = [
  { x: 8, y: 36, kind: 'foliage-sway' },
  { x: 13, y: 33, kind: 'foliage-sway' },
  { x: 20, y: 30, kind: 'foliage-sway' },
  { x: 27, y: 27, kind: 'foliage-sway' },
  { x: 34, y: 24, kind: 'foliage-sway' },
  { x: 41, y: 22, kind: 'foliage-sway' },
  { x: 48, y: 19, kind: 'foliage-sway' },
  { x: 55, y: 16, kind: 'foliage-sway' },
  { x: 60, y: 12, kind: 'torch-fx' },
  { x: 63, y: 12, kind: 'torch-fx' },
  { x: 66, y: 11, kind: 'torch-fx' },
  { x: 33, y: 10, kind: 'water-loop' },
  { x: 36, y: 12, kind: 'water-loop' },
  { x: 30, y: 14, kind: 'water-loop' },
  { x: 11, y: 38, kind: 'critter-loop' },
  { x: 24, y: 31, kind: 'critter-loop' },
  { x: 38, y: 24, kind: 'critter-loop' },
  { x: 58, y: 15, kind: 'critter-loop' },
  { x: 56, y: 10, kind: 'torch-fx' },
  { x: 61, y: 10, kind: 'torch-fx' },
  { x: 66, y: 10, kind: 'torch-fx' },
  { x: 71, y: 10, kind: 'torch-fx' },
  { x: 56, y: 16, kind: 'torch-fx' },
  { x: 61, y: 16, kind: 'torch-fx' },
  { x: 66, y: 16, kind: 'torch-fx' },
  { x: 71, y: 16, kind: 'torch-fx' },
  { x: 58, y: 13, kind: 'critter-loop' },
  { x: 64, y: 13, kind: 'critter-loop' },
  { x: 69, y: 13, kind: 'critter-loop' },
];

const LANDMARK_CELLS = [
  { x: 14, y: 37, label: 'Old Trail' },
  { x: 26, y: 25, label: 'Ridge Bend' },
  { x: 40, y: 20, label: 'Creek Turn' },
  { x: 53, y: 15, label: 'Town Approach' },
  { x: 67, y: 11, label: 'Dungeon Gate' },
];

const TOWN_NPCS = [
  { x: 58, y: 11, role: 'blacksmith-stall', sprite: 'swordsman-idle', frame: 0, scale: 0.9, markerColor: 0xf1ba84 },
  { x: 64, y: 11, role: 'merchant-stall', sprite: 'vampire1-idle', frame: 2, scale: 0.86, markerColor: 0xf5d483 },
  { x: 69, y: 11, role: 'provisions-stall', sprite: 'vampire1-idle', frame: 4, scale: 0.86, markerColor: 0x9dd7ff },
  { x: 57, y: 8, role: 'house-elder', sprite: 'vampire1-idle', frame: 1, scale: 0.84, markerColor: 0xb7f2a5 },
  { x: 62, y: 8, role: 'scribe', sprite: 'swordsman-idle', frame: 1, scale: 0.88, markerColor: 0xd5c8ff },
  { x: 71, y: 8, role: 'gate-watch', sprite: 'swordsman-idle', frame: 3, scale: 0.9, markerColor: 0xff9b9b },
  { x: 57, y: 17, role: 'inn-host', sprite: 'vampire1-idle', frame: 0, scale: 0.84, markerColor: 0xbde0ff },
  { x: 63, y: 17, role: 'guard-captain', sprite: 'swordsman-idle', frame: 2, scale: 0.9, markerColor: 0xffbcbc },
  { x: 70, y: 17, role: 'healer', sprite: 'plant1-idle', frame: 0, scale: 0.68, markerColor: 0xaff3c2 },
  { x: 67, y: 14, role: 'pet-keeper', sprite: 'slime-idle', frame: 0, scale: 0.46, markerColor: 0x9ef0f0 },
];

const HOUSE_BLOCKS = [
  { x: 55, y: 7, w: 3, h: 2 },
  { x: 60, y: 7, w: 3, h: 2 },
  { x: 66, y: 8, w: 4, h: 3 },
  { x: 70, y: 7, w: 3, h: 2 },
  { x: 55, y: 18, w: 3, h: 2 },
  { x: 61, y: 18, w: 3, h: 2 },
  { x: 69, y: 18, w: 3, h: 2 },
  { x: 57, y: 12, w: 2, h: 1 },
  { x: 63, y: 12, w: 2, h: 1 },
  { x: 68, y: 12, w: 2, h: 1 },
];

function createGrid(defaultTile = GROUND_FIELD) {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => defaultTile));
}

function createBoolGrid(defaultValue = false) {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => defaultValue));
}

function carveRect(grid, startX, startY, width, height, value) {
  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      if (!inBounds(x, y)) {
        continue;
      }
      grid[y][x] = value;
    }
  }
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

function fillRect(grid, startX, startY, width, height, value) {
  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      if (!inBounds(x, y)) {
        continue;
      }
      grid[y][x] = value;
    }
  }
}

function carvePath(grid, points, width) {
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i];
    const to = points[i + 1];

    if (from.x === to.x) {
      const minY = Math.min(from.y, to.y);
      const maxY = Math.max(from.y, to.y);
      for (let y = minY; y <= maxY; y += 1) {
        for (let offset = 0; offset < width; offset += 1) {
          const x = from.x + offset;
          if (inBounds(x, y)) {
            grid[y][x] = GROUND_PATH;
          }
        }
      }
      continue;
    }

    if (from.y === to.y) {
      const minX = Math.min(from.x, to.x);
      const maxX = Math.max(from.x, to.x);
      for (let x = minX; x <= maxX; x += 1) {
        for (let offset = 0; offset < width; offset += 1) {
          const y = from.y + offset;
          if (inBounds(x, y)) {
            grid[y][x] = GROUND_PATH;
          }
        }
      }
    }
  }
}

function addPathTransitions(grid) {
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (grid[y][x] !== GROUND_FIELD && grid[y][x] !== GROUND_TOWN) {
        continue;
      }

      const nearPath = directions.some((dir) => {
        const nx = x + dir.x;
        const ny = y + dir.y;
        return inBounds(nx, ny) && grid[ny][nx] === GROUND_PATH;
      });

      if (nearPath) {
        grid[y][x] = GROUND_TRANSITION;
      }
    }
  }
}

function buildBlockedGrid(groundGrid) {
  const blocked = createBoolGrid(false);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = groundGrid[y][x];
      if (tile === GROUND_WATER) {
        blocked[y][x] = true;
      }
    }
  }

  fillRect(blocked, 0, 0, COLS, 1, true);
  fillRect(blocked, 0, ROWS - 1, COLS, 1, true);
  fillRect(blocked, 0, 0, 1, ROWS, true);
  fillRect(blocked, COLS - 1, 0, 1, ROWS, true);

  for (const block of HOUSE_BLOCKS) {
    fillRect(blocked, block.x, block.y, block.w, block.h, true);
  }

  // Keep decor collision-free to avoid invisible walls on routes.

  // Force open cells around the gate anchor.
  for (let gy = DUNGEON_ENTRY_CELL.y - 1; gy <= DUNGEON_ENTRY_CELL.y + 1; gy += 1) {
    for (let gx = DUNGEON_ENTRY_CELL.x - 1; gx <= DUNGEON_ENTRY_CELL.x + 1; gx += 1) {
      if (inBounds(gx, gy)) {
        blocked[gy][gx] = false;
      }
    }
  }

  return blocked;
}

function toWorld(cellX, cellY) {
  return {
    x: cellX * TILE_SIZE + TILE_SIZE / 2,
    y: cellY * TILE_SIZE + TILE_SIZE / 2,
  };
}

function createGroundGrid() {
  const ground = createGrid();

  carveRect(ground, TOWN_RECT.x, TOWN_RECT.y, TOWN_RECT.w, TOWN_RECT.h, GROUND_TOWN);

  // Structured town streets and market plaza for cleaner organization.
  carveRect(ground, 56, 10, 16, 2, GROUND_PATH);
  carveRect(ground, 56, 16, 16, 2, GROUND_PATH);
  carveRect(ground, 59, 8, 2, 12, GROUND_PATH);
  carveRect(ground, 66, 8, 2, 12, GROUND_PATH);
  carveRect(ground, 60, 12, 7, 3, GROUND_PATH);

  // Creek off the main path for depth and ambient loops.
  fillRect(ground, 29, 9, 10, 2, GROUND_WATER);
  fillRect(ground, 30, 11, 7, 4, GROUND_WATER);

  carvePath(ground, CRITICAL_PATH_POINTS, 2);
  addPathTransitions(ground);

  return ground;
}

function buildCriticalPathCells() {
  const pathCells = new Set();

  for (let i = 0; i < CRITICAL_PATH_POINTS.length - 1; i += 1) {
    const from = CRITICAL_PATH_POINTS[i];
    const to = CRITICAL_PATH_POINTS[i + 1];

    if (from.x === to.x) {
      const minY = Math.min(from.y, to.y);
      const maxY = Math.max(from.y, to.y);
      for (let y = minY; y <= maxY; y += 1) {
        pathCells.add(`${from.x},${y}`);
        pathCells.add(`${from.x + 1},${y}`);
      }
      continue;
    }

    const minX = Math.min(from.x, to.x);
    const maxX = Math.max(from.x, to.x);
    for (let x = minX; x <= maxX; x += 1) {
      pathCells.add(`${x},${from.y}`);
      pathCells.add(`${x},${from.y + 1}`);
    }
  }

  return pathCells;
}

function hash2d(x, y) {
  return (x * 73856093 + y * 19349663) >>> 0;
}

function isNearCriticalPath(criticalPathCells, x, y, padding = 1) {
  for (let oy = -padding; oy <= padding; oy += 1) {
    for (let ox = -padding; ox <= padding; ox += 1) {
      if (criticalPathCells.has(`${x + ox},${y + oy}`)) {
        return true;
      }
    }
  }

  return false;
}

function isNearLargeForeground(items, x, y, padding = 2) {
  for (const item of items) {
    if (item.layer !== 'foreground') {
      continue;
    }

    const dx = Math.abs(item.x - x);
    const dy = Math.abs(item.y - y);
    if (dx <= padding && dy <= padding) {
      return true;
    }
  }

  return false;
}

function buildDecorItems(groundGrid, criticalPathCells) {
  const items = [...BASE_DECOR_ITEMS];

  for (let y = 2; y < ROWS - 2; y += 1) {
    for (let x = 2; x < COLS - 2; x += 1) {
      const tile = groundGrid[y][x];
      if (tile !== GROUND_FIELD && tile !== GROUND_TRANSITION) {
        continue;
      }

      if (x >= TOWN_RECT.x - 1 || isNearCriticalPath(criticalPathCells, x, y, 2)) {
        continue;
      }

      const roll = hash2d(x, y) % 100;

      if (roll < 3 && !isNearLargeForeground(items, x, y, 3)) {
        const pick = hash2d(y, x) % 2;
        const kind = pick === 0 ? 'willow-tree' : 'mega-tree';
        items.push({ x, y, kind, layer: 'foreground', cluster: 'generated-outskirts' });
        continue;
      }

      if (roll < 24) {
        items.push({ x, y, kind: 'grass', layer: 'decor', cluster: 'generated-outskirts' });
      }
    }
  }

  // Town decor remains fully authored for compact, intentional layout.

  return items;
}

export function createOverworldLayout() {
  const ground = createGroundGrid();
  const criticalPathCells = buildCriticalPathCells();
  const decorItems = buildDecorItems(ground, criticalPathCells);
  const blocked = buildBlockedGrid(ground);
  const ambientItems = AMBIENT_ITEMS.filter((item) => {
    return !criticalPathCells.has(`${item.x},${item.y}`);
  });

  return {
    tileSize: TILE_SIZE,
    cols: COLS,
    rows: ROWS,
    worldWidth: COLS * TILE_SIZE,
    worldHeight: ROWS * TILE_SIZE,
    spawnWorld: toWorld(SPAWN_CELL.x, SPAWN_CELL.y),
    dungeonEntryWorld: toWorld(DUNGEON_ENTRY_CELL.x, DUNGEON_ENTRY_CELL.y),
    dungeonEntryZoneSize: { width: TILE_SIZE * 3, height: TILE_SIZE * 3 },
    ground,
    blocked,
    decorItems,
    decorClusters: BASE_DECOR_CLUSTERS,
    ambientItems,
    townNpcs: TOWN_NPCS,
    landmarks: LANDMARK_CELLS,
    criticalPathCells,
  };
}

export const TileKinds = {
  GROUND_FIELD,
  GROUND_TOWN,
  GROUND_PATH,
  GROUND_WATER,
  GROUND_TRANSITION,
};
