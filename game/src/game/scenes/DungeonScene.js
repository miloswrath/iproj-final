import Phaser from 'phaser';
import { DeveloperModeController } from '../editor/DeveloperModeController';
import { loadDevAssetRegistry } from '../editor/devAssetRegistry';
import curatedDungeonPool from '../data/dungeons/curatedDungeonPool.json';
import { buildDungeonLayoutsFromBlueprints } from '../dungeonPoolBuilder';
import { InventoryOverlay } from '../ui/InventoryOverlay';
import { INVENTORY_ITEM_DEFS } from '../ui/inventoryData';
import {
  claimChestRewards,
  getPlaytestCombatantState,
  getPlaytestInventoryState,
  getPlaytestProgressionSummary,
  recordDungeonClear,
} from '../playtestProgression';

const TILE_SIZE = 40;
const TILE_SCALE = TILE_SIZE / 16;
const GRID_COLS = 40;
const GRID_ROWS = 28;
const DUNGEON_WIDTH = GRID_COLS * TILE_SIZE;
const DUNGEON_HEIGHT = GRID_ROWS * TILE_SIZE;
const GRID_OFFSET_X = 0;
const GRID_OFFSET_Y = 0;

const WALK_SPEED = 180;
const SPRINT_MULTIPLIER = 1.85;
const HUD_DEPTH = 10000;
const ENEMY_DEPTH_OFFSET = 12;

const ROOM_MIN_COUNT = 8;
const ROOM_MAX_COUNT = 12;
const ROOM_MIN_SIZE = 4;
const ROOM_MAX_SIZE = 8;

const CLASSIC_FLOOR_COLORS = [0x1b2230, 0x202837, 0x222a3a, 0x1d2633];
const UNDEAD_FLOOR_COLORS = [0x1c2420, 0x202a24, 0x242c25, 0x1b211d];
const CLASSIC_WALL_COLORS = [0x3d425b, 0x454a66, 0x383d55, 0x4a4f6b];
const UNDEAD_WALL_COLORS = [0x394338, 0x414c3f, 0x333d34, 0x475243];
const FLOOR_CRACK_FRAMES = [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35];

const ROOM_THEMES = [
  { name: 'storage', anchorFrames: [21, 22, 23], sideFrames: [34, 35, 36], accentFrames: [42, 43] },
  { name: 'workshop', anchorFrames: [18, 19, 20], sideFrames: [37, 38, 39], accentFrames: [44, 45] },
  { name: 'supply', anchorFrames: [21, 22, 23], sideFrames: [34, 35, 46, 47], accentFrames: [42, 43] },
];

const FIRE_VARIANT_COUNT = 4;
const FIRE_FRAMES_PER_VARIANT = 6;

const FALLBACK_DUNGEON_POOL_SIZE = 3;
const ACTIVE_CURATED_DUNGEON_COUNT = 5;
const ENEMY_LINE_OF_SIGHT_CELLS = 8;
const ENEMY_CHASE_SPEED = 120;
const ENEMY_COUNT_MIN = 2;
const ENEMY_COUNT_MAX = 4;
const CHEST_INTERACT_DISTANCE = 34;

const DIGIT_KEY_CODES = new Map([
  [Phaser.Input.Keyboard.KeyCodes.ZERO, 0],
  [Phaser.Input.Keyboard.KeyCodes.ONE, 1],
  [Phaser.Input.Keyboard.KeyCodes.TWO, 2],
  [Phaser.Input.Keyboard.KeyCodes.THREE, 3],
  [Phaser.Input.Keyboard.KeyCodes.FOUR, 4],
  [Phaser.Input.Keyboard.KeyCodes.FIVE, 5],
  [Phaser.Input.Keyboard.KeyCodes.SIX, 6],
  [Phaser.Input.Keyboard.KeyCodes.SEVEN, 7],
  [Phaser.Input.Keyboard.KeyCodes.EIGHT, 8],
  [Phaser.Input.Keyboard.KeyCodes.NINE, 9],
]);

const DUNGEON_OBJECT_GROUPS = {
  crates: { kind: 'crate', frames: [0, 1, 2] },
  vessels: { kind: 'vessel', frames: [0, 1, 2] },
  debris: { kind: 'debris', frames: [0, 1, 2] },
  treasure: { texture: 'dungeon-chests-doors', frames: [20, 21, 22, 23, 24], scale: 1.45 },
  chains: { texture: 'dungeon-chests-doors', frames: [25, 26, 27], scale: 1.2, yOffset: 4 },
  spikeTraps: { texture: 'dungeon-trap-anim', frames: [6, 7, 8, 9, 10, 11], scale: 0.72, yOffset: 1, shadow: false },
  floorGrates: { texture: 'dungeon-trap-anim', frames: [0, 1, 2, 3, 4, 5], scale: 0.72, yOffset: 1, shadow: false },
};

const UNDEAD_LARGE_GROUPS = {
  ruins: { kind: 'ruin', frames: [0, 1, 2] },
  bones: { kind: 'bones', frames: [0, 1, 2] },
  graves: { kind: 'grave', frames: [0, 1, 2] },
  roots: { kind: 'roots', frames: [0, 1, 2] },
  skullIdols: { kind: 'skullIdol', frames: [0, 1, 2] },
};

const ENEMY_TYPES = [
  { name: 'Green Slime', maxHp: 24, attack: 6, spriteKey: 'slime-idle', scale: 1.05 },
  { name: 'Spore Plant', maxHp: 28, attack: 7, spriteKey: 'plant1-idle', scale: 1.05 },
  { name: 'Cave Vampire', maxHp: 32, attack: 8, spriteKey: 'vampire1-idle', scale: 1.0 },
];

const DEFAULT_VISUAL_PROFILE = {
  floorColors: CLASSIC_FLOOR_COLORS,
  wallColors: CLASSIC_WALL_COLORS,
  highlight: 0x666b8a,
  shadow: 0x20243a,
  roomGlow: 0x94b2d6,
  crackTint: 0x8990aa,
  crackAlpha: 0.25,
  roomGroups: [DUNGEON_OBJECT_GROUPS.crates, DUNGEON_OBJECT_GROUPS.vessels, DUNGEON_OBJECT_GROUPS.debris],
  corridorGroup: DUNGEON_OBJECT_GROUPS.debris,
  torchMode: 'corners',
  torchEveryRoom: false,
  torchColor: 0xffb866,
  trapEvery: 0,
  decorDensity: 1,
};

const DUNGEON_VISUAL_PROFILES = {
  'atrium-chain': {
    ...DEFAULT_VISUAL_PROFILE,
    roomGroups: [DUNGEON_OBJECT_GROUPS.crates, DUNGEON_OBJECT_GROUPS.vessels, DUNGEON_OBJECT_GROUPS.debris],
    corridorGroup: DUNGEON_OBJECT_GROUPS.debris,
    torchMode: 'north-corners',
    torchEveryRoom: false,
    torchColor: 0xffb45c,
    trapEvery: 0,
    decorDensity: 0.75,
  },
  'sundered-halls': {
    floorColors: [0x19231f, 0x1e2a24, 0x222f27, 0x1b2520],
    wallColors: [0x35433a, 0x3d4b40, 0x2d3933, 0x455346],
    highlight: 0x667663,
    shadow: 0x18211c,
    roomGlow: 0x86b98c,
    crackTint: 0x7d927c,
    crackAlpha: 0.2,
    roomGroups: [UNDEAD_LARGE_GROUPS.roots, UNDEAD_LARGE_GROUPS.ruins],
    corridorGroup: UNDEAD_LARGE_GROUPS.roots,
    torchMode: 'none',
    torchEveryRoom: false,
    torchColor: 0x9be68c,
    trapEvery: 0,
    decorDensity: 0.55,
  },
  'ring-galleries': {
    floorColors: [0x20223a, 0x252743, 0x2a2c4b, 0x1d2035],
    wallColors: [0x47476f, 0x505078, 0x3f4167, 0x595982],
    highlight: 0x7d7eaa,
    shadow: 0x242642,
    roomGlow: 0xc2b3ff,
    crackTint: 0xa9a4d9,
    crackAlpha: 0.26,
    roomGroups: [DUNGEON_OBJECT_GROUPS.crates, DUNGEON_OBJECT_GROUPS.vessels],
    corridorGroup: DUNGEON_OBJECT_GROUPS.chains,
    decorStyle: 'gallery',
    torchMode: 'symmetry',
    torchEveryRoom: true,
    torchColor: 0xd9c0ff,
    trapGroup: DUNGEON_OBJECT_GROUPS.floorGrates,
    trapEvery: 4,
    decorDensity: 0.7,
  },
  'split-sanctum': {
    floorColors: [0x241b1d, 0x2d2022, 0x332428, 0x20191c],
    wallColors: [0x4a3439, 0x563b41, 0x432f35, 0x60454a],
    highlight: 0x856267,
    shadow: 0x25191d,
    roomGlow: 0xd48c85,
    crackTint: 0xb58682,
    crackAlpha: 0.22,
    roomGroups: [UNDEAD_LARGE_GROUPS.graves, UNDEAD_LARGE_GROUPS.skullIdols],
    corridorGroup: UNDEAD_LARGE_GROUPS.bones,
    torchMode: 'bone-altars',
    torchEveryRoom: false,
    torchColor: 0xff8d72,
    trapEvery: 0,
    decorDensity: 0.55,
  },
  'lantern-way': {
    floorColors: [0x272318, 0x302a1d, 0x352d20, 0x242116],
    wallColors: [0x5a4b35, 0x65553c, 0x4f422f, 0x6d5c42],
    highlight: 0x9d875e,
    shadow: 0x2b2419,
    roomGlow: 0xffd181,
    crackTint: 0xd1b076,
    crackAlpha: 0.24,
    roomGroups: [DUNGEON_OBJECT_GROUPS.vessels, DUNGEON_OBJECT_GROUPS.crates],
    corridorGroup: DUNGEON_OBJECT_GROUPS.debris,
    torchMode: 'lantern-path',
    torchEveryRoom: true,
    torchColor: 0xffd06c,
    trapEvery: 0,
    decorDensity: 0.65,
  },
};

