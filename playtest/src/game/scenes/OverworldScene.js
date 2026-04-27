import Phaser from 'phaser';
import { createOverworldLayout, TileKinds } from '../overworld/overworldLayout';
import { DeveloperModeController } from '../editor/DeveloperModeController';
import { loadDevAssetRegistry } from '../editor/devAssetRegistry';
import { InventoryOverlay } from '../ui/InventoryOverlay';
import { getPlaytestInventoryState, getPlaytestProgressionSummary } from '../playtestProgression';

const PLAYER_SPEED = 180;
const SPRINT_MULTIPLIER = 1.85;
const HUD_DEPTH = 1000;
const SHOW_COLLISION_OVERLAY = false;

export class OverworldScene extends Phaser.Scene {
  constructor() {
    super('overworld');
  }

  create(data) {
    this.dungeonCompletionStatus = data?.dungeonCompletionStatus ?? null;
    this.rewardSummaryText = data?.rewardSummaryText ?? '';
    this.layout = createOverworldLayout();
    this.cameras.main.setBackgroundColor(0x9bad76);

    this.renderGroundLayer();
    this.renderTransitionLayer();
    this.renderPondShoreLayer();
    this.renderGroundDetailLayer();
    this.renderAtmosphereLayer();
    if (SHOW_COLLISION_OVERLAY) {
      this.renderCollisionLayer();
    }
    this.renderDecorLayer();
    this.renderAmbientLifeLayer();
    this.renderForegroundLayer();
    this.renderTownNpcs();
    this.renderLandmarks();
    this.renderDungeonPortal();

    this.physics.world.setBounds(0, 0, this.layout.worldWidth, this.layout.worldHeight);
    this.cameras.main.setBounds(0, 0, this.layout.worldWidth, this.layout.worldHeight);

    const spawnX = data?.spawnX ?? this.layout.spawnWorld.x;
    const spawnY = data?.spawnY ?? this.layout.spawnWorld.y;
    this.player = this.physics.add.sprite(spawnX, spawnY, 'witch-kitty').setScale(0.6);
    this.player.setFrame(0);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(450);
    this.player.body.setSize(this.player.width * 0.5, this.player.height * 0.7);

    this.createPlayerAnimations();
    this.lastDirection = 'down';

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.obstacles = this.physics.add.staticGroup();
    this.buildCollisionBodies();
    this.physics.add.collider(this.player, this.obstacles);
    const audit = this.runTraversalAudit();

    this.dungeonEntry = this.add.zone(
      this.layout.dungeonEntryWorld.x,
      this.layout.dungeonEntryWorld.y,
      this.layout.dungeonEntryZoneSize.width,
      this.layout.dungeonEntryZoneSize.height,
    );
    this.physics.add.existing(this.dungeonEntry, true);

    this.keys = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.devModeController = new DeveloperModeController(this, {
      sceneLabel: 'Overworld',
      tileSize: this.layout.tileSize,
      cols: this.layout.cols,
      rows: this.layout.rows,
      worldWidth: this.layout.worldWidth,
      worldHeight: this.layout.worldHeight,
      registry: loadDevAssetRegistry('overworld', this.textures),
    });

    this.add.text(16, 16, 'Overworld: outskirts -> town route, Shift sprint, E at gate', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(HUD_DEPTH);

    this.enterPrompt = this.add
      .text(16, 48, 'Press E to enter dungeon', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#d9ffb8',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(false);

    this.completionLabel = this.add
      .text(16, 80, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#fff7cc',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(false);

    this.ambientLabel = this.add
      .text(16, 112, `Ambient loops: ${this.layout.ambientItems.length}/35`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#b8f4ff',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.auditLabel = this.add
      .text(16, 136, audit.message, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: audit.pass ? '#c8ffbc' : '#ffbcbc',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    const progressionSummary = getPlaytestProgressionSummary();
    const inventoryCount = getPlaytestInventoryState().items.reduce((sum, item) => sum + (item?.quantity ?? 0), 0);

    this.progressionLabel = this.add
      .text(16, 160, `Progression: ${progressionSummary.dungeonClears} clears | ${inventoryCount} total loot`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffd98e',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.rewardLabel = this.add
      .text(16, 184, this.rewardSummaryText ? `Latest reward: ${this.rewardSummaryText}` : 'Latest reward: none yet', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c8ffbc',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.inventoryOverlay = new InventoryOverlay(this, getPlaytestInventoryState(), {
      title: 'Field Inventory',
      subtitle: 'I / Tab toggle | Arrow keys browse | Close to resume movement',
    });

    if (this.dungeonCompletionStatus === 'complete') {
      this.completionLabel.setText('Dungeon status: encounter completed.').setVisible(true);
    } else if (this.dungeonCompletionStatus === 'failed') {
      this.completionLabel.setText('Dungeon status: defeated, try again.').setVisible(true);
    }

    this.createMiniMap();

    this.portalZoneMarker = this.add
      .rectangle(
        this.layout.dungeonEntryWorld.x,
        this.layout.dungeonEntryWorld.y,
        this.layout.dungeonEntryZoneSize.width,
        this.layout.dungeonEntryZoneSize.height,
        0x4a7f2d,
        0.08,
      )
      .setDepth(419)
      .setStrokeStyle(2, 0xd7f171, 0.55);
  }

  update() {
    const editorHasFocus = this.devModeController?.update() ?? false;
    if (editorHasFocus) {
      if (!this.editorCameraDetached) {
        this.cameras.main.stopFollow();
        this.editorCameraDetached = true;
      }
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      this.updateMiniMap();
      return;
    }

    if (this.editorCameraDetached) {
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.editorCameraDetached = false;
    }

    if (this.inventoryOverlay?.update()) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      this.updateMiniMap();
      return;
    }

    const left = this.keys.left.isDown || this.wasd.A.isDown;
    const right = this.keys.right.isDown || this.wasd.D.isDown;
    const up = this.keys.up.isDown || this.wasd.W.isDown;
    const down = this.keys.down.isDown || this.wasd.S.isDown;

    const dx = Number(right) - Number(left);
    const dy = Number(down) - Number(up);
    const speed = this.shiftKey.isDown ? PLAYER_SPEED * SPRINT_MULTIPLIER : PLAYER_SPEED;
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(speed);

    this.player.setVelocity(direction.x || 0, direction.y || 0);
    this.updateMiniMap();

    const inDungeonZone = this.physics.overlap(this.player, this.dungeonEntry);
    this.enterPrompt.setVisible(inDungeonZone);

    if (inDungeonZone && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.scene.start('dungeon', {
        returnX: this.layout.spawnWorld.x,
        returnY: this.layout.spawnWorld.y,
      });
      return;
    }

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

  renderGroundLayer() {
    for (let y = 0; y < this.layout.rows; y += 1) {
      for (let x = 0; x < this.layout.cols; x += 1) {
        const tile = this.layout.ground[y][x];
        const worldX = x * this.layout.tileSize + this.layout.tileSize / 2;
        const worldY = y * this.layout.tileSize + this.layout.tileSize / 2;

        const texture = this.getGroundTextureForCell(tile, x, y);
        const tint = this.getGroundTintForCell(tile, x, y);

        if (!texture) {
          continue;
        }

        const groundImage = this.add
          .image(worldX, worldY, texture)
          .setDisplaySize(this.layout.tileSize, this.layout.tileSize)
          .setDepth(0)
          .setAlpha(tile === TileKinds.GROUND_WATER ? 0.62 : 0.98)
          .setTint(tint);
        groundImage.setFlipX((this.hash2d(x + 5, y + 11) & 1) === 1);
        groundImage.setFlipY((this.hash2d(x + 13, y + 7) & 2) === 2);
      }
    }
  }

  getGroundTextureForCell(tile, x, y) {
    const grain = this.hash2d(x, y);

    if (tile === TileKinds.GROUND_PATH) {
      const pathTextures = ['overworld-path-a', 'overworld-path-b', 'overworld-path-c', 'overworld-path-d'];
      return pathTextures[grain % pathTextures.length];
    }

    if (tile === TileKinds.GROUND_TOWN) {
      return 'overworld-town-tile';
    }

    if (tile === TileKinds.GROUND_TRANSITION) {
      const transitionTextures = ['overworld-transition-a', 'overworld-transition-b'];
      return transitionTextures[grain % transitionTextures.length];
    }

    if (tile === TileKinds.GROUND_WATER) {
      return 'overworld-field-b';
    }

    const fieldTextures = ['overworld-field-a', 'overworld-field-b', 'overworld-field-c'];
    return fieldTextures[grain % fieldTextures.length];
  }

  getGroundTintForCell(tile, x, y) {
    const grain = this.hash2d(x + 17, y + 29) % 5;

    if (tile === TileKinds.GROUND_PATH) {
      const tints = [0xdab78e, 0xcfab7f, 0xc8a173, 0xd2b183, 0xcfa879];
      return tints[grain];
    }

    if (tile === TileKinds.GROUND_TOWN) {
      const tints = [0xd9c09c, 0xcfb38c, 0xc7aa82, 0xd5bc96, 0xcfb28d];
      return tints[grain];
    }

    if (tile === TileKinds.GROUND_TRANSITION) {
      const tints = [0xb9bf84, 0xadb673, 0xb4bc7d, 0xaeb878, 0xb7bf83];
      return tints[grain];
    }

    if (tile === TileKinds.GROUND_WATER) {
      const tints = [0x7fa58d, 0x789f8a, 0x719988, 0x83aa93, 0x789d86];
      return tints[grain];
    }

    const tints = [0xa3bd85, 0x97b578, 0x8faf70, 0x9db985, 0x95b174];
    return tints[grain];
  }

  renderTransitionLayer() {
    const graphics = this.add.graphics();
    graphics.setDepth(150);

    for (let y = 0; y < this.layout.rows; y += 1) {
      for (let x = 0; x < this.layout.cols; x += 1) {
        if (this.layout.ground[y][x] !== TileKinds.GROUND_TRANSITION) {
          continue;
        }

        const worldX = x * this.layout.tileSize;
        const worldY = y * this.layout.tileSize;
        graphics.fillStyle(0xd2c181, 0.2);
        graphics.fillRect(worldX + 6, worldY + 6, this.layout.tileSize - 12, this.layout.tileSize - 12);
      }
    }
  }

  renderPondShoreLayer() {
    const pondCells = this.layout.pondCells ?? [];
    if (pondCells.length === 0) {
      return;
    }

    const waterKeys = new Set(pondCells.map((cell) => `${cell.x},${cell.y}`));
    const graphics = this.add.graphics().setDepth(20);
    const waterGraphics = this.add.graphics().setDepth(22);
    const minX = Math.min(...pondCells.map((cell) => cell.x));
    const maxX = Math.max(...pondCells.map((cell) => cell.x));
    const minY = Math.min(...pondCells.map((cell) => cell.y));
    const maxY = Math.max(...pondCells.map((cell) => cell.y));
    const pondCenterX = (minX + maxX + 1) * this.layout.tileSize / 2;
    const pondCenterY = (minY + maxY + 1) * this.layout.tileSize / 2;
    const pondWidth = (maxX - minX + 1) * this.layout.tileSize;
    const pondHeight = (maxY - minY + 1) * this.layout.tileSize;

    graphics.fillStyle(0x566941, 0.28);
    graphics.fillEllipse(pondCenterX, pondCenterY + 10, pondWidth * 1.12, pondHeight * 1.02);
    graphics.fillStyle(0xc0b579, 0.46);
    graphics.fillEllipse(pondCenterX, pondCenterY + 4, pondWidth * 1.02, pondHeight * 0.9);
    waterGraphics.fillStyle(0x4f95aa, 0.82);
    waterGraphics.fillEllipse(pondCenterX, pondCenterY + 2, pondWidth * 0.86, pondHeight * 0.68);
    waterGraphics.fillStyle(0x77bfd1, 0.26);
    waterGraphics.fillEllipse(pondCenterX - 20, pondCenterY - 8, pondWidth * 0.46, pondHeight * 0.22);
    waterGraphics.fillStyle(0x2f7187, 0.2);
    waterGraphics.fillEllipse(pondCenterX + 18, pondCenterY + 16, pondWidth * 0.55, pondHeight * 0.2);

    for (const cell of pondCells) {
      const x = cell.x * this.layout.tileSize;
      const y = cell.y * this.layout.tileSize;
      const centerX = x + this.layout.tileSize / 2;
      const centerY = y + this.layout.tileSize / 2;
      const grain = this.hash2d(cell.x + 503, cell.y + 211);
      const nearTop = !waterKeys.has(`${cell.x},${cell.y - 1}`);
      const nearBottom = !waterKeys.has(`${cell.x},${cell.y + 1}`);
      const nearLeft = !waterKeys.has(`${cell.x - 1},${cell.y}`);
      const nearRight = !waterKeys.has(`${cell.x + 1},${cell.y}`);

      if (nearTop) {
        graphics.fillStyle(0xd4c58f, 0.32);
        graphics.fillEllipse(centerX, y + 4, this.layout.tileSize * 0.82, 7 + (grain % 3));
      }

      if (nearBottom) {
        graphics.fillStyle(0x6f8b57, 0.28);
        graphics.fillEllipse(centerX, y + this.layout.tileSize - 3, this.layout.tileSize * 0.8, 7 + (grain % 3));
      }

      if (nearLeft) {
        graphics.fillStyle(0x7d9d64, 0.22);
        graphics.fillEllipse(x + 3, centerY, 7 + (grain % 2), this.layout.tileSize * 0.72);
      }

      if (nearRight) {
        graphics.fillStyle(0x9faa75, 0.22);
        graphics.fillEllipse(x + this.layout.tileSize - 3, centerY, 7 + (grain % 2), this.layout.tileSize * 0.72);
      }
    }

    for (let i = 0; i < 8; i += 1) {
      const rx = pondCenterX - pondWidth * 0.28 + i * pondWidth * 0.08;
      const ry = pondCenterY - 4 + ((i % 3) - 1) * 18;
      waterGraphics.fillStyle(0xbce5ef, 0.16);
      waterGraphics.fillEllipse(rx, ry, 18 + (i % 3) * 6, 3);
    }
  }

  renderGroundDetailLayer() {
    for (let y = 0; y < this.layout.rows; y += 1) {
      for (let x = 0; x < this.layout.cols; x += 1) {
        const tile = this.layout.ground[y][x];
        const grain = this.hash2d(x + 91, y + 47);
        const worldX = x * this.layout.tileSize + this.layout.tileSize / 2;
        const worldY = y * this.layout.tileSize + this.layout.tileSize / 2;

        if (tile === TileKinds.GROUND_PATH && grain % 9 === 0) {
          this.add
            .ellipse(worldX + ((grain % 5) - 2), worldY + ((grain >> 3) % 4) + 7, 6, 3, 0x8f6f46, 0.35)
            .setDepth(18);
          continue;
        }

        if (tile === TileKinds.GROUND_TRANSITION && grain % 11 === 0) {
          this.add
            .ellipse(worldX + ((grain % 3) - 1), worldY + 6, 5, 2, 0xb6c07f, 0.28)
            .setDepth(17);
          continue;
        }

        if (tile === TileKinds.GROUND_WATER && grain % 19 === 0) {
          this.add
            .ellipse(worldX, worldY + ((grain % 3) - 1), 12 + (grain % 4), 2, 0xbfe4f6, 0.16)
            .setDepth(14);
        }
      }
    }
  }

  renderAtmosphereLayer() {
    const worldMidX = this.layout.worldWidth / 2;
    const worldMidY = this.layout.worldHeight / 2;

    // Soft daylight wash to reduce flatness while keeping readability.
    this.add
      .ellipse(worldMidX - 120, worldMidY - 220, this.layout.worldWidth * 0.95, this.layout.worldHeight * 0.8, 0xfff4d4, 0.07)
      .setDepth(190);

    this.add
      .ellipse(worldMidX + 220, worldMidY + 120, this.layout.worldWidth * 0.8, this.layout.worldHeight * 0.72, 0x8fc8e0, 0.05)
      .setDepth(191);

    for (let i = 0; i < 18; i += 1) {
      const xCell = 6 + i * 4;
      const yCell = 8 + ((i * 3) % 18);
      const worldX = xCell * this.layout.tileSize;
      const worldY = yCell * this.layout.tileSize;
      const alpha = 0.035 + (this.hash2d(xCell, yCell) % 8) * 0.004;

      this.add
        .ellipse(worldX, worldY, 140, 52, 0xffffff, alpha)
        .setDepth(192);
    }
  }

  renderCollisionLayer() {
    const graphics = this.add.graphics();
    graphics.setDepth(200);

    for (let y = 0; y < this.layout.rows; y += 1) {
      for (let x = 0; x < this.layout.cols; x += 1) {
        if (!this.layout.blocked[y][x]) {
          continue;
        }

        const worldX = x * this.layout.tileSize;
        const worldY = y * this.layout.tileSize;
        graphics.fillStyle(0x2a1f16, 0.14);
        graphics.fillRect(worldX, worldY, this.layout.tileSize, this.layout.tileSize);
        graphics.lineStyle(1, 0xa78662, 0.5);
        graphics.strokeRect(worldX + 1, worldY + 1, this.layout.tileSize - 2, this.layout.tileSize - 2);
      }
    }
  }

  renderDecorLayer() {
    for (const item of this.layout.decorItems) {
      if (item.layer !== 'decor') {
        continue;
      }

      const worldX = item.x * this.layout.tileSize + this.layout.tileSize / 2;
      const worldY = item.y * this.layout.tileSize + this.layout.tileSize / 2;
      const grain = this.hash2d(item.x, item.y);
      const xJitter = (grain % 5) - 2;
      const yJitter = ((grain >> 3) % 5) - 2;

      if (item.kind === 'flower') {
        this.add
          .image(worldX + xJitter, worldY + 6 + yJitter, grain % 2 === 0 ? 'overworld-grass-1' : 'overworld-grass-6')
          .setDisplaySize(20, 15)
          .setDepth(306)
          .setTint(grain % 2 === 0 ? 0xf0d38c : 0xd8a1db)
          .setAlpha(0.94);
        continue;
      }

      if (item.kind === 'reeds') {
        this.add.rectangle(worldX - 5, worldY + 7, 3, 20, 0x526d38, 0.9).setRotation(-0.22).setDepth(306);
        this.add.rectangle(worldX, worldY + 6, 3, 22, 0x6b7b3d, 0.9).setDepth(307);
        this.add.rectangle(worldX + 6, worldY + 7, 3, 19, 0x586f36, 0.9).setRotation(0.2).setDepth(306);
        this.add.ellipse(worldX, worldY + 16, 22, 8, 0x000000, 0.13).setDepth(305);
        continue;
      }

      if (item.kind === 'town-sign') {
        this.add.rectangle(worldX, worldY + 8, 4, 24, 0x6b452b, 1).setDepth(307);
        this.add.rectangle(worldX, worldY - 5, 26, 14, 0x9f7045, 1).setStrokeStyle(2, 0x4d321f, 0.9).setDepth(308);
        this.add.rectangle(worldX, worldY - 5, 17, 2, 0xe0bd7f, 0.75).setDepth(309);
        continue;
      }

      if (item.kind === 'shrine-lantern') {
        this.add.ellipse(worldX, worldY + 13, 24, 10, 0x000000, 0.2).setDepth(305);
        this.add.rectangle(worldX, worldY + 5, 10, 24, 0x4a5248, 1).setStrokeStyle(2, 0x20261f, 0.85).setDepth(307);
        this.add.circle(worldX, worldY + 1, 7, 0xffd36f, 0.72).setDepth(308);
        this.add.circle(worldX, worldY + 1, 16, 0xffd36f, 0.16).setDepth(306);
        continue;
      }

      let grassTexture = grain % 2 === 0 ? 'overworld-grass-1' : 'overworld-grass-6';
      let width = 22 + (grain % 5);
      let height = 16 + (grain % 3);

      if (item.kind === 'portal-stone' || item.kind === 'pond-stone') {
        grassTexture = 'overworld-stone-3';
        width = item.kind === 'portal-stone' ? 30 : 24;
        height = item.kind === 'portal-stone' ? 22 : 18;
      }

      this.add
        .image(worldX + xJitter, worldY + 4 + yJitter, grassTexture)
        .setDisplaySize(width, height)
        .setDepth(306)
        .setAlpha(item.kind === 'portal-stone' ? 0.98 : 0.9);
    }
  }

  renderAmbientLifeLayer() {
    for (const item of this.layout.ambientItems) {
      const worldX = item.x * this.layout.tileSize + this.layout.tileSize / 2;
      const worldY = item.y * this.layout.tileSize + this.layout.tileSize / 2;

      if (item.kind === 'foliage-sway') {
        const leaf = this.add
          .image(worldX, worldY + 4, 'overworld-grass-6')
          .setDisplaySize(20, 16)
          .setDepth(312);
        this.tweens.add({
          targets: leaf,
          x: worldX + 3,
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
        continue;
      }

      if (item.kind === 'torch-fx') {
        const glow = this.add.circle(worldX, worldY + 2, 7, 0xffda6f, 0.33).setDepth(318);
        this.tweens.add({
          targets: glow,
          alpha: { from: 0.2, to: 0.48 },
          scale: { from: 0.85, to: 1.2 },
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
        continue;
      }

      if (item.kind === 'water-loop') {
        const ripple = this.add.ellipse(worldX, worldY, 12, 4, 0x9ddaf3, 0.45).setDepth(130);
        this.tweens.add({
          targets: ripple,
          alpha: { from: 0.16, to: 0.5 },
          width: { from: 8, to: 18 },
          duration: 1250,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
        continue;
      }

      if (item.kind === 'critter-loop') {
        const critter = this.add
          .sprite(worldX - 6, worldY + 1, 'slime-idle', 0)
          .setScale(0.18)
          .setDepth(314);
        this.tweens.add({
          targets: critter,
          x: worldX + 6,
          duration: 1700,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
      }
    }
  }

  renderForegroundLayer() {
    for (const item of this.layout.decorItems) {
      if (item.layer !== 'foreground') {
        continue;
      }

      const worldX = item.x * this.layout.tileSize + this.layout.tileSize / 2;
      const worldY = item.y * this.layout.tileSize + this.layout.tileSize / 2;

      if (item.kind === 'guild-hall-exterior') {
        this.add
          .image(worldX, worldY - 20, 'guild-hall-exterior')
          .setDepth(worldY + 150)
          .setScale(0.44);
      } else if (item.kind === 'house-1') {
        this.add
          .image(worldX, worldY - 8, 'overworld-house-1')
          .setDepth(worldY + 120)
          .setScale(0.76);
      } else if (item.kind === 'house-2') {
        this.add
          .image(worldX, worldY - 8, 'overworld-house-2')
          .setDepth(worldY + 120)
          .setScale(0.68);
      } else if (item.kind === 'house-3') {
        this.add
          .image(worldX, worldY - 8, 'overworld-house-3')
          .setDepth(worldY + 120)
          .setScale(0.64);
      } else if (item.kind === 'house-4') {
        this.add
          .image(worldX, worldY - 8, 'overworld-house-4')
          .setDepth(worldY + 120)
          .setScale(0.64);
      } else if (item.kind === 'mega-tree') {
        this.add.ellipse(worldX, worldY + 11, 34, 16, 0x000000, 0.24).setDepth(worldY + 101);
        this.add
          .image(worldX, worldY - 26, 'forest-mega-tree-1')
          .setDepth(worldY + 130)
          .setScale(0.62);
      } else if (item.kind === 'willow-tree') {
        this.add.ellipse(worldX, worldY + 9, 26, 12, 0x000000, 0.2).setDepth(worldY + 101);
        this.add
          .image(worldX, worldY - 12, 'forest-willow-1')
          .setDepth(worldY + 125)
          .setScale(0.88);
      } else if (item.kind === 'tent-1') {
        this.add
          .image(worldX, worldY - 4, 'overworld-tent-1')
          .setDepth(worldY + 110)
          .setScale(0.78);
      } else if (item.kind === 'tent-2') {
        this.add
          .image(worldX, worldY - 4, 'overworld-tent-2')
          .setDepth(worldY + 110)
          .setScale(0.78);
      } else if (item.kind === 'tent-3') {
        this.add
          .image(worldX, worldY - 4, 'overworld-tent-3')
          .setDepth(worldY + 110)
          .setScale(0.78);
      } else if (item.kind === 'tent-4') {
        this.add
          .image(worldX, worldY - 4, 'overworld-tent-4')
          .setDepth(worldY + 110)
          .setScale(0.78);
      } else {
        this.add
          .image(worldX, worldY - 8, 'overworld-house-2')
          .setDepth(worldY + 120)
          .setScale(0.93);
      }
    }
  }

  renderTownNpcs() {
    const npcs = this.layout.townNpcs ?? [];

    for (const npc of npcs) {
      const worldX = npc.x * this.layout.tileSize + this.layout.tileSize / 2;
      const worldY = npc.y * this.layout.tileSize + this.layout.tileSize / 2;
      const pulse = 1200 + ((npc.x * 3 + npc.y) % 5) * 120;

      const actorScale = npc.scale ?? 1.1;
      this.add.ellipse(worldX, worldY + 16, 28, 12, 0x000000, 0.24).setDepth(worldY + 105);

      const actor = this.add
        .sprite(worldX, worldY + 1, npc.sprite, npc.frame ?? 0)
        .setDepth(worldY + 120)
        .setScale(actorScale);

      this.tweens.add({
        targets: actor,
        y: worldY - 2,
        duration: pulse + 160,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });

      const markerColor = npc.markerColor ?? 0xd7e7ff;
      const markerY = worldY - 23;
      const marker = this.add.circle(worldX, markerY, 4, markerColor, 0.86).setDepth(worldY + 130);
      this.add.rectangle(worldX, markerY, 12, 2, markerColor, 0.35).setDepth(worldY + 129);
      this.tweens.add({
        targets: marker,
        alpha: { from: 0.55, to: 0.95 },
        duration: pulse,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    }
  }

  renderLandmarks() {
    for (const point of this.layout.landmarks) {
      const worldX = point.x * this.layout.tileSize + this.layout.tileSize / 2;
      const worldY = point.y * this.layout.tileSize + this.layout.tileSize / 2;

      this.add.circle(worldX, worldY, 5, 0xffed9a, 0.85).setDepth(420);
      this.add
        .text(worldX + 10, worldY - 18, point.label, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#f3f3e2',
          backgroundColor: '#00000077',
          padding: { x: 3, y: 1 },
        })
        .setDepth(420);
    }
  }

  renderDungeonPortal() {
    const x = this.layout.dungeonEntryWorld.x;
    const y = this.layout.dungeonEntryWorld.y;
    const baseDepth = 430;

    this.add.ellipse(x, y + 16, 132, 42, 0x000000, 0.3).setDepth(baseDepth - 3);
    this.add.ellipse(x, y + 12, 112, 38, 0x4d534f, 0.36).setDepth(baseDepth - 2);
    this.add.ellipse(x, y + 7, 88, 34, 0x6cae67, 0.2).setDepth(baseDepth - 1);
    this.add.ellipse(x, y + 1, 58, 76, 0x233044, 0.5).setDepth(baseDepth);
    this.add.ellipse(x, y - 2, 36, 56, 0x79c6e7, 0.28).setDepth(baseDepth + 1);
    this.add.ellipse(x, y - 2, 18, 38, 0xd7f171, 0.36).setDepth(baseDepth + 2);

    this.add
      .rectangle(x, y + 25, 118, 8, 0x38423e, 0.86)
      .setStrokeStyle(1, 0xd7f171, 0.34)
      .setDepth(baseDepth + 3);

    this.add
      .text(x, y + 42, 'E', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#f6ffce',
        backgroundColor: '#1d2d19cc',
        padding: { x: 5, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(baseDepth + 4);
  }

  buildCollisionBodies() {
    for (let y = 0; y < this.layout.rows; y += 1) {
      for (let x = 0; x < this.layout.cols; x += 1) {
        if (!this.layout.blocked[y][x]) {
          continue;
        }

        const worldX = x * this.layout.tileSize + this.layout.tileSize / 2;
        const worldY = y * this.layout.tileSize + this.layout.tileSize / 2;
        const body = this.add.zone(worldX, worldY, this.layout.tileSize, this.layout.tileSize);
        this.physics.add.existing(body, true);
        this.obstacles.add(body);
      }
    }
  }

  createMiniMap() {
    this.miniMapCellPx = 2;
    const viewportWidth = this.scale.width;
    this.miniMapOrigin = {
      x: viewportWidth - this.layout.cols * this.miniMapCellPx - 16,
      y: 16,
    };

    this.miniMapBackground = this.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH + 10);
    this.miniMapDynamic = this.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH + 12);
    this.miniMapFrame = this.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH + 13);

    const width = this.layout.cols * this.miniMapCellPx;
    const height = this.layout.rows * this.miniMapCellPx;

    this.miniMapBackground.fillStyle(0x0a1115, 0.75);
    this.miniMapBackground.fillRect(this.miniMapOrigin.x - 4, this.miniMapOrigin.y - 4, width + 8, height + 8);

    for (let y = 0; y < this.layout.rows; y += 1) {
      for (let x = 0; x < this.layout.cols; x += 1) {
        const tile = this.layout.ground[y][x];
        let color = 0x476b38;

        if (tile === TileKinds.GROUND_PATH) {
          color = 0xc19b67;
        } else if (tile === TileKinds.GROUND_TRANSITION) {
          color = 0x7f8e59;
        } else if (tile === TileKinds.GROUND_TOWN) {
          color = 0xa68054;
        } else if (tile === TileKinds.GROUND_WATER) {
          color = 0x396f8e;
        }

        this.miniMapBackground.fillStyle(color, 1);
        this.miniMapBackground.fillRect(
          this.miniMapOrigin.x + x * this.miniMapCellPx,
          this.miniMapOrigin.y + y * this.miniMapCellPx,
          this.miniMapCellPx,
          this.miniMapCellPx,
        );
      }
    }

    this.miniMapFrame.lineStyle(1, 0xffffff, 0.95);
    this.miniMapFrame.strokeRect(this.miniMapOrigin.x - 4, this.miniMapOrigin.y - 4, width + 8, height + 8);

    const gateX = Math.floor(this.layout.dungeonEntryWorld.x / this.layout.tileSize);
    const gateY = Math.floor(this.layout.dungeonEntryWorld.y / this.layout.tileSize);
    this.miniMapDynamic.fillStyle(0x7ee887, 1);
    this.miniMapDynamic.fillRect(
      this.miniMapOrigin.x + gateX * this.miniMapCellPx,
      this.miniMapOrigin.y + gateY * this.miniMapCellPx,
      this.miniMapCellPx + 1,
      this.miniMapCellPx + 1,
    );
  }

  updateMiniMap() {
    if (!this.miniMapDynamic || !this.player?.body) {
      return;
    }

    const cellX = Phaser.Math.Clamp(
      Math.floor(this.player.x / this.layout.tileSize),
      0,
      this.layout.cols - 1,
    );
    const cellY = Phaser.Math.Clamp(
      Math.floor(this.player.y / this.layout.tileSize),
      0,
      this.layout.rows - 1,
    );

    this.miniMapDynamic.clear();

    const gateX = Math.floor(this.layout.dungeonEntryWorld.x / this.layout.tileSize);
    const gateY = Math.floor(this.layout.dungeonEntryWorld.y / this.layout.tileSize);
    this.miniMapDynamic.fillStyle(0x7ee887, 1);
    this.miniMapDynamic.fillRect(
      this.miniMapOrigin.x + gateX * this.miniMapCellPx,
      this.miniMapOrigin.y + gateY * this.miniMapCellPx,
      this.miniMapCellPx + 1,
      this.miniMapCellPx + 1,
    );

    this.miniMapDynamic.fillStyle(0xfff2a8, 1);
    this.miniMapDynamic.fillRect(
      this.miniMapOrigin.x + cellX * this.miniMapCellPx,
      this.miniMapOrigin.y + cellY * this.miniMapCellPx,
      this.miniMapCellPx + 1,
      this.miniMapCellPx + 1,
    );
  }

  runTraversalAudit() {
    const { cols, rows, blocked, tileSize, spawnWorld, dungeonEntryWorld } = this.layout;
    const toCell = (worldX, worldY) => {
      return {
        x: Math.floor(worldX / tileSize),
        y: Math.floor(worldY / tileSize),
      };
    };

    const start = toCell(spawnWorld.x, spawnWorld.y);
    const goal = toCell(dungeonEntryWorld.x, dungeonEntryWorld.y);

    if (blocked[start.y]?.[start.x]) {
      return { pass: false, message: 'Traversal audit: FAIL (spawn blocked)' };
    }

    if (blocked[goal.y]?.[goal.x]) {
      return { pass: false, message: 'Traversal audit: FAIL (gate blocked)' };
    }

    const visited = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
    const queue = [{ x: start.x, y: start.y, dist: 0 }];
    visited[start.y][start.x] = true;

    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    while (queue.length > 0) {
      const current = queue.shift();

      if (current.x === goal.x && current.y === goal.y) {
        return {
          pass: true,
          message: `Traversal audit: PASS (${current.dist} cells path, sprint x${SPRINT_MULTIPLIER.toFixed(2)})`,
        };
      }

      for (const dir of dirs) {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        const inBounds = nx >= 0 && ny >= 0 && nx < cols && ny < rows;

        if (!inBounds || visited[ny][nx] || blocked[ny][nx]) {
          continue;
        }

        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny, dist: current.dist + 1 });
      }
    }

    return { pass: false, message: 'Traversal audit: FAIL (no route to gate)' };
  }

  hash2d(x, y) {
    return (x * 73856093 + y * 19349663) >>> 0;
  }
}
