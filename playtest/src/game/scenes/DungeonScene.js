import Phaser from 'phaser';

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

const ROOM_MIN_COUNT = 8;
const ROOM_MAX_COUNT = 12;
const ROOM_MIN_SIZE = 4;
const ROOM_MAX_SIZE = 8;

const FLOOR_FRAMES = [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35];
const UNDEAD_FLOOR_FRAMES = [0, 1, 2, 3, 4, 5, 31, 32, 33, 34, 35, 36, 62, 63, 64, 65, 66, 67];
const WALL_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7];

const ROOM_THEMES = [
  { name: 'storage', frames: [8, 9, 10, 11, 12, 13, 14, 15, 28, 29, 30, 31, 32, 33, 34] },
  { name: 'workshop', frames: [16, 17, 18, 19, 20, 21, 22, 23, 35, 36, 37, 38, 39] },
  { name: 'crypt', frames: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49] },
  { name: 'supply', frames: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59] },
];

const CORRIDOR_PROP_FRAMES = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69];
const UNDEAD_PROP_FRAMES = [120, 121, 122, 123, 124, 125, 126, 127, 160, 161, 162, 163, 164, 165];

const ENCOUNTER_STEP_MIN = 6;
const ENCOUNTER_STEP_GUARANTEE = 30;
const ENCOUNTER_CHANCE = 0.11;

