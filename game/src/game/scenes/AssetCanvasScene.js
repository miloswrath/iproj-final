import Phaser from 'phaser';
import { getAutoAssetRelativePath } from '../autoAssetManifest';

const TILE_SIZE = 40;
const GRID_COLS = 40;
const GRID_ROWS = 28;
const WORLD_WIDTH = GRID_COLS * TILE_SIZE;
const WORLD_HEIGHT = GRID_ROWS * TILE_SIZE;
const HUD_DEPTH = 2000;
const DEFAULT_TILESET_FRAME_SIZE = { w: 16, h: 16 };
const MAX_FRAMES_PER_TEXTURE = 4096;
const DUNGEON_COMPAT_AUTO_PATTERNS = [
  '_source/craftpix-net-695666-free-undead-tileset-top-down-pixel-art/png/objects_separately/bones_shadow',
  '_source/craftpix-net-695666-free-undead-tileset-top-down-pixel-art/png/objects_separately/crystal_shadow',
  '_source/craftpix-net-695666-free-undead-tileset-top-down-pixel-art/png/objects_separately/grave_shadow',
  '_source/craftpix-net-695666-free-undead-tileset-top-down-pixel-art/png/objects_separately/pile_sculls',
  '_source/craftpix-net-695666-free-undead-tileset-top-down-pixel-art/png/objects_separately/rock_shadow',
  '_source/craftpix-net-695666-free-undead-tileset-top-down-pixel-art/png/objects_separately/ruin_shadow',
  '_source/craftpix-net-695666-free-undead-tileset-top-down-pixel-art/png/objects_separately/scull_door',
  '_source/craftpix-net-695666-free-undead-tileset-top-down-pixel-art/png/objects_separately/thorn_',
];

const OVERWORLD_COMPAT_AUTO_PATTERNS = [
  'craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense/png/objects_separately/',
  'craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense/png/animated_objects/',
  '_source/craftpix-net-505052-free-forest-objects-top-down-pixel-art/png/no_shadow/',
  '_source/craftpix-net-505052-free-forest-objects-top-down-pixel-art/png/with_shadow/',
  'objects/overworld/',
  'tilesets/overworld/',
];

const DUNGEON_COMPAT_SECTIONS = [
  {
    title: 'Classic containers: complete single-tile candidates',
    entries: [
      { textureKey: 'dungeon-objects', frames: [18, 19, 20, 21, 22, 23, 34, 35, 36, 37, 38, 39, 42, 43, 44, 45, 46, 47] },
    ],
  },
  {
    title: 'Classic treasure and chains: sparse only',
    entries: [
      { textureKey: 'dungeon-chests-doors', frames: [20, 21, 22, 23, 24, 25, 26, 27] },
    ],
  },
  {
    title: 'Dungeon traps: palette check',
    entries: [
      { textureKey: 'dungeon-trap-anim', frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] },
    ],
  },
  {
    title: 'Undead sheet 64x64: current candidates',
    entries: [
      { textureKey: 'undead-objects-large', frames: [0, 3, 6, 8, 9, 10, 11, 24, 25, 26, 27, 47, 48, 49, 50, 51, 52, 53, 54, 64, 65, 66, 70, 71, 72, 78, 79, 80, 81, 82, 83, 89, 90, 96, 97, 100, 101, 102, 103, 104, 105, 106, 108, 109, 115, 116, 117, 120, 121, 122, 128, 129, 130, 131] },
    ],
  },
];

const OVERWORLD_COMPAT_SECTIONS = [
  {
    title: 'Current town buildings',
    entries: [
      { textureKey: 'guild-hall-exterior' },
      { textureKey: 'overworld-house-1' },
      { textureKey: 'overworld-house-2' },
      { textureKey: 'overworld-house-3' },
      { textureKey: 'overworld-house-4' },
      { textureKey: 'overworld-tent-1' },
      { textureKey: 'overworld-tent-2' },
      { textureKey: 'overworld-tent-3' },
      { textureKey: 'overworld-tent-4' },
    ],
  },
  {
    title: 'Current terrain and path tiles',
    entries: [
      { textureKey: 'overworld-field-a' },
      { textureKey: 'overworld-field-b' },
      { textureKey: 'overworld-field-c' },
      { textureKey: 'overworld-path-a' },
      { textureKey: 'overworld-path-b' },
      { textureKey: 'overworld-path-c' },
      { textureKey: 'overworld-path-d' },
      { textureKey: 'overworld-town-tile' },
      { textureKey: 'overworld-water-tile' },
    ],
  },
  {
    title: 'Current forest and route accents',
    entries: [
      { textureKey: 'forest-white-tree-1' },
      { textureKey: 'forest-willow-1' },
      { textureKey: 'forest-living-gazebo-1' },
      { textureKey: 'forest-mega-tree-1' },
      { textureKey: 'overworld-grass-1' },
      { textureKey: 'overworld-grass-6' },
      { textureKey: 'overworld-stone-3' },
      { textureKey: 'overworld-box-2' },
    ],
  },
];

