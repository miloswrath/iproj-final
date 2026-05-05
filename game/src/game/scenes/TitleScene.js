import Phaser from 'phaser';
import { resetPlaytestProgressionState } from '../playtestProgression';

const GAME_TITLE = 'Dungeon Loop';
const PANEL_DEPTH = 20;
const TEXT_COLOR = '#fbf0d2';
const ACCENT_COLOR = 0xd7f171;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    this.cameras.main.setBackgroundColor(0x081017);
    this.drawBackdrop();
    this.createTitleLockup();
    this.createActions();
    this.bindInput();
  }

  drawBackdrop() {
    const width = this.scale.width;
    const height = this.scale.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const horizonY = height * 0.61;

    const sky = this.add.graphics();
    sky.fillGradientStyle(0x080d18, 0x101b2b, 0x1b2f35, 0x273d2f, 1);
    sky.fillRect(0, 0, width, height);

    const moonGlow = this.add.ellipse(centerX + 270, centerY - 170, 360, 360, 0xaedcff, 0.1);
    const moon = this.add.ellipse(centerX + 278, centerY - 176, 132, 132, 0xf8f0ca, 0.94);
    const shadow = this.add.ellipse(centerX + 312, centerY - 178, 132, 132, 0x1b2030, 0.86);
    moonGlow.setBlendMode(Phaser.BlendModes.SCREEN);
    moon.setBlendMode(Phaser.BlendModes.SCREEN);
    shadow.setBlendMode(Phaser.BlendModes.MULTIPLY);

    const farTrees = this.add.graphics();
    farTrees.fillStyle(0x111b21, 0.78);
    for (let x = -20; x < width + 60; x += 42) {
      const treeHeight = 46 + ((x * 13) % 64);
      farTrees.fillTriangle(x, horizonY, x + 22, horizonY - treeHeight, x + 46, horizonY);
    }

    const hills = this.add.graphics();
    hills.fillStyle(0x17251d, 1);
    hills.beginPath();
    hills.moveTo(0, horizonY + 34);
    hills.lineTo(width * 0.15, height * 0.55);
    hills.lineTo(width * 0.35, height * 0.64);
    hills.lineTo(width * 0.52, height * 0.5);
    hills.lineTo(width * 0.74, height * 0.66);
    hills.lineTo(width * 0.9, height * 0.53);
    hills.lineTo(width, height * 0.62);
    hills.lineTo(width, height);
    hills.lineTo(0, height);
    hills.closePath();
    hills.fillPath();

    const lowFog = this.add.graphics();
    lowFog.fillStyle(0xbed7d2, 0.08);
    for (let index = 0; index < 6; index += 1) {
      lowFog.fillEllipse(centerX - 430 + (index * 176), horizonY + 88 + ((index % 2) * 18), 260, 34);
    }

    const path = this.add.graphics();
    path.fillStyle(0x4b3a2d, 0.96);
    path.beginPath();
    path.moveTo(centerX - 102, height);
    path.lineTo(centerX + 128, height);
    path.lineTo(centerX + 36, horizonY - 22);
    path.lineTo(centerX - 42, horizonY - 22);
    path.closePath();
    path.fillPath();

    this.drawDungeonGate(centerX, horizonY + 38);

    if (this.textures.exists('witch-kitty')) {
      this.add.ellipse(centerX - 22, height * 0.718, 92, 24, 0x000000, 0.32).setDepth(10);
      const hero = this.add.sprite(centerX - 22, height * 0.682, 'witch-kitty', 0).setScale(1.65).setDepth(11);
      this.tweens.add({
        targets: hero,
        y: hero.y - 8,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    }

    this.drawMotes(width, height);

    const stars = this.add.graphics();
    for (let index = 0; index < 58; index += 1) {
      const x = 42 + ((index * 71) % Math.max(80, width - 84));
      const y = 32 + ((index * 43) % Math.max(80, Math.floor(height * 0.42)));
      stars.fillStyle(index % 3 === 0 ? 0xf8fbff : 0x9fd6ff, index % 4 === 0 ? 0.82 : 0.42);
      stars.fillCircle(x, y, index % 5 === 0 ? 2 : 1);
    }
  }

  drawDungeonGate(x, y) {
    const glow = this.add.rectangle(x, y + 12, 184, 148, 0x7bdcff, 0.08).setDepth(3);
    const shadow = this.add.rectangle(x, y + 56, 216, 40, 0x000000, 0.24).setDepth(4);
    const platform = this.add.graphics().setDepth(5);
    platform.fillStyle(0x1a2421, 1);
    platform.fillEllipse(x, y + 58, 196, 36);
    platform.fillStyle(0x27362f, 1);
    platform.fillRect(x - 82, y + 38, 164, 22);
    platform.fillStyle(0x40504a, 1);
    for (let index = 0; index < 6; index += 1) {
      platform.fillRect(x - 74 + (index * 28), y + 42 + ((index % 2) * 3), 22, 10);
    }

    const gate = this.add.graphics();
    gate.setDepth(6);
    gate.fillStyle(0x26343a, 1);
    gate.fillRect(x - 74, y - 54, 148, 118);
    gate.fillTriangle(x - 74, y - 54, x, y - 112, x + 74, y - 54);

    gate.fillStyle(0x111820, 1);
    gate.fillRect(x - 42, y - 40, 84, 104);
    gate.fillTriangle(x - 42, y - 40, x, y - 82, x + 42, y - 40);

    gate.fillStyle(0x3f5055, 1);
    for (let row = 0; row < 4; row += 1) {
      const blockY = y - 50 + (row * 26);
      for (let col = 0; col < 5; col += 1) {
        const blockX = x - 70 + (col * 29) + ((row % 2) * 9);
        if (blockX > x - 47 && blockX < x + 47 && blockY > y - 44) {
          continue;
        }
        gate.fillRect(blockX, blockY, 23, 18);
      }
    }

    gate.lineStyle(3, 0x9de3ff, 0.34);
    gate.strokeRect(x - 46, y - 38, 92, 102);
    gate.lineStyle(2, ACCENT_COLOR, 0.34);
    gate.beginPath();
    gate.moveTo(x - 38, y + 36);
    gate.lineTo(x - 14, y + 18);
    gate.lineTo(x + 8, y + 28);
    gate.lineTo(x + 36, y + 4);
    gate.strokePath();

    const portalGlow = this.add.ellipse(x, y + 12, 70, 94, 0x7bdcff, 0.12).setDepth(7);
    portalGlow.setBlendMode(Phaser.BlendModes.SCREEN);
    const portal = this.add.graphics().setDepth(7);
    portal.fillStyle(0x132234, 0.86);
    portal.fillEllipse(x, y + 14, 52, 76);
    portal.lineStyle(3, 0x9de3ff, 0.55);
    portal.strokeEllipse(x, y + 14, 56, 82);
    portal.lineStyle(2, ACCENT_COLOR, 0.36);
    portal.beginPath();
    portal.moveTo(x - 18, y + 28);
    portal.lineTo(x - 2, y + 12);
    portal.lineTo(x + 16, y + 20);
    portal.lineTo(x + 28, y + 4);
    portal.strokePath();

    const sparks = [
      this.add.circle(x - 20, y - 10, 2, 0x9de3ff, 0.45).setDepth(8),
      this.add.circle(x + 18, y + 2, 2, ACCENT_COLOR, 0.38).setDepth(8),
      this.add.circle(x + 8, y + 32, 2, 0x9de3ff, 0.36).setDepth(8),
    ];
    for (const spark of sparks) {
      spark.setBlendMode(Phaser.BlendModes.SCREEN);
      this.tweens.add({
        targets: spark,
        y: spark.y - 8,
        alpha: { from: 0.18, to: 0.7 },
        duration: 760,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    }

    const torches = [
      this.add.container(x - 88, y + 8).setDepth(8),
      this.add.container(x + 88, y + 8).setDepth(8),
    ];

    for (const torch of torches) {
      const sconce = this.add.rectangle(0, 12, 8, 30, 0x4a321f, 1);
      const flameGlow = this.add.rectangle(0, -6, 32, 34, 0xffd36b, 0.13);
      const flame = this.add.triangle(0, -8, -8, 10, 8, 10, 0, -12, 0xf4d35f, 0.9);
      torch.add([flameGlow, sconce, flame]);
      this.tweens.add({
        targets: flame,
        scaleY: { from: 0.85, to: 1.18 },
        alpha: { from: 0.72, to: 1 },
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    }

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.05, to: 0.18 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });

    this.tweens.add({
      targets: portalGlow,
      alpha: { from: 0.06, to: 0.18 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  }

  drawMotes(width, height) {
    for (let index = 0; index < 22; index += 1) {
      const x = 80 + ((index * 137) % Math.max(120, width - 160));
      const y = height * 0.42 + ((index * 59) % Math.max(80, Math.floor(height * 0.38)));
      const mote = this.add.circle(x, y, index % 4 === 0 ? 3 : 2, index % 3 === 0 ? 0xd7f171 : 0x9de3ff, 0.28);
      mote.setBlendMode(Phaser.BlendModes.SCREEN);
      this.tweens.add({
        targets: mote,
        y: y - 18 - (index % 5),
        alpha: { from: 0.18, to: 0.72 },
        duration: 1100 + ((index * 97) % 900),
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    }
  }

  createTitleLockup() {
    const width = this.scale.width;
    const centerX = width / 2;
    const titleTop = Math.max(70, this.scale.height * 0.14);
    const titleSize = width < 900 ? 46 : 66;

    this.add
      .text(centerX, titleTop, GAME_TITLE, {
        fontFamily: 'Georgia',
        fontSize: `${titleSize}px`,
        color: TEXT_COLOR,
        stroke: '#111720',
        strokeThickness: 8,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 10, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(PANEL_DEPTH);
  }

  createActions() {
    const width = this.scale.width;
    const height = this.scale.height;
    const centerX = width / 2;
    const buttonY = Math.min(height - 92, height * 0.82);

    this.startButton = this.createButton(centerX, buttonY, 'Start', () => this.startFreshRun());

    this.add
      .text(centerX, buttonY + 58, 'Press Enter to start', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#dbe6d6',
      })
      .setOrigin(0.5)
      .setDepth(PANEL_DEPTH);
  }

  createButton(x, y, label, onClick) {
    const width = 196;
    const height = 48;
    const button = this.add.container(x, y).setDepth(PANEL_DEPTH + 2);
    const shadow = this.add.rectangle(5, 6, width, height, 0x000000, 0.28);
    const bg = this.add
      .rectangle(0, 0, width, height, 0x203044, 0.94)
      .setStrokeStyle(2, ACCENT_COLOR, 0.72);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'monospace',
        fontSize: '19px',
        color: '#f9ffe6',
      })
      .setOrigin(0.5);

    button.add([shadow, bg, text]);
    button.setSize(width, height);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      bg.setFillStyle(0x2f4a3a, 0.98);
      this.tweens.add({ targets: button, y: y - 3, duration: 90, ease: 'sine.out' });
    });
    button.on('pointerout', () => {
      bg.setFillStyle(0x203044, 0.94);
      this.tweens.add({ targets: button, y, duration: 90, ease: 'sine.out' });
    });
    button.on('pointerdown', onClick);
    return button;
  }

  bindInput() {
    this.input.keyboard.once('keydown-ENTER', () => this.startFreshRun());
    this.input.keyboard.once('keydown-SPACE', () => this.startFreshRun());
  }

  startFreshRun() {
    resetPlaytestProgressionState();
    this.startGame();
  }

  startGame() {
    this.scene.start('overworld');
  }
}