const FIXED_ENEMY = { name: 'Green Slime', maxHp: 24, attack: 6, spriteKey: 'slime-idle' };

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
    this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.keys = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');

    this.layoutState = data?.layoutState ? data.layoutState : this.generateDungeonLayout();
    this.tileTheme = this.layoutState.tileTheme ?? 'classic';

    this.createBackground();
    this.renderLayout(this.layoutState);

    const spawnCell = this.layoutState.spawnCell;
    const spawnPosition = this.cellToWorld(spawnCell.x, spawnCell.y);
    this.spawnPlayer(data?.spawnX ?? spawnPosition.x, data?.spawnY ?? spawnPosition.y);
    this.configureWorldBounds();

    this.createPlayerAnimations();
    this.lastDirection = 'down';
    this.stepsSinceEncounterRoll = 0;
    this.lastCellKey = this.getPlayerCellKey();

    this.physics.add.collider(this.player, this.obstacles);
    this.addInstructionHud();
    this.updateEncounterUi();
  }

  createBackground() {
    this.add.rectangle(DUNGEON_WIDTH / 2, DUNGEON_HEIGHT / 2, DUNGEON_WIDTH, DUNGEON_HEIGHT, 0x080d14, 1);
  }

  configureWorldBounds() {
    this.physics.world.setBounds(0, 0, DUNGEON_WIDTH, DUNGEON_HEIGHT);
    this.cameras.main.setBounds(0, 0, DUNGEON_WIDTH, DUNGEON_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(140, 96);
  }

  addInstructionHud() {
    this.add
      .text(16, 12, 'Dungeon sandbox: WASD/Arrows move, Hold Shift to sprint', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#f4f4f4',
        backgroundColor: '#0000008c',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.add
      .text(16, 40, 'R regenerate layout | Q return overworld', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#c9ddff',
        backgroundColor: '#0000008c',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.statusLabel = this.add
      .text(16, 68, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#d9ffb8',
        backgroundColor: '#0000008c',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.add
      .text(16, 96, 'Random encounters can trigger while exploring rooms/corridors', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffe7a3',
        backgroundColor: '#0000009b',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);
  }

  updateEncounterUi() {
    if (this.layoutState.encounterCompleted) {
      this.statusLabel.setText('Encounter complete: return to overworld or regenerate.');
      return;
    }

    this.statusLabel.setText('Explore dungeon rooms. Encounter may trigger at random.');
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

    for (const floorCell of layoutState.floorCells) {
      const center = this.cellToWorld(floorCell.x, floorCell.y);
      const floorFrames = this.tileTheme === 'undead' ? UNDEAD_FLOOR_FRAMES : FLOOR_FRAMES;
      const floorKey = this.tileTheme === 'undead' ? 'undead-ground-tiles' : 'dungeon-floor-tiles';
      const floorFrame = Phaser.Utils.Array.GetRandom(floorFrames);
      this.add
        .image(center.x, center.y, floorKey, floorFrame)
        .setScale(TILE_SCALE)
        .setAlpha(0.95)
        .setDepth(0);
    }

    for (const room of layoutState.rooms) {
      const roomCenter = this.cellToWorld(room.x + room.w / 2 - 0.5, room.y + room.h / 2 - 0.5);
      this.add
        .rectangle(roomCenter.x, roomCenter.y, room.w * TILE_SIZE, room.h * TILE_SIZE, 0x94b2d6, 0.04)
        .setStrokeStyle(1, 0xa7c4e5, 0.2)
        .setDepth(1);
    }

    this.renderRoomDecor(layoutState.rooms);
    this.renderCorridorDecor(layoutState.floorCells);

    for (const blocker of layoutState.blockers) {
      const center = this.cellToWorld(blocker.x, blocker.y);
      const wallFrame = Phaser.Utils.Array.GetRandom(WALL_FRAMES);
      const wall = this.add
        .image(center.x, center.y, 'dungeon-wall-tiles', wallFrame)
        .setScale(TILE_SCALE)
        .setAlpha(0.98)
        .setDepth(center.y + 20);

      this.physics.add.existing(wall, true);
      this.obstacles.add(wall);
    }
  }

  renderRoomDecor(rooms) {
    for (const room of rooms) {
      const roomArea = room.w * room.h;
      const decorCount = Phaser.Math.Clamp(Math.floor(roomArea * 0.11), 3, 8);
      const theme = Phaser.Utils.Array.GetRandom(ROOM_THEMES);

      let placed = 0;
      let tries = 0;
      while (placed < decorCount && tries < 80) {
        tries += 1;

        const minX = room.w >= 5 ? room.x + 1 : room.x;
        const maxX = room.w >= 5 ? room.x + room.w - 2 : room.x + room.w - 1;
        const minY = room.h >= 5 ? room.y + 1 : room.y;
        const maxY = room.h >= 5 ? room.y + room.h - 2 : room.y + room.h - 1;

        const x = Phaser.Math.Between(minX, maxX);
        const y = Phaser.Math.Between(minY, maxY);
        const key = `${x},${y}`;

        if (!this.floorCellSet.has(key) || this.decorTaken.has(key)) {
          continue;
        }

        this.placeDecorAtCell(x, y, Phaser.Utils.Array.GetRandom(theme.frames), 'dungeon-objects');
        this.decorTaken.add(key);
        placed += 1;
      }
    }
  }

  renderCorridorDecor(floorCells) {
    const corridorCells = floorCells.filter((cell) => !this.isInsideAnyRoom(cell.x, cell.y));
    const desired = Phaser.Math.Clamp(Math.floor(corridorCells.length * 0.02), 6, 20);

    let placed = 0;
    let tries = 0;
    while (placed < desired && tries < 220) {
      tries += 1;
      const cell = Phaser.Utils.Array.GetRandom(corridorCells);
      const key = `${cell.x},${cell.y}`;

      if (!cell || this.decorTaken.has(key)) {
        continue;
      }

      const propKey = this.tileTheme === 'undead' ? 'undead-objects' : 'dungeon-objects';
      const propFrames = this.tileTheme === 'undead' ? UNDEAD_PROP_FRAMES : CORRIDOR_PROP_FRAMES;
      this.placeDecorAtCell(cell.x, cell.y, Phaser.Utils.Array.GetRandom(propFrames), propKey);
      this.decorTaken.add(key);
      placed += 1;
    }
  }

  placeDecorAtCell(cellX, cellY, frame, spriteKey) {
    const center = this.cellToWorld(cellX, cellY);

    this.add
      .ellipse(center.x, center.y + TILE_SIZE * 0.26, TILE_SIZE * 0.6, TILE_SIZE * 0.22, 0x000000, 0.2)
      .setDepth(center.y + 8);

    this.add
      .image(center.x, center.y, spriteKey, frame)
      .setScale(TILE_SCALE)
      .setDepth(center.y + 10);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.generateKey)) {
      this.regenerateDungeon();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
      this.returnToOverworld();
      return;
    }

    this.updateMovement();
    this.tryRandomEncounter();
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

  tryRandomEncounter() {
    if (this.layoutState.encounterCompleted || !this.player.body) {
      return;
    }

    const velocity = this.player.body.velocity;
    if (velocity.lengthSq() < 1) {
      return;
    }

    const nextCellKey = this.getPlayerCellKey();
    if (nextCellKey === this.lastCellKey) {
      return;
    }

    this.lastCellKey = nextCellKey;
    this.stepsSinceEncounterRoll += 1;

    if (this.stepsSinceEncounterRoll < ENCOUNTER_STEP_MIN) {
      return;
    }

    const guaranteed = this.stepsSinceEncounterRoll >= ENCOUNTER_STEP_GUARANTEE;
    const rolled = Math.random() < ENCOUNTER_CHANCE;

    if (!guaranteed && !rolled) {
      return;
    }

    this.startCombat();
  }

  startCombat() {
    const enemyStats = { ...FIXED_ENEMY };

    this.scene.start('combat', {
      playerStats: {
        maxHp: 30,
        attack: 8,
        defendReduction: 4,
      },
      enemyStats,
      returnContext: {
        returnX: this.returnX,
        returnY: this.returnY,
        layoutState: this.layoutState,
        dungeonSpawnX: this.player.x,
        dungeonSpawnY: this.player.y,
      },
    });
  }

  regenerateDungeon() {
    this.scene.restart({
      returnX: this.returnX,
      returnY: this.returnY,
      completionStatus: this.completionStatus,
    });
  }

  returnToOverworld() {
    if (this.returning) {
      return;
    }

    this.returning = true;
    this.scene.start('overworld', {
      spawnX: this.returnX,
      spawnY: this.returnY,
      dungeonCompletionStatus: this.layoutState.encounterCompleted ? 'complete' : this.completionStatus,
    });
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

    return {
      blockers,
      floorCells,
      rooms: sortedRooms,
      spawnCell,
      tileTheme: Math.random() < 0.35 ? 'undead' : 'classic',
      encounterCompleted: false,
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
}