function collectTextureKeys(textureManager) {
  const allKeys = textureManager
    .getTextureKeys()
    .filter((key) => typeof key === 'string' && key.length > 0)
    .filter((key) => !key.startsWith('__') && key !== 'default')
    .sort((a, b) => a.localeCompare(b));

  const autoKeys = allKeys.filter((key) => key.startsWith('asset-auto:'));
  return autoKeys.length > 0 ? autoKeys : allKeys;
}

function toFilename(relativePath) {
  const normalized = String(relativePath || '').replace(/\\/g, '/');
  const parts = normalized.split('/');
  return (parts[parts.length - 1] || '').toLowerCase();
}

function isLikelyTilesetSheet(relativePath) {
  const normalized = String(relativePath || '').replace(/\\/g, '/').toLowerCase();
  const filename = toFilename(normalized);

  if (filename === 'fire_animation.png' || filename === 'objects.png') {
    return true;
  }

  if (normalized.includes('/tilesets/') || normalized.includes('/tiled_files/')) {
    return true;
  }

  return false;
}

function canSliceByFrameSize(width, height, frameWidth, frameHeight) {
  return width % frameWidth === 0 && height % frameHeight === 0 && (width > frameWidth || height > frameHeight);
}

function resolveFrameSize(relativePath, width, height) {
  const normalized = String(relativePath || '').replace(/\\/g, '/').toLowerCase();
  const filename = toFilename(normalized);

  if (filename === 'fire_animation.png' && canSliceByFrameSize(width, height, 44, 48)) {
    return { w: 44, h: 48 };
  }

  if (filename === 'objects.png' && canSliceByFrameSize(width, height, 16, 16)) {
    return { w: 16, h: 16 };
  }

  const candidateSizes = [
    { w: 16, h: 16 },
    { w: 24, h: 24 },
    { w: 32, h: 32 },
    { w: 48, h: 48 },
    { w: 64, h: 64 },
  ];

  for (const size of candidateSizes) {
    if (canSliceByFrameSize(width, height, size.w, size.h)) {
      return size;
    }
  }

  return DEFAULT_TILESET_FRAME_SIZE;
}

export class AssetCanvasScene extends Phaser.Scene {
  constructor() {
    super('asset-canvas');
  }

  create() {
    const params = new URLSearchParams(window.location.search);
    this.assetPack = params.get('pack') ?? 'all';
    this.cameras.main.setBackgroundColor(0x0f1a22);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.textureKeys = collectTextureKeys(this.textures);
    this.placeables = this.buildPlaceablesForPack();
    this.selectedIndex = 0;
    this.currentPage = 0;
    this.cellSprites = new Map();
    this.sampleStartY = 1;
    this.sampleRows = GRID_ROWS - 10;
    this.pageSize = (GRID_COLS - 2) * this.sampleRows;
    this.totalPages = Math.max(1, Math.ceil(this.placeables.length / this.pageSize));

    this.drawGrid();
    this.renderAssetPage();
    this.createHud();
    this.bindInput();
    this.updateHud();
  }

  drawGrid() {
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x6aa8c6, 0.22);

    for (let x = 0; x <= GRID_COLS; x += 1) {
      const px = x * TILE_SIZE;
      grid.beginPath();
      grid.moveTo(px, 0);
      grid.lineTo(px, WORLD_HEIGHT);
      grid.strokePath();
    }

