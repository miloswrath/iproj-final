import Phaser from 'phaser';

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 960;
const PLAYER_SPEED = 180;

export class OverworldScene extends Phaser.Scene {
  constructor() {
    super('overworld');
  }

  create(data) {
    this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'overworld-tile').setOrigin(0);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const spawnX = data?.spawnX ?? 120;
    const spawnY = data?.spawnY ?? 120;
    this.player = this.physics.add.sprite(spawnX, spawnY, 'witch-kitty').setScale(0.6);
    this.player.setFrame(0);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(this.player.width * 0.5, this.player.height * 0.7);

    this.createPlayerAnimations();
    this.lastDirection = 'down';

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.obstacles = this.physics.add.staticGroup();
    this.addCollisionWall(450, 260, 1100, 30);
    this.addCollisionWall(240, 520, 30, 520);
    this.addCollisionWall(760, 740, 500, 30);
    this.physics.add.collider(this.player, this.obstacles);

    this.dungeonEntry = this.add.zone(1450, 840, 130, 130);
    this.physics.add.existing(this.dungeonEntry, true);

    this.keys = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.add.text(16, 16, 'Overworld test: move with WASD/Arrows, press E at gate', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    }).setScrollFactor(0);

    this.enterPrompt = this.add
      .text(16, 48, 'Press E to enter dungeon', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#d9ffb8',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setVisible(false);

    const marker = this.add.rectangle(1450, 840, 130, 130, 0x4a7f2d, 0.45);
    marker.setStrokeStyle(2, 0xd7f171, 0.95);
  }

  update() {
    const left = this.keys.left.isDown || this.wasd.A.isDown;
    const right = this.keys.right.isDown || this.wasd.D.isDown;
    const up = this.keys.up.isDown || this.wasd.W.isDown;
    const down = this.keys.down.isDown || this.wasd.S.isDown;

    const dx = Number(right) - Number(left);
    const dy = Number(down) - Number(up);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(PLAYER_SPEED);

    this.player.setVelocity(direction.x || 0, direction.y || 0);

    const inDungeonZone = this.physics.overlap(this.player, this.dungeonEntry);
    this.enterPrompt.setVisible(inDungeonZone);

    if (inDungeonZone && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.scene.start('dungeon', {
        returnX: 170,
        returnY: 170,
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

  addCollisionWall(x, y, width, height) {
    const wall = this.add.rectangle(x, y, width, height, 0x7e3f28, 0.4);
    wall.setStrokeStyle(2, 0xdb8f52, 0.8);
    this.physics.add.existing(wall, true);
    this.obstacles.add(wall);
  }
}