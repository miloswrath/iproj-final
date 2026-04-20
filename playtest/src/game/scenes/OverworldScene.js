import Phaser from 'phaser';
import { createOverworldLayout, TileKinds } from '../overworld/overworldLayout';
import { DeveloperModeController } from '../editor/DeveloperModeController';
import { loadDevAssetRegistry } from '../editor/devAssetRegistry';

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
    this.layout = createOverworldLayout();
    this.cameras.main.setBackgroundColor(0x9bad76);

    this.renderGroundLayer();
    this.renderTransitionLayer();
    if (SHOW_COLLISION_OVERLAY) {
      this.renderCollisionLayer();
    }
    this.renderDecorLayer();
    this.renderAmbientLifeLayer();
    this.renderForegroundLayer();
    this.renderTownNpcs();
    this.renderLandmarks();

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
      registry: loadDevAssetRegistry('overworld'),
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

    if (this.dungeonCompletionStatus === 'complete') {
      this.completionLabel.setText('Dungeon status: encounter completed.').setVisible(true);
    } else if (this.dungeonCompletionStatus === 'failed') {
      this.completionLabel.setText('Dungeon status: defeated, try again.').setVisible(true);
    }

    this.createMiniMap();

    const marker = this.add.rectangle(
      this.layout.dungeonEntryWorld.x,
      this.layout.dungeonEntryWorld.y,
      this.layout.dungeonEntryZoneSize.width,
      this.layout.dungeonEntryZoneSize.height,
      0x4a7f2d,
      0.48,
    );
    marker.setDepth(420).setStrokeStyle(2, 0xd7f171, 0.95);
  }

  update() {
    const editorHasFocus = this.devModeController?.update() ?? false;
    if (editorHasFocus) {
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

        if (tile === TileKinds.GROUND_WATER) {
          this.add
            .image(worldX, worldY, 'overworld-water-tile')
            .setDisplaySize(this.layout.tileSize, this.layout.tileSize)
            .setDepth(0)
            .setAlpha(0.86)
            .setTint(0x95b7c3);
          continue;
        }

        this.add
          .rectangle(
            worldX,
            worldY,
            this.layout.tileSize,
            this.layout.tileSize,
            this.getGroundFlatColor(tile),
            1,
          )
          .setDepth(0);

        if (tile === TileKinds.GROUND_PATH) {
          this.add
            .image(worldX, worldY, 'overworld-path-a')
            .setDisplaySize(this.layout.tileSize, this.layout.tileSize)
            .setDepth(1)
            .setAlpha(0.14)
            .setTint(0xc6a984);
        }
      }
    }
  }

  getGroundFlatColor(tile) {
    if (tile === TileKinds.GROUND_PATH) {
      return 0xd0b184;
    }

    if (tile === TileKinds.GROUND_TOWN) {
      return 0xc3ad8b;
    }

    if (tile === TileKinds.GROUND_TRANSITION) {
      return 0xb6bc8f;
    }

    if (tile === TileKinds.GROUND_WATER) {
      return 0x95b7c3;
    }

    return 0xa9bb87;
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

      const grassTexture = grain % 2 === 0 ? 'overworld-grass-1' : 'overworld-grass-6';
      this.add
        .image(worldX + xJitter, worldY + 4 + yJitter, grassTexture)
        .setDisplaySize(22 + (grain % 5), 16 + (grain % 3))
        .setDepth(306)
        .setAlpha(0.9);
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
          .image(worldX, worldY - 30, 'guild-hall-exterior')
          .setDepth(worldY + 150)
          .setScale(0.78);
      } else if (item.kind === 'house-1') {
        this.add
          .image(worldX, worldY - 8, 'overworld-house-1')
          .setDepth(worldY + 120)
          .setScale(0.93);
      } else if (item.kind === 'house-2') {
        this.add
          .image(worldX, worldY - 8, 'overworld-house-2')
          .setDepth(worldY + 120)
          .setScale(0.93);
      } else if (item.kind === 'house-3') {
        this.add
          .image(worldX, worldY - 8, 'overworld-house-3')
          .setDepth(worldY + 120)
          .setScale(0.93);
      } else if (item.kind === 'house-4') {
        this.add
          .image(worldX, worldY - 8, 'overworld-house-4')
          .setDepth(worldY + 120)
          .setScale(0.93);
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
          .setScale(0.92);
      } else if (item.kind === 'tent-2') {
        this.add
          .image(worldX, worldY - 4, 'overworld-tent-2')
          .setDepth(worldY + 110)
          .setScale(0.92);
      } else if (item.kind === 'tent-3') {
        this.add
          .image(worldX, worldY - 4, 'overworld-tent-3')
          .setDepth(worldY + 110)
          .setScale(0.92);
      } else if (item.kind === 'tent-4') {
        this.add
          .image(worldX, worldY - 4, 'overworld-tent-4')
          .setDepth(worldY + 110)
          .setScale(0.92);
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

      this.add.ellipse(worldX, worldY + 12, 22, 10, 0x000000, 0.24).setDepth(worldY + 105);

      const actor = this.add
        .sprite(worldX, worldY + 1, npc.sprite, npc.frame ?? 0)
        .setDepth(worldY + 120)
        .setScale(npc.scale ?? 0.86);

      this.tweens.add({
        targets: actor,
        y: worldY - 2,
        duration: pulse + 160,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });

      const markerColor = npc.markerColor ?? 0xd7e7ff;
      const marker = this.add.circle(worldX, worldY - 18, 4, markerColor, 0.86).setDepth(worldY + 130);
      this.add.rectangle(worldX, worldY - 18, 12, 2, markerColor, 0.35).setDepth(worldY + 129);
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