    for (let y = 0; y <= GRID_ROWS; y += 1) {
      const py = y * TILE_SIZE;
      grid.beginPath();
      grid.moveTo(0, py);
      grid.lineTo(WORLD_WIDTH, py);
      grid.strokePath();
    }
  }

  renderAssetPage() {
    this.clearSampleRows();

    const startX = 1;
    const startY = this.sampleStartY;
    const usableCols = GRID_COLS - 2;
    const usableRows = this.sampleRows;
    const maxSamples = this.pageSize;
    const pageStartIndex = this.currentPage * maxSamples;
    const pagePlaceables = this.placeables.slice(pageStartIndex, pageStartIndex + maxSamples);

    this.sampleCount = pagePlaceables.length;

    for (let index = 0; index < pagePlaceables.length; index += 1) {
      const x = startX + (index % usableCols);
      const y = startY + Math.floor(index / usableCols);
      this.setCellContent(x, y, pagePlaceables[index]);
    }
  }

  buildPlaceables() {
    const entries = [];

    for (const textureKey of this.textureKeys) {
      if (!this.textures.exists(textureKey)) {
        continue;
      }

      const texture = this.textures.get(textureKey);
      const baseFrame = texture.get();
      const relativePath = getAutoAssetRelativePath(textureKey) ?? textureKey;
      const width = Math.round(baseFrame?.width ?? 0);
      const height = Math.round(baseFrame?.height ?? 0);
      const frameSize = resolveFrameSize(relativePath, width, height);

      if (
        isLikelyTilesetSheet(relativePath)
        && canSliceByFrameSize(width, height, frameSize.w, frameSize.h)
      ) {
        const columns = Math.floor(width / frameSize.w);
        const rows = Math.floor(height / frameSize.h);
        const frameCount = Math.min(columns * rows, MAX_FRAMES_PER_TEXTURE);

        for (let index = 0; index < frameCount; index += 1) {
          const col = index % columns;
          const row = Math.floor(index / columns);
          const frameName = `tile-${frameSize.w}x${frameSize.h}-${col}-${row}`;

          if (!texture.has(frameName)) {
            texture.add(frameName, 0, col * frameSize.w, row * frameSize.h, frameSize.w, frameSize.h);
          }

          entries.push({
            textureKey,
            frame: frameName,
            label: `${relativePath} [${col},${row}]`,
          });
        }

        continue;
      }

      entries.push({
        textureKey,
        frame: undefined,
        label: relativePath,
      });
    }

    return entries;
  }

  buildPlaceablesForPack() {
    if (this.assetPack === 'dungeon-compat') {
      return this.buildCompatibilityPlaceables(DUNGEON_COMPAT_SECTIONS, DUNGEON_COMPAT_AUTO_PATTERNS, 'Undead loose PNGs: compare against sheet frames');
    }

    if (this.assetPack === 'overworld-compat') {
      return this.buildCompatibilityPlaceables(OVERWORLD_COMPAT_SECTIONS, OVERWORLD_COMPAT_AUTO_PATTERNS, 'Overworld loose PNGs: village / forest candidates');
    }

    return this.buildPlaceables();
  }

  buildDungeonCompatibilityPlaceables() {
    return this.buildCompatibilityPlaceables(DUNGEON_COMPAT_SECTIONS, DUNGEON_COMPAT_AUTO_PATTERNS, 'Undead loose PNGs: compare against sheet frames');
  }

  buildCompatibilityPlaceables(sections, autoPatterns, autoSectionLabel) {
    const entries = [];

    for (const section of sections) {
      entries.push({ type: 'section', label: section.title });

      for (const entry of section.entries) {
        if (!this.textures.exists(entry.textureKey)) {
          continue;
        }

        const frames = entry.frames ?? [undefined];
        for (const frame of frames) {
          entries.push({
            textureKey: entry.textureKey,
            frame,
            label: frame === undefined ? `${section.title} | ${entry.textureKey}` : `${section.title} | ${entry.textureKey} frame ${frame}`,
          });
        }
      }
    }

    const autoCandidates = this.textureKeys
      .map((textureKey) => ({ textureKey, relativePath: getAutoAssetRelativePath(textureKey) }))
      .filter((entry) => entry.relativePath)
      .filter((entry) => {
        const normalized = entry.relativePath.replace(/\\/g, '/').toLowerCase();
        return autoPatterns.some((pattern) => normalized.includes(pattern));
      });

    if (autoCandidates.length > 0) {
      entries.push({ type: 'section', label: autoSectionLabel });
      for (const entry of autoCandidates) {
        entries.push({
          textureKey: entry.textureKey,
          frame: undefined,
          label: entry.relativePath,
        });
      }
    }

    return entries;
  }

  clearSampleRows() {
    const sampleEndY = this.sampleStartY + this.sampleRows - 1;
    for (let y = this.sampleStartY; y <= sampleEndY; y += 1) {
      for (let x = 1; x < GRID_COLS - 1; x += 1) {
        this.clearCell(x, y);
      }
    }
  }

  createHud() {
    this.add
      .text(16, 12, this.getCanvasTitle(), {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#f5fbff',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.summaryLabel = this.add
      .text(16, 40, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#bde6ff',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.selectionLabel = this.add
      .text(16, 66, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#dcffba',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.controlsLabel = this.add
      .text(16, 92, '[/] select asset | ,/. page assets | Left click place | Right click erase | C clear canvas | O return overworld', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffeeb8',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    const previewPlaceable = this.placeables[0];
    this.preview = this.add
      .image(1216, 48, previewPlaceable?.textureKey ?? 'overworld-field-a', previewPlaceable?.frame)
      .setDisplaySize(44, 44)
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);
  }

  getCanvasTitle() {
    if (this.assetPack === 'dungeon-compat') {
      return 'Asset Canvas: dungeon compatibility candidates';
    }

    if (this.assetPack === 'overworld-compat') {
      return 'Asset Canvas: overworld compatibility candidates';
    }

    return 'Asset Canvas: all loaded textures are auto-placed on grid';
  }

  bindInput() {
    this.input.mouse.disableContextMenu();
    this.leftBracket = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.OPEN_BRACKET);
    this.rightBracket = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CLOSED_BRACKET);
    this.prevPageKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.COMMA);
    this.nextPageKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PERIOD);
    this.clearKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.exitKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O);

    this.input.on('pointerdown', (pointer) => {
      const cell = this.getCellFromWorld(pointer.worldX, pointer.worldY);
      if (!this.isCellPaintable(cell.x, cell.y)) {
        return;
      }

      if (pointer.rightButtonDown()) {
        this.clearCell(cell.x, cell.y);
        return;
      }

      this.setCellContent(cell.x, cell.y, this.placeables[this.selectedIndex]);
    });
  }

  update() {
    if (this.placeables.length === 0) {
      if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {
        this.scene.start('overworld');
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.leftBracket)) {
      this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex - 1, 0, this.placeables.length);
      this.updateHud();
    }

    if (Phaser.Input.Keyboard.JustDown(this.rightBracket)) {
      this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + 1, 0, this.placeables.length);
      this.updateHud();
    }

    if (Phaser.Input.Keyboard.JustDown(this.prevPageKey)) {
      this.currentPage = Phaser.Math.Wrap(this.currentPage - 1, 0, this.totalPages);
      this.renderAssetPage();
      this.updateHud();
    }

    if (Phaser.Input.Keyboard.JustDown(this.nextPageKey)) {
      this.currentPage = Phaser.Math.Wrap(this.currentPage + 1, 0, this.totalPages);
      this.renderAssetPage();
      this.updateHud();
    }

    if (Phaser.Input.Keyboard.JustDown(this.clearKey)) {
      this.clearCanvasRows(19, GRID_ROWS - 1);
    }

    if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {
      this.scene.start('overworld');
    }
  }

  updateHud() {
    this.summaryLabel.setText(`Pack: ${this.assetPack} | parsed textures: ${this.textureKeys.length} | placeable frames: ${this.placeables.length} | page ${this.currentPage + 1}/${this.totalPages} | shown this page: ${this.sampleCount}`);

    const selectedPlaceable = this.placeables[this.selectedIndex] ?? null;
    this.selectionLabel.setText(`Selected: ${selectedPlaceable?.label ?? '(none)'}`);

    if (selectedPlaceable?.textureKey && this.textures.exists(selectedPlaceable.textureKey)) {
      this.preview.setTexture(selectedPlaceable.textureKey, selectedPlaceable.frame);
    }
  }

  isCellPaintable(x, y) {
    return x >= 1 && x < GRID_COLS - 1 && y >= 19 && y < GRID_ROWS;
  }

  clearCanvasRows(startRow, endRow) {
    for (let y = startRow; y <= endRow; y += 1) {
      for (let x = 1; x < GRID_COLS - 1; x += 1) {
        this.clearCell(x, y);
      }
    }
  }

  getCellFromWorld(worldX, worldY) {
    const x = Phaser.Math.Clamp(Math.floor(worldX / TILE_SIZE), 0, GRID_COLS - 1);
    const y = Phaser.Math.Clamp(Math.floor(worldY / TILE_SIZE), 0, GRID_ROWS - 1);
    return { x, y };
  }

  toCellKey(x, y) {
    return `${x},${y}`;
  }

  clearCell(x, y) {
    const cellKey = this.toCellKey(x, y);
    const existing = this.cellSprites.get(cellKey);
    if (existing) {
      existing.destroy();
      this.cellSprites.delete(cellKey);
    }
  }

  setCellSprite(x, y, placeable) {
    if (!placeable?.textureKey || !this.textures.exists(placeable.textureKey)) {
      return;
    }

    this.clearCell(x, y);

    const centerX = x * TILE_SIZE + TILE_SIZE / 2;
    const centerY = y * TILE_SIZE + TILE_SIZE / 2;
    const sprite = this.add
      .image(centerX, centerY, placeable.textureKey, placeable.frame)
      .setDisplaySize(TILE_SIZE * 0.92, TILE_SIZE * 0.92)
      .setDepth(40);

    this.cellSprites.set(this.toCellKey(x, y), sprite);
  }

  setCellContent(x, y, placeable) {
    if (placeable?.type === 'section') {
      this.setCellLabel(x, y, placeable.label);
      return;
    }

    this.setCellSprite(x, y, placeable);
  }

  setCellLabel(x, y, label) {
    this.clearCell(x, y);

    const text = this.add
      .text(x * TILE_SIZE + 4, y * TILE_SIZE + 4, label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffeeb8',
        backgroundColor: '#00000099',
        wordWrap: { width: TILE_SIZE * 3.5 },
      })
      .setDepth(45);

    this.cellSprites.set(this.toCellKey(x, y), text);
  }
}
