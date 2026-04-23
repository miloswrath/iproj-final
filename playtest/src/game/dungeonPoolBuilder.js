export function buildDungeonLayoutsFromBlueprints(blueprints, cols, rows) {
  if (!Array.isArray(blueprints) || blueprints.length === 0) {
    return [];
  }

  const layouts = [];

  for (const blueprint of blueprints) {
    const layout = buildLayoutFromBlueprint(blueprint, cols, rows);
    if (layout) {
      layouts.push(layout);
    }
  }

  return layouts;
}

function buildLayoutFromBlueprint(blueprint, cols, rows) {
  if (!isValidBlueprintShape(blueprint)) {
    return null;
  }

  if (!blueprint.rooms.every((room) => isValidRoom(room, cols, rows))) {
    return null;
  }

  if (!blueprint.corridors.every((corridor) => isValidCorridor(corridor, cols, rows))) {
    return null;
  }

  const carved = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
  const rooms = blueprint.rooms.map((room) => ({ x: room.x, y: room.y, w: room.w, h: room.h }));

  for (const room of rooms) {
    carveRect(carved, room.x, room.y, room.w, room.h);
  }

  const corridors = blueprint.corridors;
  for (const corridor of corridors) {
    const width = clampInt(corridor.width, 1, 3);
    carveCorridor(carved, corridor.from, corridor.to, width, cols, rows);
  }

  const floorCells = [];
  const blockers = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const edge = row === 0 || col === 0 || row === rows - 1 || col === cols - 1;
      const isFloor = !edge && carved[row][col];

      if (isFloor) {
        floorCells.push({ x: col, y: row });
      } else {
        blockers.push({ x: col, y: row });
      }
    }
  }

  if (!isValidSpawnCell(blueprint.spawnCell, carved, cols, rows)) {
    return null;
  }

  if (!hasReachableFloorFromSpawn(blueprint.spawnCell, carved, floorCells.length)) {
    return null;
  }

  const spawnCell = blueprint.spawnCell;

  return {
    id: blueprint.id ?? `curated-${layoutsHash(rooms, corridors)}`,
    name: blueprint.name ?? 'Curated Dungeon',
    tileTheme: blueprint.tileTheme === 'undead' ? 'undead' : 'classic',
    blockers,
    floorCells,
    rooms,
    spawnCell: { x: spawnCell.x, y: spawnCell.y },
    encounterCompleted: false,
  };
}

function isValidRoom(room, cols, rows) {
  if (!room || !Number.isInteger(room.x) || !Number.isInteger(room.y) || !Number.isInteger(room.w) || !Number.isInteger(room.h)) {
    return false;
  }

  if (room.w < 3 || room.h < 3) {
    return false;
  }

  const insideRight = room.x + room.w <= cols - 1;
  const insideBottom = room.y + room.h <= rows - 1;
  return room.x >= 1 && room.y >= 1 && insideRight && insideBottom;
}

function isValidBlueprintShape(blueprint) {
  return (
    !!blueprint &&
    Array.isArray(blueprint.rooms) &&
    blueprint.rooms.length > 0 &&
    Array.isArray(blueprint.corridors) &&
    isCellObject(blueprint.spawnCell)
  );
}

function isValidCorridor(corridor, cols, rows) {
  if (!corridor || !isCellObject(corridor.from) || !isCellObject(corridor.to)) {
    return false;
  }

  if (!Number.isInteger(corridor.width) || corridor.width < 1 || corridor.width > 3) {
    return false;
  }

  return isCellInsideBounds(corridor.from, cols, rows) && isCellInsideBounds(corridor.to, cols, rows);
}

function isValidSpawnCell(cell, carved, cols, rows) {
  if (!isCellInsideBounds(cell, cols, rows)) {
    return false;
  }

  return Boolean(carved[cell.y]?.[cell.x]);
}

function isCellObject(cell) {
  return !!cell && Number.isInteger(cell.x) && Number.isInteger(cell.y);
}

function hasReachableFloorFromSpawn(spawnCell, carved, totalFloorCells) {
  if (totalFloorCells === 0) {
    return false;
  }

  const rows = carved.length;
  const cols = carved[0]?.length ?? 0;
  const key = (x, y) => `${x},${y}`;
  const queue = [{ x: spawnCell.x, y: spawnCell.y }];
  const visited = new Set([key(spawnCell.x, spawnCell.y)]);
  let count = 0;

  while (queue.length > 0) {
    const cell = queue.shift();
    if (!carved[cell.y]?.[cell.x]) {
      continue;
    }

    count += 1;

    const neighbors = [
      { x: cell.x + 1, y: cell.y },
      { x: cell.x - 1, y: cell.y },
      { x: cell.x, y: cell.y + 1 },
      { x: cell.x, y: cell.y - 1 },
    ];

    for (const next of neighbors) {
      if (next.x < 0 || next.x >= cols || next.y < 0 || next.y >= rows) {
        continue;
      }

      if (!carved[next.y]?.[next.x]) {
        continue;
      }

      const nextKey = key(next.x, next.y);
      if (visited.has(nextKey)) {
        continue;
      }

      visited.add(nextKey);
      queue.push(next);
    }
  }

  return count === totalFloorCells;
}

function carveRect(carved, x, y, width, height) {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      if (carved[row] && typeof carved[row][col] !== 'undefined') {
        carved[row][col] = true;
      }
    }
  }
}

function carveCorridor(carved, from, to, width, cols, rows) {
  const fromSafe = {
    x: clampInt(from.x, 1, cols - 2),
    y: clampInt(from.y, 1, rows - 2),
  };

  const toSafe = {
    x: clampInt(to.x, 1, cols - 2),
    y: clampInt(to.y, 1, rows - 2),
  };

  let x = fromSafe.x;
  let y = fromSafe.y;

  while (x !== toSafe.x) {
    carveBrush(carved, x, y, width);
    x += x < toSafe.x ? 1 : -1;
  }

  while (y !== toSafe.y) {
    carveBrush(carved, x, y, width);
    y += y < toSafe.y ? 1 : -1;
  }

  carveBrush(carved, x, y, width);
}

function carveBrush(carved, x, y, width) {
  const half = Math.floor(width / 2);
  for (let oy = -half; oy <= half; oy += 1) {
    for (let ox = -half; ox <= half; ox += 1) {
      const row = y + oy;
      const col = x + ox;
      if (carved[row] && typeof carved[row][col] !== 'undefined') {
        carved[row][col] = true;
      }
    }
  }
}

function isCellInsideBounds(cell, cols, rows) {
  if (!cell || !Number.isInteger(cell.x) || !Number.isInteger(cell.y)) {
    return false;
  }

  return cell.x > 0 && cell.x < cols - 1 && cell.y > 0 && cell.y < rows - 1;
}

function clampInt(value, min, max) {
  const numeric = Number.isFinite(value) ? Math.floor(value) : min;
  return Math.max(min, Math.min(max, numeric));
}

function layoutsHash(rooms, corridors) {
  const roomPart = rooms.length * 73856093;
  const corridorPart = corridors.length * 19349663;
  return (roomPart ^ corridorPart) >>> 0;
}