let dungeonLayoutPool = [];
let dungeonPoolCursor = 0;

export class DungeonScene extends Phaser.Scene {
  constructor() {
    super('dungeon');
  }

  create(data) {
    this.returnX = data.returnX ?? 120;
    this.returnY = data.returnY ?? 120;
    this.completionStatus = data.completionStatus ?? 'incomplete';
    this.returning = false;

    this.generateKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.prevDungeonKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.OPEN_BRACKET);
    this.nextDungeonKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CLOSED_BRACKET);
    this.debugHudKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F2);
    this.digitKeys = [...DIGIT_KEY_CODES.keys()].map((code) => this.input.keyboard.addKey(code));
    this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keys = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.dungeonNumberBuffer = '';
    this.dungeonNumberBufferTimer = null;
    this.combatStarting = false;
    this.dungeonDebugHudVisible = false;

    this.layoutState = data?.layoutState ? data.layoutState : this.pickDungeonLayoutFromPool(data?.dungeonIndex);
    this.tileTheme = this.layoutState.tileTheme ?? 'classic';
    this.layoutSeed = this.computeLayoutSeed(this.layoutState.id ?? this.layoutState.name ?? 'dungeon');
    this.visualProfile = this.getVisualProfile(this.layoutState);
    this.ensureFireAnimations();

    this.createBackground();
    this.renderLayout(this.layoutState);

    const spawnCell = this.layoutState.spawnCell;
    const spawnPosition = this.cellToWorld(spawnCell.x, spawnCell.y);
    this.spawnPlayer(data?.spawnX ?? spawnPosition.x, data?.spawnY ?? spawnPosition.y);
    this.configureWorldBounds();

    this.createPlayerAnimations();
    this.lastDirection = 'down';
    this.lastCellKey = this.getPlayerCellKey();

    this.physics.add.collider(this.player, this.obstacles);
    this.spawnRoamingEnemies();
    this.addInstructionHud();
    this.updateEncounterUi();
    this.devModeController = new DeveloperModeController(this, {
      sceneLabel: 'Dungeon',
      tileSize: TILE_SIZE,
      cols: GRID_COLS,
      rows: GRID_ROWS,
      worldWidth: DUNGEON_WIDTH,
      worldHeight: DUNGEON_HEIGHT,
      registry: loadDevAssetRegistry('dungeon', this.textures),
    });
    this.inventoryOverlay = new InventoryOverlay(this, getPlaytestInventoryState(), {
      title: 'Dungeon Pack',
      subtitle: 'I / Tab toggle | Arrow keys browse | Inventory pauses movement only',
    });
    this.createChestUi();
  }

  createBackground() {
    const id = this.layoutState?.id ?? 'atrium-chain';
    const base = this.visualProfile;
    const cameraBounds = this.getCameraBounds();
    const centerX = cameraBounds.x + cameraBounds.width / 2;
    const centerY = cameraBounds.y + cameraBounds.height / 2;
    this.add.rectangle(centerX, centerY, cameraBounds.width, cameraBounds.height, base.shadow ?? 0x080d14, 1);

    const haze = this.add.graphics();
    haze.fillGradientStyle(base.shadow ?? 0x080d14, base.shadow ?? 0x080d14, base.highlight ?? 0x39445b, base.roomGlow ?? 0x5d7199, 1);
    haze.fillRect(cameraBounds.x, cameraBounds.y, cameraBounds.width, cameraBounds.height);

    const glowA = this.add.ellipse(DUNGEON_WIDTH * 0.25, DUNGEON_HEIGHT * 0.22, 640, 360, base.roomGlow ?? 0x6f89aa, 0.12);
    const glowB = this.add.ellipse(DUNGEON_WIDTH * 0.74, DUNGEON_HEIGHT * 0.68, 760, 420, base.highlight ?? 0x59637a, 0.09);
    glowA.setBlendMode(Phaser.BlendModes.SCREEN);
    glowB.setBlendMode(Phaser.BlendModes.SCREEN);

    const motif = this.add.graphics();
    if (id === 'ring-galleries') {
      motif.lineStyle(8, 0xc2b3ff, 0.16);
      motif.strokeCircle(DUNGEON_WIDTH * 0.24, DUNGEON_HEIGHT * 0.2, 120);
      motif.strokeCircle(DUNGEON_WIDTH * 0.24, DUNGEON_HEIGHT * 0.2, 196);
      motif.strokeCircle(DUNGEON_WIDTH * 0.78, DUNGEON_HEIGHT * 0.7, 164);
    } else if (id === 'sundered-halls') {
      motif.lineStyle(10, 0x7ccf89, 0.12);
      motif.beginPath();
      motif.moveTo(0, DUNGEON_HEIGHT * 0.14);
      motif.lineTo(DUNGEON_WIDTH * 0.18, DUNGEON_HEIGHT * 0.22);
      motif.lineTo(DUNGEON_WIDTH * 0.3, DUNGEON_HEIGHT * 0.08);
      motif.lineTo(DUNGEON_WIDTH * 0.45, DUNGEON_HEIGHT * 0.26);
      motif.lineTo(DUNGEON_WIDTH * 0.62, DUNGEON_HEIGHT * 0.12);
      motif.strokePath();
    } else if (id === 'split-sanctum') {
      motif.fillStyle(0xd48c85, 0.08);
      motif.fillTriangle(DUNGEON_WIDTH * 0.5, DUNGEON_HEIGHT * 0.14, DUNGEON_WIDTH * 0.42, DUNGEON_HEIGHT * 0.28, DUNGEON_WIDTH * 0.58, DUNGEON_HEIGHT * 0.28);
      motif.lineStyle(8, 0xff8d72, 0.14);
      motif.strokeTriangle(DUNGEON_WIDTH * 0.5, DUNGEON_HEIGHT * 0.16, DUNGEON_WIDTH * 0.38, DUNGEON_HEIGHT * 0.34, DUNGEON_WIDTH * 0.62, DUNGEON_HEIGHT * 0.34);
    } else if (id === 'lantern-way') {
      motif.fillStyle(0xffd181, 0.1);
      for (let index = 0; index < 5; index += 1) {
        motif.fillRoundedRect(170 + (index * 260), 96 + ((index % 2) * 40), 46, 64, 8);
      }
    } else {
      motif.lineStyle(8, 0x94b2d6, 0.12);
      motif.beginPath();
      motif.moveTo(DUNGEON_WIDTH * 0.1, DUNGEON_HEIGHT * 0.18);
      motif.lineTo(DUNGEON_WIDTH * 0.2, DUNGEON_HEIGHT * 0.1);
      motif.lineTo(DUNGEON_WIDTH * 0.34, DUNGEON_HEIGHT * 0.22);
      motif.lineTo(DUNGEON_WIDTH * 0.46, DUNGEON_HEIGHT * 0.08);
      motif.strokePath();
    }
  }

  configureWorldBounds() {
    this.physics.world.setBounds(0, 0, DUNGEON_WIDTH, DUNGEON_HEIGHT);
    const cameraBounds = this.getCameraBounds();
    this.cameras.main.setBounds(cameraBounds.x, cameraBounds.y, cameraBounds.width, cameraBounds.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(140, 96);
  }

  getCameraBounds() {
    const viewportWidth = this.scale.width;
    const viewportHeight = this.scale.height;
    const width = Math.max(DUNGEON_WIDTH, viewportWidth);
    const height = Math.max(DUNGEON_HEIGHT, viewportHeight);
    return {
      x: DUNGEON_WIDTH >= viewportWidth ? 0 : -(viewportWidth - DUNGEON_WIDTH) / 2,
      y: DUNGEON_HEIGHT >= viewportHeight ? 0 : -(viewportHeight - DUNGEON_HEIGHT) / 2,
      width,
      height,
    };
  }

  addInstructionHud() {
    this.add
      .text(16, 12, 'Move: WASD/Arrows | Hold Shift: sprint | E: open chest | I/Tab: inventory | Q: return', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#f4f4f4',
        backgroundColor: '#0000008c',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.statusLabel = this.add
      .text(16, 40, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#d9ffb8',
        backgroundColor: '#0000008c',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.debugControlLabel = this.add
      .text(16, 68, 'Dev dungeon controls: R next layout | [/] swap dungeon | type dungeon number', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c9ddff',
        backgroundColor: '#0000009b',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(false);

    this.layoutLabel = this.add
      .text(16, 96, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffdca6',
        backgroundColor: '#0000009b',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(false);

    this.chaseDebugLabel = this.add
      .text(16, 124, 'Roaming enemies chase when they see you in a straight hall/room line', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffe7a3',
        backgroundColor: '#0000009b',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(false);

    const progressionSummary = getPlaytestProgressionSummary();
    this.progressionDebugLabel = this.add
      .text(16, 152, `Progression seed: open 1-2 dungeon chests to earn loot (${progressionSummary.rewardsEarned} earned so far)`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#b9ffd8',
        backgroundColor: '#0000009b',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(false);
  }

  createChestUi() {
    this.chestPrompt = this.add
      .text(16, 68, 'Press E to open chest', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#fff1ad',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(false);

    this.chestRewardLabel = this.add
      .text(16, 96, 'Latest chest reward: none yet', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c8ffbc',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);
  }

  updateEncounterUi() {
    const layoutId = this.layoutState.id ?? 'generated';
    const layoutName = this.layoutState.name ?? 'Generated Dungeon';
    const dungeonNumber = (this.layoutState.poolIndex ?? 0) + 1;
    const total = this.getDungeonPoolSize();
    this.layoutLabel.setText(`Dungeon ${dungeonNumber}/${total}: ${layoutName} [${layoutId}]`);

    if (this.layoutState.encounterCompleted) {
      this.statusLabel.setText('Dungeon cleared: return to overworld.');
      return;
    }

    const defeated = this.layoutState.defeatedEnemyIds?.length ?? 0;
    const totalEnemies = this.layoutState.enemyCount ?? 0;
    this.statusLabel.setText(`Roaming enemies: ${Math.max(0, totalEnemies - defeated)}/${totalEnemies} active.`);
  }

  setDungeonDebugHudVisible(visible) {
    this.dungeonDebugHudVisible = visible;
    this.debugControlLabel?.setVisible(visible);
    this.layoutLabel?.setVisible(visible);
    this.chaseDebugLabel?.setVisible(visible);
    this.progressionDebugLabel?.setVisible(visible);
  }

  spawnPlayer(spawnX, spawnY) {
    this.player = this.physics.add.sprite(spawnX, spawnY, 'witch-kitty').setScale(0.6);
    this.player.setFrame(0);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(this.player.width * 0.5, this.player.height * 0.7);
  }

  renderLayout(layoutState) {
    this.obstacles = this.physics.add.staticGroup();
    this.decorTaken = new Set([`${layoutState.spawnCell.x},${layoutState.spawnCell.y}`]);
    this.floorCellSet = new Set(layoutState.floorCells.map((cell) => `${cell.x},${cell.y}`));
    this.renderedWallCells = new Set();
    this.chestSprites = [];

    for (const chest of layoutState.chests ?? []) {
      this.decorTaken.add(`${chest.x},${chest.y}`);
    }

    for (const floorCell of layoutState.floorCells) {
      this.renderFloorCell(floorCell.x, floorCell.y);
    }

    for (const room of layoutState.rooms) {
      const roomCenter = this.cellToWorld(room.x + room.w / 2 - 0.5, room.y + room.h / 2 - 0.5);
      this.add
        .rectangle(roomCenter.x, roomCenter.y, room.w * TILE_SIZE, room.h * TILE_SIZE, this.visualProfile.roomGlow, 0.04)
        .setStrokeStyle(1, this.visualProfile.roomGlow, 0.18)
        .setDepth(1);
    }

    this.renderRoomDecor(layoutState.rooms);
    this.renderCorridorDecor(layoutState.floorCells);
    this.renderChests(layoutState.chests ?? []);

    for (const blocker of layoutState.blockers) {
      this.createCollisionCell(blocker.x, blocker.y);
      if (this.isWallVisible(blocker.x, blocker.y)) {
        this.renderWallCell(blocker.x, blocker.y);
      }
    }
  }

  renderChests(chests) {
    for (const chest of chests) {
      const center = this.cellToWorld(chest.x, chest.y);
      const isOpen = chest.opened === true;
      const frame = isOpen ? 24 : 20;

      this.add
        .ellipse(center.x, center.y + TILE_SIZE * 0.28, TILE_SIZE * 0.62, TILE_SIZE * 0.2, 0x000000, 0.24)
        .setDepth(center.y + 8);

      const sprite = this.add
        .image(center.x, center.y + 2, 'dungeon-chests-doors', frame)
        .setScale(1.2)
        .setDepth(center.y + 12);

      if (!isOpen) {
        this.add.circle(center.x, center.y - 18, 4, 0xffd36f, 0.6).setDepth(center.y + 13);
      }

      chest.sprite = sprite;
      this.chestSprites.push(sprite);
    }
  }

  renderFloorCell(cellX, cellY) {
    const center = this.cellToWorld(cellX, cellY);
    const colors = this.visualProfile.floorColors;
    const hash = this.cellHash(cellX, cellY, 31);
    const color = colors[hash % colors.length];

    this.add
      .rectangle(center.x, center.y, TILE_SIZE, TILE_SIZE, color, 1)
      .setStrokeStyle(1, 0x0d1118, 0.28)
      .setDepth(0);

    if (hash % 5 === 0) {
      const frame = FLOOR_CRACK_FRAMES[hash % FLOOR_CRACK_FRAMES.length];
      this.add
        .image(center.x, center.y, 'dungeon-floor-tiles', frame)
        .setScale(TILE_SCALE)
        .setAlpha(this.visualProfile.crackAlpha)
        .setTint(this.visualProfile.crackTint)
        .setDepth(2);
    }
  }

  renderWallCell(cellX, cellY) {
    const center = this.cellToWorld(cellX, cellY);
    const key = `${cellX},${cellY}`;
    if (this.renderedWallCells.has(key)) {
      return;
    }

    this.renderedWallCells.add(key);

    const colors = this.visualProfile.wallColors;
    const hash = this.cellHash(cellX, cellY, 79);
    const color = colors[hash % colors.length];
    const topHighlight = this.visualProfile.highlight;
    const shadow = this.visualProfile.shadow;

    this.add
      .rectangle(center.x, center.y, TILE_SIZE, TILE_SIZE, color, 1)
      .setStrokeStyle(1, shadow, 0.75)
      .setDepth(center.y + 16);

    this.add
      .rectangle(center.x, center.y - TILE_SIZE * 0.3, TILE_SIZE - 5, 5, topHighlight, 0.28)
      .setDepth(center.y + 17);

    if (hash % 4 === 0) {
      this.add
        .rectangle(center.x + ((hash % 3) - 1) * 4, center.y + 3, 4, 10, shadow, 0.3)
        .setDepth(center.y + 18);
    }
  }

  createCollisionCell(cellX, cellY) {
    const center = this.cellToWorld(cellX, cellY);
    const blocker = this.add.zone(center.x, center.y, TILE_SIZE, TILE_SIZE);
    this.physics.add.existing(blocker, true);
    this.obstacles.add(blocker);
  }

  isWallVisible(cellX, cellY) {
    const neighbors = [
      `${cellX + 1},${cellY}`,
      `${cellX - 1},${cellY}`,
      `${cellX},${cellY + 1}`,
      `${cellX},${cellY - 1}`,
      `${cellX + 1},${cellY + 1}`,
      `${cellX - 1},${cellY + 1}`,
      `${cellX + 1},${cellY - 1}`,
      `${cellX - 1},${cellY - 1}`,
    ];

    return neighbors.some((key) => this.floorCellSet.has(key));
  }

  renderRoomDecor(rooms) {
    for (let roomIndex = 0; roomIndex < rooms.length; roomIndex += 1) {
      const room = rooms[roomIndex];
      const themeHash = this.cellHash(room.x + roomIndex, room.y, 191);
      const theme = ROOM_THEMES[themeHash % ROOM_THEMES.length];

      const decorDensity = this.visualProfile.decorDensity ?? 1;
      if (decorDensity >= 0.95 || this.cellHash(room.x, room.y, 211 + roomIndex) % 100 < decorDensity * 100) {
        this.placeRoomDecorCluster(room, theme, roomIndex);
      }

      if (this.visualProfile.decorStyle !== 'gallery' && room.w >= 7 && room.h >= 7) {
        this.placeRoomWallAccent(room, theme, roomIndex);
      }

      this.placeRoomTrap(room, roomIndex);

      if (this.shouldPlaceTorchPair(roomIndex)) {
        this.placeRoomTorchPair(room, roomIndex);
      }
    }
  }

  placeRoomDecorCluster(room, theme, roomIndex) {
    if (this.visualProfile.decorStyle === 'gallery') {
      this.placeGalleryDecor(room, roomIndex);
      return;
    }

    const center = this.roomCenter(room);
    const flipX = this.cellHash(room.x, room.y, 409 + roomIndex) % 2 === 0 ? 1 : -1;
    const flipY = this.cellHash(room.y, room.x, 421 + roomIndex) % 2 === 0 ? 1 : -1;
    const anchorX = Phaser.Math.Clamp(center.x + flipX, room.x + 1, room.x + room.w - 2);
    const anchorY = Phaser.Math.Clamp(center.y + flipY, room.y + 1, room.y + room.h - 2);
    const objectGroups = this.visualProfile.roomGroups;
    const anchorGroup = objectGroups[this.cellHash(room.x, room.y, 397 + roomIndex) % objectGroups.length];
    const pattern = [
      { x: 0, y: 0, group: anchorGroup },
      { x: flipX, y: 0, group: objectGroups[(roomIndex + 1) % objectGroups.length] },
      { x: 0, y: flipY, group: objectGroups[(roomIndex + 2) % objectGroups.length] },
    ];

    for (let i = 0; i < pattern.length; i += 1) {
      const part = pattern[i];
      const frames = part.group.frames;
      const frame = frames[this.cellHash(anchorX + i, anchorY, 433 + roomIndex) % frames.length];
      this.placeDecorIfOpen(anchorX + part.x, anchorY + part.y, frame, part.group);
    }
  }

  placeGalleryDecor(room, roomIndex) {
    const center = this.roomCenter(room);
    const groups = this.visualProfile.roomGroups;
    const treasureGroup = this.visualProfile.treasureGroup;
    const top = room.y + 1;
    const bottom = room.y + room.h - 2;
    const left = room.x + 1;
    const right = room.x + room.w - 2;
    const wallCells = [
      { x: Phaser.Math.Clamp(center.x - 2, left, right), y: top, group: groups[1] },
      { x: Phaser.Math.Clamp(center.x + 2, left, right), y: top, group: groups[0] },
      { x: left, y: Phaser.Math.Clamp(center.y, top, bottom), group: groups[(roomIndex + 1) % groups.length] },
      { x: right, y: Phaser.Math.Clamp(center.y, top, bottom), group: groups[(roomIndex + 1) % groups.length] },
    ];

    for (let i = 0; i < wallCells.length; i += 1) {
      const cell = wallCells[i];
      this.placeDecorIfOpen(cell.x, cell.y, this.pickFrame(cell.group, cell.x, cell.y, 811 + roomIndex), cell.group);
    }

    if (treasureGroup && roomIndex % 3 === 0) {
      const treasureCell = roomIndex % 2 === 0
        ? { x: Phaser.Math.Clamp(center.x + 1, left, right), y: bottom }
        : { x: right, y: Phaser.Math.Clamp(center.y + 1, top, bottom) };
      this.placeDecorIfOpen(
        treasureCell.x,
        treasureCell.y,
        this.pickFrame(treasureGroup, treasureCell.x, treasureCell.y, 823 + roomIndex),
        treasureGroup,
      );
    }

    if (room.w < 6 || room.h < 6 || roomIndex % 3 !== 1) {
      return;
    }

    const blockGroupA = groups[roomIndex % groups.length];
    const blockGroupB = groups[(roomIndex + 1) % groups.length];
    const blockCells = [
      { x: center.x, y: center.y, group: blockGroupA },
      { x: center.x + 1, y: center.y, group: blockGroupB },
    ];

    for (let i = 0; i < blockCells.length; i += 1) {
      const cell = blockCells[i];
      this.placeDecorIfOpen(cell.x, cell.y, this.pickFrame(cell.group, cell.x, cell.y, 829 + roomIndex), cell.group);
    }
  }

  placeRoomWallAccent(room, theme, roomIndex) {
    const top = room.y + 1;
    const bottom = room.y + room.h - 2;
    const left = room.x + 1;
    const right = room.x + room.w - 2;
    const horizontal = this.cellHash(room.x, room.y, 467 + roomIndex) % 2 === 0;
    const cells = horizontal
      ? [
        { x: left + 1, y: top },
        { x: right - 1, y: bottom },
      ]
      : [
        { x: left, y: top + 1 },
        { x: right, y: bottom - 1 },
      ];

    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      const group = this.visualProfile.roomGroups[(roomIndex + i) % this.visualProfile.roomGroups.length];
      this.placeDecorIfOpen(cell.x, cell.y, this.pickFrame(group, cell.x, cell.y, 479 + roomIndex), group);
    }
  }

  placeRoomTorchPair(room, roomIndex) {
    const center = this.roomCenter(room);
    const top = room.y + 1;
    const bottom = room.y + room.h - 2;
    const left = room.x + 1;
    const right = room.x + room.w - 2;
    let cells;

    if (this.visualProfile.torchMode === 'lantern-path') {
      cells = [
        { x: left, y: center.y },
        { x: right, y: center.y },
      ];
    } else if (this.visualProfile.torchMode === 'symmetry') {
      cells = [
        { x: left, y: top },
        { x: right, y: top },
        { x: left, y: bottom },
        { x: right, y: bottom },
      ];
    } else if (this.visualProfile.torchMode === 'bone-altars') {
      cells = [
        { x: center.x - 1, y: bottom },
        { x: center.x + 1, y: bottom },
      ];
    } else {
      cells = [
        { x: Phaser.Math.Clamp(center.x - 2, left, right), y: top },
        { x: Phaser.Math.Clamp(center.x + 2, left, right), y: top },
      ];
    }

    const roomFireVariant = (this.cellHash(room.x, room.y, 503) + roomIndex) % FIRE_VARIANT_COUNT;
    for (let i = 0; i < cells.length; i += 1) {
      this.placeFireIfOpen(cells[i].x, cells[i].y, roomFireVariant);
    }
  }

  placeRoomTrap(room, roomIndex) {
    const trapEvery = this.visualProfile.trapEvery ?? 0;
    if (trapEvery <= 0 || roomIndex % trapEvery !== 1 || room.w < 6 || room.h < 6) {
      return;
    }

    const trapGroup = this.visualProfile.trapGroup ?? DUNGEON_OBJECT_GROUPS.spikeTraps;
    const center = this.roomCenter(room);
    const horizontal = this.cellHash(room.x, room.y, 853 + roomIndex) % 2 === 0;
    const cells = horizontal
      ? [
        { x: center.x - 1, y: center.y },
        { x: center.x, y: center.y },
        { x: center.x + 1, y: center.y },
      ]
      : [
        { x: center.x, y: center.y - 1 },
        { x: center.x, y: center.y },
        { x: center.x, y: center.y + 1 },
      ];

    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      this.placeDecorIfOpen(cell.x, cell.y, this.pickFrame(trapGroup, cell.x, cell.y, 859 + i), trapGroup);
    }
  }

  renderCorridorDecor(floorCells) {
    const corridorCells = floorCells.filter((cell) => !this.isInsideAnyRoom(cell.x, cell.y));
    const propGroup = this.visualProfile.corridorGroup;

    for (const cell of corridorCells) {
      const key = `${cell.x},${cell.y}`;
      if (this.decorTaken.has(key)) {
        continue;
      }

      const hash = this.cellHash(cell.x, cell.y, 337);
      const roll = hash % 100;

      const corridorChance = this.visualProfile.decorDensity < 0.75 ? 2 : 3;
      if (roll < corridorChance) {
        this.placeDecorIfOpen(cell.x, cell.y, this.pickFrame(propGroup, cell.x, cell.y, 337), propGroup);
      }
    }
  }

  ensureFireAnimations() {
    for (let variant = 0; variant < FIRE_VARIANT_COUNT; variant += 1) {
      const key = `dungeon-fire-variant-${variant}`;
      if (this.anims.exists(key)) {
        continue;
      }

      const frames = [];
      for (let row = 0; row < FIRE_FRAMES_PER_VARIANT; row += 1) {
        frames.push(row * FIRE_VARIANT_COUNT + variant);
      }

      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers('dungeon-fire-anim', { frames }),
        frameRate: 9,
        repeat: -1,
      });
    }
  }

  placeFireAtCell(cellX, cellY, variant) {
    const center = this.cellToWorld(cellX, cellY);
    const fireAnimKey = `dungeon-fire-variant-${variant % FIRE_VARIANT_COUNT}`;
    const fireTint = this.visualProfile.torchColor;

    this.add.ellipse(center.x, center.y + TILE_SIZE * 0.26, TILE_SIZE * 0.42, TILE_SIZE * 0.17, 0x000000, 0.22).setDepth(center.y + 9);
    this.add.ellipse(center.x, center.y - 3, TILE_SIZE * 0.8, TILE_SIZE * 0.55, fireTint, 0.08).setDepth(3);

    this.add
      .sprite(center.x, center.y - 6, 'dungeon-fire-anim', variant)
      .setScale(0.72)
      .setTint(fireTint)
      .setDepth(center.y + 11)
      .play(fireAnimKey);
  }

  placeFireIfOpen(cellX, cellY, variant) {
    const key = `${cellX},${cellY}`;
    if (!this.floorCellSet.has(key) || this.decorTaken.has(key) || key === `${this.layoutState.spawnCell.x},${this.layoutState.spawnCell.y}`) {
      return false;
    }

    this.placeFireAtCell(cellX, cellY, variant);
    this.decorTaken.add(key);
    return true;
  }

  placeDecorIfOpen(cellX, cellY, frame, decorGroupOrKey) {
    const key = `${cellX},${cellY}`;
    if (!this.floorCellSet.has(key) || this.decorTaken.has(key) || key === `${this.layoutState.spawnCell.x},${this.layoutState.spawnCell.y}`) {
      return false;
    }

    this.placeDecorAtCell(cellX, cellY, frame, decorGroupOrKey);
    this.decorTaken.add(key);
    return true;
  }

  placeDecorAtCell(cellX, cellY, frame, decorGroupOrKey) {
    const center = this.cellToWorld(cellX, cellY);
    const decorGroup = typeof decorGroupOrKey === 'string'
      ? { texture: decorGroupOrKey, scale: TILE_SCALE, yOffset: 0 }
      : decorGroupOrKey;

    if (decorGroup.kind) {
      this.placeProceduralDecorAtCell(center, decorGroup.kind, frame);
      return;
    }

    const scale = decorGroup.scale ?? TILE_SCALE;
    const yOffset = decorGroup.yOffset ?? 0;

    if (decorGroup.shadow !== false) {
      this.add
        .ellipse(center.x, center.y + TILE_SIZE * 0.26, TILE_SIZE * 0.6, TILE_SIZE * 0.22, 0x000000, 0.2)
        .setDepth(center.y + 8);
    }

    this.add
      .image(center.x, center.y + yOffset, decorGroup.texture, frame)
      .setScale(scale)
      .setDepth(center.y + 10);
  }

  placeProceduralDecorAtCell(center, kind, variant = 0) {
    const depth = center.y + 10;
    this.add
      .ellipse(center.x, center.y + TILE_SIZE * 0.26, TILE_SIZE * 0.58, TILE_SIZE * 0.2, 0x000000, 0.22)
      .setDepth(depth - 2);

    switch (kind) {
      case 'crate':
        this.drawCrateDecor(center, variant, depth);
        break;
      case 'vessel':
        this.drawVesselDecor(center, variant, depth);
        break;
      case 'debris':
        this.drawDebrisDecor(center, variant, depth);
        break;
      case 'ruin':
        this.drawRuinDecor(center, variant, depth);
        break;
      case 'bones':
        this.drawBoneDecor(center, variant, depth);
        break;
      case 'grave':
        this.drawGraveDecor(center, variant, depth);
        break;
      case 'roots':
        this.drawRootsDecor(center, variant, depth);
        break;
      case 'skullIdol':
        this.drawSkullIdolDecor(center, variant, depth);
        break;
      default:
        this.drawDebrisDecor(center, variant, depth);
        break;
    }
  }

  drawCrateDecor(center, variant, depth) {
    const width = variant === 1 ? 24 : 21;
    const height = variant === 2 ? 18 : 22;
    const x = center.x;
    const y = center.y + 4;
    this.add.rectangle(x, y, width, height, 0x8a5c38, 1).setStrokeStyle(2, 0x3f2a1d, 0.85).setDepth(depth);
    this.add.rectangle(x, y - height * 0.18, width - 3, 3, 0xc08a52, 0.7).setDepth(depth + 1);
    this.add.rectangle(x, y, 3, height - 3, 0x5b3927, 0.72).setDepth(depth + 1);
    if (variant === 2) {
      this.add.rectangle(x, y, width - 4, 3, 0x3f2a1d, 0.55).setRotation(0.65).setDepth(depth + 1);
    }
  }

  drawVesselDecor(center, variant, depth) {
    const color = [0x7a5a8c, 0x6f704f, 0x8b6a4a][variant % 3];
    const rim = [0xb49bc9, 0xa8aa7d, 0xc6976d][variant % 3];
    this.add.ellipse(center.x, center.y + 7, 18, 22, color, 1).setStrokeStyle(2, 0x2d2431, 0.78).setDepth(depth);
    this.add.rectangle(center.x, center.y - 4, 10, 7, color, 1).setStrokeStyle(2, 0x2d2431, 0.72).setDepth(depth + 1);
    this.add.ellipse(center.x, center.y - 8, 14, 5, rim, 0.85).setDepth(depth + 2);
    if (variant === 0) {
      this.add.ellipse(center.x + 11, center.y + 4, 8, 11, 0x59425f, 1).setStrokeStyle(2, 0x2d2431, 0.7).setDepth(depth);
    }
  }

  drawDebrisDecor(center, variant, depth) {
    const offset = variant - 1;
    this.add.rectangle(center.x - 7, center.y + 9, 15, 5, 0x6f4a34, 1).setStrokeStyle(1, 0x2b2018, 0.8).setRotation(-0.25).setDepth(depth);
    this.add.rectangle(center.x + 7, center.y + 7 + offset, 12, 5, 0x8a674a, 1).setStrokeStyle(1, 0x2b2018, 0.75).setRotation(0.35).setDepth(depth + 1);
    this.add.ellipse(center.x + offset * 4, center.y + 12, 8, 5, 0x29241d, 0.55).setDepth(depth - 1);
  }

  drawRuinDecor(center, variant, depth) {
    const stone = [0x687064, 0x58645c, 0x727064][variant % 3];
    this.add.rectangle(center.x - 5, center.y + 5, 13, 28, stone, 1).setStrokeStyle(2, 0x2c342f, 0.8).setDepth(depth);
    this.add.rectangle(center.x + 8, center.y + 12, 11, 15, 0x4b554e, 1).setStrokeStyle(2, 0x2c342f, 0.8).setDepth(depth);
    this.add.rectangle(center.x - 4, center.y - 11, 18, 5, 0x879084, 0.85).setDepth(depth + 1);
  }

  drawBoneDecor(center, variant, depth) {
    const bone = 0xb9b79f;
    this.add.rectangle(center.x - 3, center.y + 7, 22, 4, bone, 1).setRotation(0.42 + variant * 0.15).setDepth(depth);
    this.add.ellipse(center.x - 12, center.y + 2, 6, 6, bone, 1).setDepth(depth + 1);
    this.add.ellipse(center.x + 10, center.y + 12, 6, 6, bone, 1).setDepth(depth + 1);
    this.add.ellipse(center.x + 3, center.y + 5, 7, 5, 0xd1cdb4, 0.9).setDepth(depth + 2);
  }

  drawGraveDecor(center, variant, depth) {
    const stone = [0x687066, 0x74736c, 0x5f6962][variant % 3];
    this.add.ellipse(center.x, center.y - 5, 18, 15, stone, 1).setStrokeStyle(2, 0x29312d, 0.85).setDepth(depth);
    this.add.rectangle(center.x, center.y + 6, 18, 24, stone, 1).setStrokeStyle(2, 0x29312d, 0.85).setDepth(depth + 1);
    this.add.rectangle(center.x, center.y + 1, 8, 2, 0x2f3834, 0.8).setDepth(depth + 2);
  }

  drawRootsDecor(center, variant, depth) {
    const graphics = this.add.graphics().setDepth(depth);
    graphics.lineStyle(4, 0x3e4a37, 0.95);
    graphics.beginPath();
    graphics.moveTo(center.x - 12, center.y + 10);
    graphics.lineTo(center.x - 3, center.y + 3);
    graphics.lineTo(center.x + 7, center.y + 11);
    graphics.strokePath();
    graphics.lineStyle(3, variant === 1 ? 0x6fa267 : 0x546647, 0.88);
    graphics.beginPath();
    graphics.moveTo(center.x - 2, center.y + 7);
    graphics.lineTo(center.x + 12, center.y + 1);
    graphics.strokePath();
  }

  drawSkullIdolDecor(center, variant, depth) {
    const base = variant === 2 ? 0x5e655a : 0x70776c;
    this.add.rectangle(center.x, center.y + 10, 19, 12, 0x4a5149, 1).setStrokeStyle(2, 0x252c28, 0.8).setDepth(depth);
    this.add.ellipse(center.x, center.y - 2, 18, 20, base, 1).setStrokeStyle(2, 0x252c28, 0.85).setDepth(depth + 1);
    this.add.ellipse(center.x - 4, center.y - 3, 3, 4, 0x18201c, 1).setDepth(depth + 2);
    this.add.ellipse(center.x + 4, center.y - 3, 3, 4, 0x18201c, 1).setDepth(depth + 2);
    this.add.rectangle(center.x, center.y + 5, 7, 2, 0x18201c, 0.85).setDepth(depth + 2);
  }

  pickFrame(group, cellX, cellY, salt = 0) {
    return group.frames[this.cellHash(cellX, cellY, salt) % group.frames.length];
  }

  shouldPlaceTorchPair(roomIndex) {
    if (this.visualProfile.torchMode === 'none') {
      return false;
    }

    return this.visualProfile.torchEveryRoom || roomIndex % 2 === 0;
  }

  getVisualProfile(layoutState) {
    const profile = DUNGEON_VISUAL_PROFILES[layoutState.id];
    if (profile) {
      return profile;
    }

    return layoutState.tileTheme === 'undead'
      ? {
        ...DEFAULT_VISUAL_PROFILE,
        floorColors: UNDEAD_FLOOR_COLORS,
        wallColors: UNDEAD_WALL_COLORS,
        highlight: 0x6d7969,
        shadow: 0x1d251f,
        roomGlow: 0x86b98c,
        crackTint: 0x8c927d,
        roomGroups: [UNDEAD_LARGE_GROUPS.ruins, UNDEAD_LARGE_GROUPS.bones, UNDEAD_LARGE_GROUPS.graves],
        corridorGroup: UNDEAD_LARGE_GROUPS.roots,
        torchMode: 'none',
      }
      : DEFAULT_VISUAL_PROFILE;
  }

  spawnRoamingEnemies() {
    this.enemies = this.physics.add.group();
    const enemySpawnCells = this.pickEnemySpawnCells();
    this.layoutState.enemyCount = enemySpawnCells.length;
    const defeatedEnemyIds = new Set(this.layoutState.defeatedEnemyIds ?? []);

    for (let index = 0; index < enemySpawnCells.length; index += 1) {
      const enemyId = `${this.layoutState.id ?? 'dungeon'}:enemy-${index}`;
      if (defeatedEnemyIds.has(enemyId)) {
        continue;
      }

      const cell = enemySpawnCells[index];
      const savedPosition = this.layoutState.enemyPositions?.[enemyId] ?? null;
      const center = savedPosition ?? this.cellToWorld(cell.x, cell.y);
      const enemyType = ENEMY_TYPES[this.cellHash(cell.x, cell.y, 701 + index) % ENEMY_TYPES.length];
      const enemy = this.physics.add
        .sprite(center.x, center.y, enemyType.spriteKey, 0)
        .setScale(enemyType.scale)
        .setDepth(center.y + ENEMY_DEPTH_OFFSET);

      enemy.enemyId = enemyId;
      enemy.enemyStats = { ...enemyType };
      enemy.spawnCell = cell;
      enemy.homeScale = enemyType.scale;
      enemy.chasing = false;
      enemy.body.setSize(enemy.width * 0.45, enemy.height * 0.55);
      this.playEnemyIdle(enemy);
      this.enemies.add(enemy);
    }

    this.physics.add.collider(this.enemies, this.obstacles);
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      this.startCombat(enemy);
    });
  }

  pickEnemySpawnCells() {
    const spawnKey = `${this.layoutState.spawnCell.x},${this.layoutState.spawnCell.y}`;
    const rooms = this.layoutState.rooms.filter((room) => {
      const center = this.roomCenter(room);
      return `${center.x},${center.y}` !== spawnKey;
    });
    const targetCount = Phaser.Math.Clamp(Math.floor(rooms.length * 0.55), ENEMY_COUNT_MIN, ENEMY_COUNT_MAX);
    const cells = [];

    for (let i = 0; i < rooms.length && cells.length < targetCount; i += 1) {
      const room = rooms[(i + 1) % rooms.length];
      const center = this.roomCenter(room);
      const offsetX = (this.cellHash(room.x, room.y, 733 + i) % 3) - 1;
      const offsetY = (this.cellHash(room.y, room.x, 751 + i) % 3) - 1;
      const x = Phaser.Math.Clamp(center.x + offsetX, room.x + 1, room.x + room.w - 2);
      const y = Phaser.Math.Clamp(center.y + offsetY, room.y + 1, room.y + room.h - 2);
      const key = `${x},${y}`;

      if (this.floorCellSet.has(key) && !this.decorTaken.has(key) && key !== spawnKey) {
        cells.push({ x, y });
        this.decorTaken.add(key);
      }
    }

    return cells;
  }

  playEnemyIdle(enemy) {
    const spriteKey = enemy.enemyStats.spriteKey;
    const animationConfig = {
      'slime-idle': { endFrame: 5, frameRate: 7 },
      'plant1-idle': { endFrame: 3, frameRate: 6 },
      'vampire1-idle': { endFrame: 3, frameRate: 6 },
    };
    const config = animationConfig[spriteKey] ?? animationConfig['slime-idle'];
    const animKey = `${spriteKey}-dungeon-roam`;

    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(spriteKey, { start: 0, end: config.endFrame }),
        frameRate: config.frameRate,
        repeat: -1,
      });
    }

    enemy.play(animKey);
  }

  resetRoamingEnemy(enemy, teleportToSpawn = true) {
    if (!enemy?.active) {
      return;
    }

    this.tweens.killTweensOf(enemy);
    enemy.chasing = false;
    enemy.setVelocity(0, 0);
    enemy.clearTint();
    enemy.setAlpha(1);
    enemy.setScale(enemy.homeScale ?? enemy.enemyStats?.scale ?? 1);

    if (teleportToSpawn && enemy.spawnCell) {
      const spawn = this.cellToWorld(enemy.spawnCell.x, enemy.spawnCell.y);
      enemy.setPosition(spawn.x, spawn.y);
    }

    if (enemy.body) {
      enemy.body.reset(enemy.x, enemy.y);
      enemy.body.setSize(enemy.width * 0.45, enemy.height * 0.55);
      enemy.body.setVelocity(0, 0);
    }

    enemy.setDepth(enemy.y + ENEMY_DEPTH_OFFSET);
    this.playEnemyIdle(enemy);
  }

  resetRoamingEnemies(teleportToSpawn = true) {
    if (!this.enemies) {
      return;
    }

    this.enemies.getChildren().forEach((enemy) => {
      this.resetRoamingEnemy(enemy, teleportToSpawn);
    });
  }

  saveEnemyReturnPositions(engagedEnemyId = null) {
    if (!this.enemies) {
      return;
    }

    const enemyPositions = {};

    for (const enemy of this.enemies.getChildren()) {
      if (!enemy.active || !enemy.enemyId) {
        continue;
      }

      const shouldReturnToSpawn = enemy.chasing || enemy.enemyId === engagedEnemyId;
      const position = shouldReturnToSpawn && enemy.spawnCell
        ? this.cellToWorld(enemy.spawnCell.x, enemy.spawnCell.y)
        : { x: enemy.x, y: enemy.y };

      enemyPositions[enemy.enemyId] = {
        x: position.x,
        y: position.y,
      };
    }

    this.layoutState.enemyPositions = enemyPositions;
  }

  computeLayoutSeed(seedText) {
    const text = String(seedText ?? 'dungeon');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  cellHash(x, y, salt = 0) {
    return this.hash2d((x + this.layoutSeed + salt) >>> 0, (y + salt * 17) >>> 0);
  }

  pickDeterministicFrame(frames, x, y, salt = 0) {
    if (!frames || frames.length === 0) {
      return 0;
    }
    const hash = this.cellHash(x, y, salt);
    return frames[hash % frames.length];
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.debugHudKey)) {
      this.setDungeonDebugHudVisible(!this.dungeonDebugHudVisible);
    }

    const editorHasFocus = this.devModeController?.update() ?? false;
    if (editorHasFocus) {
      if (!this.editorCameraDetached) {
        this.cameras.main.stopFollow();
        this.editorCameraDetached = true;
      }
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      return;
    }

    if (this.editorCameraDetached) {
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.cameras.main.setDeadzone(140, 96);
      this.editorCameraDetached = false;
    }

    if (this.inventoryOverlay?.update()) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      if (this.enemies) {
        this.enemies.getChildren().forEach((enemy) => enemy.setVelocity(0, 0));
      }
      return;
    }

    this.updateChestInteraction();

    if (this.dungeonDebugHudVisible) {
      if (Phaser.Input.Keyboard.JustDown(this.generateKey)) {
        this.switchDungeonByOffset(1);
        return;
      }

      if (Phaser.Input.Keyboard.JustDown(this.prevDungeonKey)) {
        this.switchDungeonByOffset(-1);
        return;
      }

      if (Phaser.Input.Keyboard.JustDown(this.nextDungeonKey)) {
        this.switchDungeonByOffset(1);
        return;
      }

      if (this.handleDungeonNumberInput()) {
        return;
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
      this.returnToOverworld();
      return;
    }

    this.updateMovement();
    this.updateRoamingEnemies();
  }

  updateChestInteraction() {
    const nearbyChest = this.getNearbyClosedChest();
    this.chestPrompt?.setVisible(Boolean(nearbyChest));

    if (!nearbyChest || !Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      return;
    }

    const rewardResult = claimChestRewards(nearbyChest, this.layoutState.id);
    if (!rewardResult.granted) {
      return;
    }

    nearbyChest.sprite?.setFrame(24);
    this.layoutState.lastChestRewardText = rewardResult.summaryText;
    if (this.chestRewardLabel) {
      this.chestRewardLabel.setText(`Latest chest reward: ${rewardResult.summaryText}`);
    }
  }

  getNearbyClosedChest() {
    const chests = this.layoutState.chests ?? [];
    for (const chest of chests) {
      if (chest.opened) {
        continue;
      }

      const center = this.cellToWorld(chest.x, chest.y);
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, center.x, center.y);
      if (distance <= CHEST_INTERACT_DISTANCE) {
        return chest;
      }
    }

    return null;
  }

  updateMovement() {
    const left = this.keys.left.isDown || this.wasd.A.isDown;
    const right = this.keys.right.isDown || this.wasd.D.isDown;
    const up = this.keys.up.isDown || this.wasd.W.isDown;
    const down = this.keys.down.isDown || this.wasd.S.isDown;

    const dx = Number(right) - Number(left);
    const dy = Number(down) - Number(up);

    const speed = this.shiftKey.isDown ? WALK_SPEED * SPRINT_MULTIPLIER : WALK_SPEED;
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(speed);

    this.player.setVelocity(direction.x || 0, direction.y || 0);

    if (dx === 0 && dy === 0) {
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      this.lastDirection = dx > 0 ? 'right' : 'left';
    } else {
      this.lastDirection = dy > 0 ? 'down' : 'up';
    }

    this.player.anims.play(`walk-${this.lastDirection}`, true);
  }

  updateRoamingEnemies() {
    if (this.layoutState.encounterCompleted || this.combatStarting || !this.enemies || !this.player.body) {
      return;
    }

    for (const enemy of this.enemies.getChildren()) {
      if (!enemy.active || !enemy.body) {
        continue;
      }

      if (!enemy.chasing && this.hasLineOfSightToPlayer(enemy)) {
        enemy.chasing = true;
        this.tweens.add({
          targets: enemy,
          scaleX: enemy.scaleX * 1.12,
          scaleY: enemy.scaleY * 1.12,
          duration: 120,
          yoyo: true,
        });
      }

      if (enemy.chasing) {
        this.physics.moveToObject(enemy, this.player, ENEMY_CHASE_SPEED);
        enemy.setDepth(enemy.y + ENEMY_DEPTH_OFFSET);
      } else {
        enemy.setVelocity(0, 0);
      }
    }
  }

  hasLineOfSightToPlayer(enemy) {
    const enemyCell = this.worldToCell(enemy.x, enemy.y);
    const playerCell = this.worldToCell(this.player.x, this.player.y);
    const sameColumn = enemyCell.x === playerCell.x;
    const sameRow = enemyCell.y === playerCell.y;

    if (!sameColumn && !sameRow) {
      return false;
    }

    const distance = sameColumn ? Math.abs(enemyCell.y - playerCell.y) : Math.abs(enemyCell.x - playerCell.x);
    if (distance > ENEMY_LINE_OF_SIGHT_CELLS) {
      return false;
    }

    const stepX = sameRow ? Math.sign(playerCell.x - enemyCell.x) : 0;
    const stepY = sameColumn ? Math.sign(playerCell.y - enemyCell.y) : 0;
    let x = enemyCell.x + stepX;
    let y = enemyCell.y + stepY;

    while (x !== playerCell.x || y !== playerCell.y) {
      if (!this.floorCellSet.has(`${x},${y}`)) {
        return false;
      }
      x += stepX;
      y += stepY;
    }

    return true;
  }

  startCombat(enemy = null) {
    if (this.combatStarting) {
      return;
    }

    this.combatStarting = true;
    this.player.setVelocity(0, 0);
    this.saveEnemyReturnPositions(enemy?.enemyId ?? null);
    if (this.enemies) {
      this.enemies.getChildren().forEach((enemySprite) => enemySprite.setVelocity(0, 0));
    }

    const enemyStats = { ...(enemy?.enemyStats ?? ENEMY_TYPES[0]) };
    const playerStats = { ...getPlaytestCombatantState() };

    this.scene.start('combat', {
      playerStats,
      enemyStats,
      layoutState: this.layoutState,
      returnContext: {
        returnX: this.returnX,
        returnY: this.returnY,
        layoutState: this.layoutState,
        dungeonSpawnX: this.player.x,
        dungeonSpawnY: this.player.y,
        defeatedEnemyId: enemy?.enemyId ?? null,
      },
    });
  }

  regenerateDungeon() {
    this.scene.restart({
      returnX: this.returnX,
      returnY: this.returnY,
      completionStatus: this.completionStatus,
      layoutState: this.pickDungeonLayoutFromPool(),
    });
  }

  switchDungeonByOffset(offset) {
    const currentIndex = this.layoutState.poolIndex ?? 0;
    const nextIndex = Phaser.Math.Wrap(currentIndex + offset, 0, this.getDungeonPoolSize());
    this.restartWithDungeonIndex(nextIndex);
  }

  restartWithDungeonIndex(index) {
    this.scene.restart({
      returnX: this.returnX,
      returnY: this.returnY,
      completionStatus: this.completionStatus,
      dungeonIndex: index,
      layoutState: this.pickDungeonLayoutFromPool(index),
    });
  }

  handleDungeonNumberInput() {
    for (const key of this.digitKeys) {
      if (!Phaser.Input.Keyboard.JustDown(key)) {
        continue;
      }

      const digit = DIGIT_KEY_CODES.get(key.keyCode);
      if (digit === undefined) {
        return false;
      }

      this.dungeonNumberBuffer = `${this.dungeonNumberBuffer}${digit}`.slice(-2);

      if (this.dungeonNumberBufferTimer) {
        this.dungeonNumberBufferTimer.remove(false);
      }

      this.dungeonNumberBufferTimer = this.time.delayedCall(240, () => {
        const requestedNumber = Number(this.dungeonNumberBuffer);
        this.dungeonNumberBuffer = '';
        if (!Number.isInteger(requestedNumber) || requestedNumber < 1) {
          return;
        }

        const index = requestedNumber - 1;
        if (index >= 0 && index < this.getDungeonPoolSize()) {
          this.restartWithDungeonIndex(index);
        }
      });

      return true;
    }

    return false;
  }

  getDungeonPoolSize() {
    if (dungeonLayoutPool.length === 0) {
      dungeonLayoutPool = this.buildDungeonPool();
      dungeonPoolCursor = 0;
    }

    return dungeonLayoutPool.length;
  }

  pickDungeonLayoutFromPool(forcedIndex = null) {
    if (dungeonLayoutPool.length === 0) {
      dungeonLayoutPool = this.buildDungeonPool();
      dungeonPoolCursor = 0;
    }

    const poolIndex = Number.isInteger(forcedIndex)
      ? Phaser.Math.Wrap(forcedIndex, 0, dungeonLayoutPool.length)
      : dungeonPoolCursor % dungeonLayoutPool.length;
    const layout = dungeonLayoutPool[poolIndex];
    dungeonPoolCursor = (poolIndex + 1) % dungeonLayoutPool.length;
    return this.cloneLayoutState(layout, poolIndex);
  }

  buildDungeonPool() {
    const curatedLayouts = buildDungeonLayoutsFromBlueprints(
      curatedDungeonPool?.dungeons ?? [],
      GRID_COLS,
      GRID_ROWS,
    );

    if (curatedLayouts.length > 0) {
      return curatedLayouts.slice(0, ACTIVE_CURATED_DUNGEON_COUNT);
    }

    const fallbackPool = [];
    for (let i = 0; i < FALLBACK_DUNGEON_POOL_SIZE; i += 1) {
      fallbackPool.push(this.generateDungeonLayout());
    }

    return fallbackPool;
  }

  cloneLayoutState(layoutState, poolIndex = 0) {
    return {
      id: layoutState.id,
      name: layoutState.name,
      poolIndex,
      blockers: layoutState.blockers.map((cell) => ({ ...cell })),
      floorCells: layoutState.floorCells.map((cell) => ({ ...cell })),
      rooms: layoutState.rooms.map((room) => ({ ...room })),
      spawnCell: { ...layoutState.spawnCell },
      tileTheme: layoutState.tileTheme,
      defeatedEnemyIds: [...(layoutState.defeatedEnemyIds ?? [])],
      enemyPositions: Object.fromEntries(
        Object.entries(layoutState.enemyPositions ?? {}).map(([enemyId, position]) => [
          enemyId,
          { ...position },
        ]),
      ),
      enemyCount: layoutState.enemyCount ?? 0,
      encounterCompleted: layoutState.encounterCompleted ?? false,
      clearRecorded: layoutState.clearRecorded ?? false,
      lastChestRewardText: layoutState.lastChestRewardText ?? '',
      chests: (layoutState.chests ?? this.buildChestPlacements(layoutState.rooms, layoutState.spawnCell, layoutState.tileTheme)).map((chest) => ({
        id: chest.id,
        x: chest.x,
        y: chest.y,
        opened: chest.opened ?? false,
        rewards: chest.rewards.map((reward) => ({ ...reward })),
      })),
    };
  }

  returnToOverworld() {
    if (this.returning) {
      return;
    }

    this.returning = true;
    recordDungeonClear(this.layoutState);
    this.scene.start('overworld', {
      spawnX: this.returnX,
      spawnY: this.returnY,
      dungeonCompletionStatus: this.layoutState.encounterCompleted ? 'complete' : this.completionStatus,
      rewardSummaryText: this.layoutState.lastChestRewardText ?? '',
    });
  }

  buildChestPlacements(rooms, spawnCell, tileTheme = 'classic') {
    const candidateRooms = rooms
      .map((room) => ({
        room,
        center: this.roomCenter(room),
      }))
      .filter(({ center }) => center.x !== spawnCell.x || center.y !== spawnCell.y)
      .filter(({ room }) => room.w >= 4 && room.h >= 4)
      .sort((a, b) => {
        const distanceA = Phaser.Math.Distance.Between(a.center.x, a.center.y, spawnCell.x, spawnCell.y);
        const distanceB = Phaser.Math.Distance.Between(b.center.x, b.center.y, spawnCell.x, spawnCell.y);
        return distanceB - distanceA;
      });

    const chestCount = Phaser.Math.Clamp(candidateRooms.length >= 4 ? 2 : 1, 1, 2);
    const chests = [];

    for (let index = 0; index < candidateRooms.length && chests.length < chestCount; index += 1) {
      const roomEntry = candidateRooms[index * 2] ?? candidateRooms[index];
      if (!roomEntry) {
        continue;
      }

      const { room, center } = roomEntry;
      const anchor = index % 2 === 0
        ? { x: room.x + room.w - 2, y: room.y + room.h - 2 }
        : { x: room.x + 1, y: room.y + room.h - 2 };
      const x = Phaser.Math.Clamp(anchor.x, room.x + 1, room.x + room.w - 2);
      const y = Phaser.Math.Clamp(anchor.y, room.y + 1, room.y + room.h - 2);

      if (Phaser.Math.Distance.Between(x, y, spawnCell.x, spawnCell.y) < 8) {
        continue;
      }

      chests.push({
        id: `chest-${index + 1}`,
        x,
        y,
        opened: false,
        rewards: this.buildChestRewards(tileTheme, index),
      });
    }

    return chests;
  }

  buildChestRewards(tileTheme, chestIndex) {
    const itemId = tileTheme === 'undead'
      ? INVENTORY_ITEM_DEFS.crystalShard.id
      : INVENTORY_ITEM_DEFS.ironOre.id;

    const rewards = [
      {
        itemId,
        quantity: chestIndex === 0 ? 1 : 2,
      },
    ];

    if (chestIndex === 0) {
      rewards.unshift({
        itemId: INVENTORY_ITEM_DEFS.fieldTonic.id,
        quantity: 1,
      });
    } else {
      rewards.unshift({
        itemId: INVENTORY_ITEM_DEFS.slimeJelly.id,
        quantity: 1,
      });
    }

    return rewards;
  }

  generateDungeonLayout() {
    const targetRooms = Phaser.Math.Between(ROOM_MIN_COUNT, ROOM_MAX_COUNT);
    const carved = Array.from({ length: GRID_ROWS }, () => Array.from({ length: GRID_COLS }, () => false));
    const rooms = [];

    let attempts = 0;
    while (rooms.length < targetRooms && attempts < 500) {
      attempts += 1;

      const width = Phaser.Math.Between(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
      const height = Phaser.Math.Between(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
      const x = Phaser.Math.Between(1, GRID_COLS - width - 2);
      const y = Phaser.Math.Between(1, GRID_ROWS - height - 2);
      const candidate = { x, y, w: width, h: height };

      if (this.roomOverlaps(rooms, candidate)) {
        continue;
      }

      this.carveRect(carved, candidate.x, candidate.y, candidate.w, candidate.h);
      rooms.push(candidate);
    }

    if (rooms.length === 0) {
      const fallback = { x: 2, y: 2, w: 8, h: 6 };
      this.carveRect(carved, fallback.x, fallback.y, fallback.w, fallback.h);
      rooms.push(fallback);
    }

    const sortedRooms = [...rooms].sort((a, b) => (a.x + a.w / 2) - (b.x + b.w / 2));

    for (let i = 0; i < sortedRooms.length - 1; i += 1) {
      const start = this.roomCenter(sortedRooms[i]);
      const end = this.roomCenter(sortedRooms[i + 1]);
      this.carveCorridor(carved, start, end);
    }

    const spawnRoom = sortedRooms[0];
    const spawnCell = this.roomCenter(spawnRoom);

    const blockers = [];
    const floorCells = [];

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const edge = row === 0 || col === 0 || row === GRID_ROWS - 1 || col === GRID_COLS - 1;
        const isFloor = !edge && carved[row][col];

        if (isFloor) {
          floorCells.push({ x: col, y: row });
        } else {
          blockers.push({ x: col, y: row });
        }
      }
    }

    const tileTheme = Math.random() < 0.35 ? 'undead' : 'classic';

    return {
      id: `generated-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      name: 'Generated Fallback Dungeon',
      blockers,
      floorCells,
      rooms: sortedRooms,
      spawnCell,
      tileTheme,
      encounterCompleted: false,
      clearRecorded: false,
      lastChestRewardText: '',
      chests: this.buildChestPlacements(sortedRooms, spawnCell, tileTheme),
    };
  }

  isInsideAnyRoom(cellX, cellY) {
    return this.layoutState.rooms.some((room) => {
      return cellX >= room.x && cellX < room.x + room.w && cellY >= room.y && cellY < room.y + room.h;
    });
  }

  roomOverlaps(existingRooms, candidate) {
    return existingRooms.some((room) => {
      return !(
        candidate.x + candidate.w + 1 < room.x ||
        candidate.x > room.x + room.w + 1 ||
        candidate.y + candidate.h + 1 < room.y ||
        candidate.y > room.y + room.h + 1
      );
    });
  }

  carveRect(carved, x, y, width, height) {
    for (let row = y; row < y + height; row += 1) {
      for (let col = x; col < x + width; col += 1) {
        carved[row][col] = true;
      }
    }
  }

  carveCorridor(carved, start, end) {
    let x = start.x;
    let y = start.y;

    while (x !== end.x) {
      carved[y][x] = true;
      x += x < end.x ? 1 : -1;
    }

    while (y !== end.y) {
      carved[y][x] = true;
      y += y < end.y ? 1 : -1;
    }

    carved[y][x] = true;
  }

  roomCenter(room) {
    return {
      x: Math.floor(room.x + room.w / 2),
      y: Math.floor(room.y + room.h / 2),
    };
  }

  getPlayerCellKey() {
    const cell = this.worldToCell(this.player.x, this.player.y);
    return `${cell.x},${cell.y}`;
  }

  worldToCell(worldX, worldY) {
    const x = Phaser.Math.Clamp(Math.floor((worldX - GRID_OFFSET_X) / TILE_SIZE), 0, GRID_COLS - 1);
    const y = Phaser.Math.Clamp(Math.floor((worldY - GRID_OFFSET_Y) / TILE_SIZE), 0, GRID_ROWS - 1);
    return { x, y };
  }

  cellToWorld(cellX, cellY) {
    return {
      x: GRID_OFFSET_X + cellX * TILE_SIZE + TILE_SIZE / 2,
      y: GRID_OFFSET_Y + cellY * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  createPlayerAnimations() {
    if (!this.anims.exists('walk-down')) {
      this.anims.create({
        key: 'walk-down',
        frames: this.anims.generateFrameNumbers('witch-kitty', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!this.anims.exists('walk-up')) {
      this.anims.create({
        key: 'walk-up',
        frames: this.anims.generateFrameNumbers('witch-kitty', { start: 4, end: 7 }),
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!this.anims.exists('walk-left')) {
      this.anims.create({
        key: 'walk-left',
        frames: this.anims.generateFrameNumbers('witch-kitty', { start: 8, end: 11 }),
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!this.anims.exists('walk-right')) {
      this.anims.create({
        key: 'walk-right',
        frames: this.anims.generateFrameNumbers('witch-kitty', { start: 12, end: 15 }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  getIdleFrame(direction) {
    if (direction === 'up') {
      return 4;
    }

    if (direction === 'left') {
      return 8;
    }

    if (direction === 'right') {
      return 12;
    }

    return 0;
  }

  hash2d(x, y) {
    return (x * 73856093 + y * 19349663) >>> 0;
  }
}
