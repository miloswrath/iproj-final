import Phaser from 'phaser';
import {
  applyCombatItemEffect,
  getCombatUsableInventoryItems,
  resetPlaytestPlayerHp,
  setPlaytestPlayerHp,
} from '../playtestProgression';

const PLAYER_VISUAL_CONFIG = {
  scale: 2.12,
  shadowWidth: 86,
  shadowHeight: 24,
  hoverOffset: 4,
};

const ENEMY_VISUAL_CONFIG = {
  'slime-idle': { endFrame: 5, frameRate: 7, scale: 2.75, shadowWidth: 112, shadowHeight: 28, attackStyle: 'slime' },
  'plant1-idle': { endFrame: 3, frameRate: 6, scale: 2.5, shadowWidth: 116, shadowHeight: 24, attackStyle: 'plant' },
  'vampire1-idle': { endFrame: 3, frameRate: 6, scale: 2.55, shadowWidth: 104, shadowHeight: 24, attackStyle: 'vampire' },
};

const COMBAT_BACKDROP_PROFILES = {
  'atrium-chain': {
    title: 'Moonlit Ruins',
    skyTop: 0x03040d,
    skyUpper: 0x05060f,
    skyLower: 0x180813,
    horizon: 0x24131f,
    leftGlow: 0x1a5ea6,
    rightGlow: 0xb9244f,
    moon: 0xf1ead1,
    moonGlow: 0xa6d7ff,
    eclipse: 0x201327,
    skyline: 0x090c18,
    ruin: 0x10142b,
    floorA: 0x090d18,
    floorB: 0x20131f,
    ringA: 0x2a7fbc,
    ringB: 0xb92d59,
    leftAura: 0x1c8ae4,
    rightAura: 0xc53361,
    fogA: 0x59c5ff,
    fogB: 0xff7da9,
    motif: 'eclipse',
  },
  'sundered-halls': {
    title: 'Rotwood Ossuary',
    skyTop: 0x05090b,
    skyUpper: 0x0a100e,
    skyLower: 0x142019,
    horizon: 0x19251e,
    leftGlow: 0x4b8d61,
    rightGlow: 0x9edc7c,
    moon: 0xdce7b2,
    moonGlow: 0xa7f0b5,
    eclipse: 0x142019,
    skyline: 0x08110d,
    ruin: 0x122219,
    floorA: 0x0d1712,
    floorB: 0x1a251d,
    ringA: 0x4a8f65,
    ringB: 0x7dca76,
    leftAura: 0x5dc67b,
    rightAura: 0xa2ff8a,
    fogA: 0x7ae6b1,
    fogB: 0xc8ff9e,
    motif: 'roots',
  },
  'ring-galleries': {
    title: 'Astral Gallery',
    skyTop: 0x060510,
    skyUpper: 0x0d0b1e,
    skyLower: 0x1d1431,
    horizon: 0x24183b,
    leftGlow: 0x6078ff,
    rightGlow: 0xb074ff,
    moon: 0xf6f2ff,
    moonGlow: 0xc8b0ff,
    eclipse: 0x23143c,
    skyline: 0x0d0d24,
    ruin: 0x1a173a,
    floorA: 0x111127,
    floorB: 0x24193e,
    ringA: 0x6f84ff,
    ringB: 0xd08eff,
    leftAura: 0x7b8fff,
    rightAura: 0xe29bff,
    fogA: 0x9bb3ff,
    fogB: 0xf0a8ff,
    motif: 'rings',
  },
  'split-sanctum': {
    title: 'Blood Chapel',
    skyTop: 0x0b0406,
    skyUpper: 0x14070c,
    skyLower: 0x281116,
    horizon: 0x32141b,
    leftGlow: 0xb53749,
    rightGlow: 0xff9979,
    moon: 0xffd4cb,
    moonGlow: 0xff9d94,
    eclipse: 0x3b141c,
    skyline: 0x16080d,
    ruin: 0x2a1218,
    floorA: 0x170a0f,
    floorB: 0x2b1319,
    ringA: 0xd24b5e,
    ringB: 0xffb17a,
    leftAura: 0xdb4f67,
    rightAura: 0xff9c6a,
    fogA: 0xff8b7c,
    fogB: 0xffbf9e,
    motif: 'altar',
  },
  'lantern-way': {
    title: 'Lantern Causeway',
    skyTop: 0x0a0703,
    skyUpper: 0x151007,
    skyLower: 0x2a1b0d,
    horizon: 0x332012,
    leftGlow: 0xff9d2d,
    rightGlow: 0xffd36f,
    moon: 0xfff0c9,
    moonGlow: 0xffd37a,
    eclipse: 0x3b2715,
    skyline: 0x171108,
    ruin: 0x2d1d0d,
    floorA: 0x171005,
    floorB: 0x302012,
    ringA: 0xffa33b,
    ringB: 0xffde7f,
    leftAura: 0xffb244,
    rightAura: 0xffea9a,
    fogA: 0xffba4d,
    fogB: 0xffef99,
    motif: 'lanterns',
  },
};

const DEFAULT_BACKDROP_PROFILE = COMBAT_BACKDROP_PROFILES['atrium-chain'];

export class CombatScene extends Phaser.Scene {
  constructor() {
    super('combat');
  }

  create(data) {
    this.returning = false;
    this.returnContext = data.returnContext ?? {};
    this.layoutState = data?.layoutState ?? this.returnContext.layoutState ?? null;
    this.backdropProfile = COMBAT_BACKDROP_PROFILES[this.layoutState?.id] ?? DEFAULT_BACKDROP_PROFILE;

    this.playerStats = {
      maxHp: data?.playerStats?.maxHp ?? 30,
      hp: data?.playerStats?.hp ?? data?.playerStats?.maxHp ?? 30,
      attack: data?.playerStats?.attack ?? 8,
      defendReduction: data?.playerStats?.defendReduction ?? 6,
    };

    this.enemyStats = {
      name: data?.enemyStats?.name ?? 'Enemy',
      maxHp: data?.enemyStats?.maxHp ?? 24,
      hp: data?.enemyStats?.maxHp ?? 24,
      attack: data?.enemyStats?.attack ?? 6,
      spriteKey: data?.enemyStats?.spriteKey ?? 'slime-idle',
    };

    this.playerTurn = true;
    this.playerDefending = false;
    this.result = null;
    this.commandOrder = ['attack', 'heavy', 'item', 'defend'];
    this.commandIndex = 0;
    this.itemIndex = 0;
    this.menuState = 'commands';
    this.heavyStrikeCooldown = 0;
    this.itemButtons = [];
    this.actionLocked = false;
    this.actionLog = ['A hostile presence closes in.'];

    setPlaytestPlayerHp(this.playerStats.hp);
    this.drawPanel();
    this.createCombatAnimations();
    this.createPlayerVisual();
    this.createEnemyVisual();
    this.bindKeys();
    this.refreshHud('Choose an action.');
  }

  createCombatAnimations() {
    const animationDefs = [
      { key: 'combat-player-idle', texture: 'witch-kitty', start: 8, end: 11, frameRate: 7, repeat: -1 },
      { key: 'combat-player-attack', texture: 'witch-kitty', start: 8, end: 11, frameRate: 16, repeat: 0 },
      { key: 'combat-player-hurt', texture: 'witch-kitty', start: 12, end: 15, frameRate: 14, repeat: 0 },
    ];

    for (const def of animationDefs) {
      if (this.anims.exists(def.key)) {
        continue;
      }

      this.anims.create({
        key: def.key,
        frames: this.anims.generateFrameNumbers(def.texture, { start: def.start, end: def.end }),
        frameRate: def.frameRate,
        repeat: def.repeat,
      });
    }
  }

  createPlayerVisual() {
    this.playerShadow = this.add.ellipse(
      this.ui.playerX,
      this.ui.playerY + 52,
      PLAYER_VISUAL_CONFIG.shadowWidth,
      PLAYER_VISUAL_CONFIG.shadowHeight,
      0x04060d,
      0.52,
    );
    this.playerSprite = this.add
      .sprite(this.ui.playerX, this.ui.playerY, 'witch-kitty', 8)
      .setScale(PLAYER_VISUAL_CONFIG.scale)
      .setFlipX(true);
    this.playerSprite.play('combat-player-idle');
    this.playerIdleFloat = this.tweens.add({
      targets: this.playerSprite,
      y: this.ui.playerY - PLAYER_VISUAL_CONFIG.hoverOffset,
      ease: 'Sine.easeInOut',
      duration: 850,
      yoyo: true,
      repeat: -1,
    });
  }

  createEnemyVisual() {
    const spriteKey = this.enemyStats.spriteKey;
    const config = ENEMY_VISUAL_CONFIG[spriteKey] ?? ENEMY_VISUAL_CONFIG['slime-idle'];
    const animKey = `${spriteKey}-loop`;

    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(spriteKey, { start: 0, end: config.endFrame }),
        frameRate: config.frameRate,
        repeat: -1,
      });
    }

    this.enemySprite = this.add
      .sprite(this.ui.enemyX, this.ui.enemyY, spriteKey, 0)
      .setScale(config.scale);
    this.enemySprite.play(animKey);
    this.enemyShadow = this.add.ellipse(this.ui.enemyX, this.ui.enemyY + 54, config.shadowWidth, config.shadowHeight, 0x070a11, 0.45);
    this.enemyShadow.setDepth(this.enemySprite.depth - 1);
  }

  drawPanel() {
    const viewportWidth = this.scale.width;
    const viewportHeight = this.scale.height;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    const uiScale = Math.min(viewportWidth / 1280, viewportHeight / 720);
    const padX = Math.max(16, Math.floor(viewportWidth * 0.02));
    const padY = Math.max(16, Math.floor(viewportHeight * 0.025));
    const panelWidth = viewportWidth - (padX * 2);
    const panelHeight = viewportHeight - (padY * 2);
    const panelLeft = centerX - panelWidth / 2;
    const panelTop = centerY - panelHeight / 2;
    const titleSize = Math.max(24, Math.floor(34 * uiScale));
    const turnSize = Math.max(16, Math.floor(20 * uiScale));
    const nameSize = Math.max(19, Math.floor(24 * uiScale));
    const statSize = Math.max(16, Math.floor(18 * uiScale));
    const copySize = Math.max(14, Math.floor(16 * uiScale));
    const helpSize = Math.max(11, Math.floor(13 * uiScale));
    const titleTop = panelTop + Math.max(20, Math.floor(26 * uiScale));
    const turnTop = titleTop + titleSize + Math.max(6, Math.floor(6 * uiScale));
    const statusTop = turnTop + turnSize + Math.max(18, Math.floor(16 * uiScale));
    const statusHeight = Math.max(120, Math.floor(panelHeight * 0.16));
    const statusWidth = Math.min(368, Math.max(300, Math.floor(panelWidth * 0.24)));
    const bottomHeight = Math.max(208, Math.floor(panelHeight * 0.28));
    const footerTop = panelTop + panelHeight - bottomHeight - 14;
    const logHeight = Math.max(72, Math.floor(panelHeight * 0.1));
    const logTop = footerTop - logHeight - 18;
    const contentTop = statusTop + statusHeight + 18;
    const contentBottom = logTop - 18;
    const bodyHeight = contentBottom - contentTop;
    const rightColWidth = Math.min(380, Math.max(290, Math.floor(panelWidth * 0.31)));
    const buttonGap = Math.max(18, Math.floor(20 * uiScale));
    const buttonWidth = Math.max(168, Math.floor(panelWidth * 0.1));
    const buttonHeight = Math.max(54, Math.floor(58 * uiScale));

    this.ui = {
      uiScale,
      panelLeft,
      panelTop,
      panelWidth,
      panelHeight,
      contentTop,
      contentBottom,
      bodyHeight,
      bottomHeight,
      titleTop,
      turnTop,
      statusTop,
      statusWidth,
      statusHeight,
      titleSize,
      turnSize,
      nameSize,
      statSize,
      copySize,
      helpSize,
      playerCardLeft: panelLeft + 34,
      enemyCardLeft: panelLeft + panelWidth - statusWidth - 34,
      logLeft: panelLeft + 36,
      logTop,
      logWidth: panelWidth - 72,
      logHeight,
      commandLeft: panelLeft + 38,
      commandTop: footerTop + 30,
      commandGap: buttonGap,
      buttonWidth,
      buttonHeight,
      itemLeft: panelLeft + panelWidth - rightColWidth - 42,
      itemTop: footerTop + 26,
      itemWidth: rightColWidth,
      helpTop: footerTop + bottomHeight - 34,
      footerTop,
      playerX: panelLeft + Math.floor(panelWidth * 0.37),
      playerY: contentTop + Math.floor(bodyHeight * 0.73),
      enemyX: panelLeft + Math.floor(panelWidth * 0.66),
      enemyY: contentTop + Math.floor(bodyHeight * 0.43),
    };

    this.drawBackdrop(centerX, centerY, viewportWidth, viewportHeight);
    this.add
      .rectangle(centerX, centerY, panelWidth, panelHeight, 0x181c31, 0.9)
      .setStrokeStyle(3, 0x8ab4ff, 0.75);

    this.add
      .rectangle(panelLeft + panelWidth / 2, footerTop + (bottomHeight / 2), panelWidth - 44, bottomHeight, 0x111425, 0.92)
      .setStrokeStyle(2, 0x536c9e, 0.6);
    this.add
      .rectangle(panelLeft + panelWidth / 2, logTop + (logHeight / 2), panelWidth - 44, logHeight, 0x101521, 0.88)
      .setStrokeStyle(2, 0x455b88, 0.42);
    this.add
      .rectangle(this.ui.playerCardLeft + (statusWidth / 2), statusTop + (statusHeight / 2), statusWidth, statusHeight, 0x131a2c, 0.84)
      .setStrokeStyle(2, 0x4f9ecd, 0.45);
    this.add
      .rectangle(this.ui.enemyCardLeft + (statusWidth / 2), statusTop + (statusHeight / 2), statusWidth, statusHeight, 0x231826, 0.86)
      .setStrokeStyle(2, 0xd07a92, 0.45);

    this.add.text(panelLeft + 34, titleTop, this.backdropProfile.title, {
      fontFamily: 'Georgia',
      fontSize: `${titleSize}px`,
      color: '#f9fbff',
    });

    this.turnText = this.add.text(panelLeft + 34, turnTop, '', {
      fontFamily: 'Georgia',
      fontSize: `${turnSize}px`,
      color: '#c6dcff',
    });

    this.playerNameText = this.add.text(this.ui.playerCardLeft + 18, statusTop + 18, 'Witch Kitty', {
      fontFamily: 'Georgia',
      fontSize: `${nameSize}px`,
      color: '#f6fbff',
      wordWrap: { width: statusWidth - 36 },
    });

    this.playerHpText = this.add.text(this.ui.playerCardLeft + 18, statusTop + 62, '', {
      fontFamily: 'monospace',
      fontSize: `${statSize}px`,
      color: '#c8ffd8',
    });

    this.enemyNameText = this.add.text(this.ui.enemyCardLeft + 18, statusTop + 18, this.enemyStats.name, {
      fontFamily: 'Georgia',
      fontSize: `${nameSize}px`,
      color: '#fff4f7',
      wordWrap: { width: statusWidth - 36 },
    });

    this.enemyHpText = this.add.text(this.ui.enemyCardLeft + 18, statusTop + 62, '', {
      fontFamily: 'monospace',
      fontSize: `${statSize}px`,
      color: '#ffc8d2',
    });

    this.logText = this.add.text(this.ui.logLeft, this.ui.logTop, '', {
      fontFamily: 'monospace',
      fontSize: `${copySize}px`,
      color: '#f5edd0',
      wordWrap: { width: this.ui.logWidth - 24 },
    });

    this.commandButtons = [
      this.createCommandButton(this.ui.commandLeft, this.ui.commandTop, '1) Strike', 'attack'),
      this.createCommandButton(this.ui.commandLeft + buttonWidth + buttonGap, this.ui.commandTop, '2) Heavy', 'heavy'),
      this.createCommandButton(this.ui.commandLeft, this.ui.commandTop + buttonHeight + 12, '3) Item', 'item'),
      this.createCommandButton(this.ui.commandLeft + buttonWidth + buttonGap, this.ui.commandTop + buttonHeight + 12, '4) Defend', 'defend'),
    ];

    this.itemPanelTitle = this.add.text(this.ui.itemLeft, this.ui.itemTop, 'Battle Pack', {
      fontFamily: 'Georgia',
      fontSize: `${Math.max(18, Math.floor(22 * uiScale))}px`,
      color: '#ffe7ab',
    });

    this.itemEmptyText = this.add.text(this.ui.itemLeft, this.ui.itemTop + 34, '', {
      fontFamily: 'monospace',
      fontSize: `${Math.max(14, Math.floor(15 * uiScale))}px`,
      color: '#bfc7da',
      wordWrap: { width: this.ui.itemWidth },
    });

    this.itemDetailText = this.add.text(this.ui.itemLeft, this.ui.itemTop + 98, '', {
      fontFamily: 'monospace',
      fontSize: `${Math.max(12, Math.floor(13 * uiScale))}px`,
      color: '#dce7ff',
      wordWrap: { width: this.ui.itemWidth },
    });

    for (let index = 0; index < 4; index += 1) {
      const itemButton = this.add
        .text(this.ui.itemLeft, this.ui.itemTop + 38 + (index * 28), '', {
          fontFamily: 'monospace',
          fontSize: `${Math.max(14, Math.floor(15 * uiScale))}px`,
          color: '#f8f8f8',
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.handleItemPointer(index));

      this.itemButtons.push(itemButton);
    }

    this.exitButton = this.add
      .text(this.ui.commandLeft, this.ui.commandTop + 20, 'Return', {
        fontFamily: 'monospace',
        fontSize: `${Math.max(16, Math.floor(18 * uiScale))}px`,
        color: '#d7ffb8',
        backgroundColor: '#26352a',
        padding: { x: 14, y: 8 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.resolveReturn())
      .setVisible(false);

    this.helpText = this.add.text(panelLeft + 34, this.ui.helpTop, '1 Strike | 2 Heavy | 3 Item | 4 Defend. Arrow keys + Enter drive battle items. Esc closes the item list.', {
      fontFamily: 'monospace',
      fontSize: `${helpSize}px`,
      color: '#c8ccdc',
      wordWrap: { width: panelWidth - 80 },
    });
  }

  drawBackdrop(centerX, centerY, viewportWidth, viewportHeight) {
    const profile = this.backdropProfile;
    const sky = this.add.graphics();
    sky.fillGradientStyle(profile.skyTop, profile.skyUpper, profile.skyLower, profile.horizon, 1);
    sky.fillRect(0, 0, viewportWidth, viewportHeight);

    const stormGlowLeft = this.add.ellipse(centerX - 260, centerY - 120, 560, 360, profile.leftGlow, 0.16);
    const stormGlowRight = this.add.ellipse(centerX + 280, centerY - 80, 520, 320, profile.rightGlow, 0.18);
    const moonGlow = this.add.ellipse(centerX + 170, centerY - 180, 260, 260, profile.moonGlow, 0.11);
    const moon = this.add.ellipse(centerX + 178, centerY - 188, 112, 112, profile.moon, 0.88);
    const eclipse = this.add.ellipse(centerX + 210, centerY - 182, 118, 118, profile.eclipse, 0.84);
    stormGlowLeft.setBlendMode(Phaser.BlendModes.SCREEN);
    stormGlowRight.setBlendMode(Phaser.BlendModes.SCREEN);
    moonGlow.setBlendMode(Phaser.BlendModes.SCREEN);
    moon.setBlendMode(Phaser.BlendModes.SCREEN);
    eclipse.setBlendMode(Phaser.BlendModes.MULTIPLY);

    const starField = this.add.graphics();
    for (let index = 0; index < 20; index += 1) {
      const x = 70 + ((index * 67) % (viewportWidth - 140));
      const y = 40 + ((index * 53) % Math.floor(viewportHeight * 0.34));
      const radius = index % 5 === 0 ? 2 : 1.1;
      const alpha = index % 4 === 0 ? 0.78 : 0.4;
      starField.fillStyle(index % 3 === 0 ? 0xf6fbff : profile.moonGlow, alpha);
      starField.fillCircle(x, y, radius);
    }

    this.drawBackdropMotif(profile, centerX, centerY, viewportWidth, viewportHeight);

    const skyline = this.add.graphics();
    skyline.fillStyle(profile.skyline, 0.98);
    skyline.beginPath();
    skyline.moveTo(0, viewportHeight * 0.59);
    skyline.lineTo(viewportWidth * 0.1, viewportHeight * 0.48);
    skyline.lineTo(viewportWidth * 0.18, viewportHeight * 0.56);
    skyline.lineTo(viewportWidth * 0.3, viewportHeight * 0.36);
    skyline.lineTo(viewportWidth * 0.42, viewportHeight * 0.58);
    skyline.lineTo(viewportWidth * 0.54, viewportHeight * 0.43);
    skyline.lineTo(viewportWidth * 0.67, viewportHeight * 0.61);
    skyline.lineTo(viewportWidth * 0.8, viewportHeight * 0.39);
    skyline.lineTo(viewportWidth * 0.92, viewportHeight * 0.56);
    skyline.lineTo(viewportWidth, viewportHeight * 0.49);
    skyline.lineTo(viewportWidth, viewportHeight);
    skyline.lineTo(0, viewportHeight);
    skyline.closePath();
    skyline.fillPath();

    const midground = this.add.graphics();
    midground.fillStyle(profile.ruin, 0.8);
    midground.fillRoundedRect(centerX - 90, centerY - 40, 180, 238, 12);
    midground.fillRoundedRect(centerX - 140, centerY + 158, 280, 28, 10);
    midground.fillTriangle(centerX, centerY - 166, centerX - 152, centerY - 2, centerX + 152, centerY - 2);
    midground.fillStyle(profile.leftGlow, 0.08);
    midground.fillRect(centerX - 70, centerY - 10, 12, 174);
    midground.fillStyle(profile.rightGlow, 0.08);
    midground.fillRect(centerX + 58, centerY - 10, 12, 174);

    const rift = this.add.graphics();
    rift.fillStyle(profile.leftGlow, 0.08);
    rift.fillEllipse(centerX - 40, centerY + 74, 220, 340);
    rift.fillStyle(profile.rightGlow, 0.08);
    rift.fillEllipse(centerX + 48, centerY + 74, 220, 340);
    rift.lineStyle(4, profile.ringB, 0.18);
    rift.strokeEllipse(centerX + 4, centerY + 76, 176, 278);
    rift.lineStyle(2, 0xffffff, 0.08);
    rift.strokeEllipse(centerX + 4, centerY + 76, 118, 222);

    const sigil = this.add.graphics();
    sigil.lineStyle(3, profile.ringA, 0.12);
    sigil.strokeCircle(centerX, centerY + 112, 116);
    sigil.lineStyle(2, profile.ringB, 0.12);
    sigil.strokeCircle(centerX, centerY + 112, 172);
    sigil.strokeTriangle(centerX, centerY + 20, centerX - 84, centerY + 166, centerX + 84, centerY + 166);

    const ruins = this.add.graphics();
    ruins.fillStyle(profile.ruin, 0.95);
    ruins.fillRoundedRect(centerX - 420, centerY - 30, 46, 170, 6);
    ruins.fillRoundedRect(centerX - 378, centerY - 102, 26, 242, 6);
    ruins.fillRoundedRect(centerX + 270, centerY - 72, 54, 212, 6);
    ruins.fillRoundedRect(centerX + 316, centerY - 122, 30, 262, 6);
    ruins.fillStyle(profile.leftGlow, 0.18);
    ruins.fillRect(centerX - 418, centerY + 24, 6, 76);
    ruins.fillStyle(profile.rightGlow, 0.14);
    ruins.fillRect(centerX + 274, centerY - 12, 6, 84);

    const floor = this.add.graphics();
    floor.fillGradientStyle(profile.floorA, profile.floorA, profile.floorB, profile.floorB, 1);
    floor.fillRect(0, viewportHeight * 0.58, viewportWidth, viewportHeight * 0.42);
    floor.lineStyle(5, profile.ringA, 0.34);
    floor.strokeEllipse(centerX - 120, centerY + 152, 440, 92);
    floor.lineStyle(4, profile.ringB, 0.26);
    floor.strokeEllipse(centerX + 110, centerY + 154, 360, 86);
    floor.lineStyle(2, 0xf2f3ff, 0.18);
    floor.strokeEllipse(centerX - 10, centerY + 152, 620, 48);

    const hazardGlow = this.add.graphics();
    hazardGlow.fillGradientStyle(profile.leftGlow, profile.leftGlow, profile.rightGlow, profile.rightGlow, 0.1);
    hazardGlow.fillRoundedRect(centerX - 270, centerY + 94, 540, 100, 26);

    const floorMistA = this.add.ellipse(centerX - 100, centerY + 146, 520, 84, profile.fogA, 0.07);
    const floorMistB = this.add.ellipse(centerX + 160, centerY + 148, 460, 72, profile.fogB, 0.06);
    floorMistA.setBlendMode(Phaser.BlendModes.SCREEN);
    floorMistB.setBlendMode(Phaser.BlendModes.SCREEN);

    const leftAura = this.add.ellipse(this.ui.playerX + 38, this.ui.playerY + 68, 240, 130, profile.leftAura, 0.13);
    const rightAura = this.add.ellipse(this.ui.enemyX - 20, this.ui.enemyY + 78, 250, 132, profile.rightAura, 0.14);
    const fogA = this.add.ellipse(centerX - 130, centerY + 22, 660, 124, profile.fogA, 0.08);
    const fogB = this.add.ellipse(centerX + 220, centerY + 12, 560, 108, profile.fogB, 0.08);
    fogA.setBlendMode(Phaser.BlendModes.SCREEN);
    fogB.setBlendMode(Phaser.BlendModes.SCREEN);
    leftAura.setBlendMode(Phaser.BlendModes.SCREEN);
    rightAura.setBlendMode(Phaser.BlendModes.SCREEN);

    const emberField = this.add.graphics();
    for (let index = 0; index < 18; index += 1) {
      const x = 90 + ((index * 73) % (viewportWidth - 180));
      const y = viewportHeight * 0.6 + ((index * 29) % 180);
      emberField.fillStyle(index % 2 === 0 ? profile.ringB : profile.ringA, 0.3);
      emberField.fillCircle(x, y, index % 3 === 0 ? 2.2 : 1.4);
    }

    this.tweens.add({
      targets: fogA,
      x: fogA.x + 26,
      alpha: 0.12,
      ease: 'Sine.easeInOut',
      duration: 2600,
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: fogB,
      x: fogB.x - 24,
      alpha: 0.1,
      ease: 'Sine.easeInOut',
      duration: 3000,
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: [floorMistA, floorMistB],
      alpha: 0.12,
      ease: 'Sine.easeInOut',
      duration: 2400,
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: [stormGlowLeft, leftAura],
      alpha: 0.22,
      ease: 'Sine.easeInOut',
      duration: 1900,
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: [stormGlowRight, rightAura],
      alpha: 0.24,
      ease: 'Sine.easeInOut',
      duration: 1700,
      yoyo: true,
      repeat: -1,
    });
  }

  drawBackdropMotif(profile, centerX, centerY, viewportWidth, viewportHeight) {
    if (profile.motif === 'roots') {
      const roots = this.add.graphics();
      roots.lineStyle(5, profile.leftGlow, 0.2);
      roots.beginPath();
      roots.moveTo(centerX - 430, centerY + 16);
      roots.lineTo(centerX - 340, centerY - 8);
      roots.lineTo(centerX - 274, centerY + 52);
      roots.lineTo(centerX - 200, centerY + 18);
      roots.lineTo(centerX - 120, centerY + 84);
      roots.strokePath();
      roots.lineStyle(5, profile.rightGlow, 0.18);
      roots.beginPath();
      roots.moveTo(centerX + 136, centerY - 42);
      roots.lineTo(centerX + 214, centerY + 22);
      roots.lineTo(centerX + 296, centerY - 18);
      roots.lineTo(centerX + 392, centerY + 72);
      roots.strokePath();
      return;
    }

    if (profile.motif === 'rings') {
      const rings = this.add.graphics();
      rings.lineStyle(4, profile.leftGlow, 0.28);
      rings.strokeCircle(centerX - 210, centerY - 40, 96);
      rings.strokeCircle(centerX - 210, centerY - 40, 146);
      rings.lineStyle(4, profile.rightGlow, 0.28);
      rings.strokeCircle(centerX + 270, centerY - 56, 82);
      rings.strokeCircle(centerX + 270, centerY - 56, 132);
      return;
    }

    if (profile.motif === 'altar') {
      const altar = this.add.graphics();
      altar.fillStyle(profile.ruin, 0.9);
      altar.fillRoundedRect(centerX - 28, centerY + 18, 56, 92, 6);
      altar.fillRoundedRect(centerX - 78, centerY + 84, 156, 22, 6);
      altar.lineStyle(3, profile.ringB, 0.3);
      altar.strokeTriangle(centerX, centerY - 96, centerX - 90, centerY + 26, centerX + 90, centerY + 26);
      return;
    }

    if (profile.motif === 'lanterns') {
      const lanterns = this.add.graphics();
      lanterns.lineStyle(2, profile.moonGlow, 0.3);
      lanterns.strokeLineShape(new Phaser.Geom.Line(centerX - 310, centerY - 190, centerX - 310, centerY - 64));
      lanterns.strokeLineShape(new Phaser.Geom.Line(centerX + 290, centerY - 180, centerX + 290, centerY - 54));
      lanterns.fillStyle(profile.ringA, 0.45);
      lanterns.fillRoundedRect(centerX - 330, centerY - 66, 40, 54, 8);
      lanterns.fillRoundedRect(centerX + 270, centerY - 56, 40, 54, 8);
      return;
    }

    const energyVein = this.add.graphics();
    energyVein.lineStyle(4, profile.leftGlow, 0.5);
    energyVein.beginPath();
    energyVein.moveTo(centerX - 420, centerY - 160);
    energyVein.lineTo(centerX - 340, centerY - 110);
    energyVein.lineTo(centerX - 300, centerY - 148);
    energyVein.lineTo(centerX - 210, centerY - 92);
    energyVein.lineTo(centerX - 162, centerY - 130);
    energyVein.strokePath();
    energyVein.lineStyle(4, profile.rightGlow, 0.42);
    energyVein.beginPath();
    energyVein.moveTo(centerX + 210, centerY - 92);
    energyVein.lineTo(centerX + 290, centerY - 42);
    energyVein.lineTo(centerX + 360, centerY - 76);
    energyVein.lineTo(centerX + 438, centerY - 18);
    energyVein.strokePath();
  }

  createCommandButton(x, y, label, action) {
    return this.add
      .text(x, y, label, {
        fontFamily: 'Georgia',
        fontSize: `${Math.max(18, Math.floor(24 * this.ui.uiScale))}px`,
        color: '#f8f8f8',
        backgroundColor: '#24314d',
        padding: { x: 16, y: 12 },
      })
      .setFixedSize(this.ui.buttonWidth, this.ui.buttonHeight)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.handleAction(action));
  }

  bindKeys() {
    this.keyOne = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.keyTwo = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.keyThree = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.keyFour = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  update() {
    if (this.result && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.resolveReturn();
      return;
    }

    if (!this.playerTurn || this.result) {
      return;
    }

    if (this.menuState === 'items') {
      this.updateItemInput();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyOne)) {
      this.handleAction('attack');
    } else if (Phaser.Input.Keyboard.JustDown(this.keyTwo)) {
      this.handleAction('heavy');
    } else if (Phaser.Input.Keyboard.JustDown(this.keyThree)) {
      this.handleAction('item');
    } else if (Phaser.Input.Keyboard.JustDown(this.keyFour)) {
      this.handleAction('defend');
    }
  }

  handleAction(action) {
    if (!this.playerTurn || this.result || this.actionLocked) {
      return;
    }

    this.commandIndex = this.commandOrder.indexOf(action);

    if (action === 'item') {
      this.openItemMenu();
      return;
    }

    if (action === 'heavy' && this.heavyStrikeCooldown > 0) {
      this.refreshHud(`Heavy Strike recharges in ${this.heavyStrikeCooldown} turn.`);
      return;
    }

    this.menuState = 'commands';
    this.playerTurn = false;
    this.playerDefending = action === 'defend';
    this.actionLocked = true;

    if (action === 'attack' || action === 'heavy') {
      this.resolvePlayerAttack(action);

      return;
    }

    this.resolvePlayerGuard();
  }

  openItemMenu() {
    const items = this.getCombatItems();
    if (items.length === 0) {
      this.refreshHud('No combat-usable items are in your pack.');
      return;
    }

    this.menuState = 'items';
    this.itemIndex = Phaser.Math.Clamp(this.itemIndex, 0, items.length - 1);
    this.refreshHud('Choose an item to spend your turn.');
  }

  updateItemInput() {
    const items = this.getCombatItems();
    if (items.length === 0) {
      this.menuState = 'commands';
      this.refreshHud('No combat-usable items are in your pack.');
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.itemIndex = Phaser.Math.Wrap(this.itemIndex - 1, 0, items.length);
      this.refreshHud('Choose an item to spend your turn.');
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.downKey)) {
      this.itemIndex = Phaser.Math.Wrap(this.itemIndex + 1, 0, items.length);
      this.refreshHud('Choose an item to spend your turn.');
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.menuState = 'commands';
      this.refreshHud('Choose an action.');
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.useCombatItem(items[this.itemIndex]);
    }
  }

  handleItemPointer(index) {
    if (this.menuState !== 'items' || !this.playerTurn || this.result) {
      return;
    }

    const items = this.getCombatItems();
    if (!items[index]) {
      return;
    }

    this.itemIndex = index;
    this.useCombatItem(items[index]);
  }

  useCombatItem(item) {
    if (!item) {
      return;
    }

    const result = applyCombatItemEffect(item.id);
    if (!result.applied) {
      this.menuState = 'commands';
      this.refreshHud('That item could not be used.');
      return;
    }

    this.playerStats.hp = result.hp;
    this.menuState = 'commands';
    this.playerTurn = false;
    this.playerDefending = false;
    this.actionLocked = true;
    this.flashBattler(this.playerSprite, 0xa6ffcf);
    this.appendLog(`${result.itemName} restores ${result.amount} HP.`);
    this.refreshHud(`${result.itemName} restores ${result.amount} HP.`);
    this.time.delayedCall(460, () => {
      this.actionLocked = false;
      this.runEnemyTurn();
    });
  }

  runEnemyTurn() {
    if (this.result || this.actionLocked) {
      return;
    }

    this.actionLocked = true;
    this.enemySprite.setTint(0xffd8ea);
    this.tweens.add({
      targets: this.enemySprite,
      x: this.enemySprite.x - 38,
      yoyo: true,
      ease: 'Quad.easeInOut',
      duration: 140,
      onComplete: () => {
        this.enemySprite.clearTint();
        this.resolveEnemyAttack();
      },
    });
  }

  finishCombat(result, text) {
    this.result = result;
    this.playerTurn = false;
    this.menuState = 'commands';
    setPlaytestPlayerHp(this.playerStats.hp);
    this.commandButtons.forEach((button) => {
      button.setAlpha(0).setVisible(false);
      button.disableInteractive();
    });
    this.itemButtons.forEach((button) => button.disableInteractive().setVisible(false));
    this.itemPanelTitle.setAlpha(0.4);
    this.itemEmptyText.setAlpha(0.55);
    this.itemDetailText.setAlpha(0.45);
    this.exitButton.setVisible(true);
    this.helpText.setText('Press Enter or click Return.');
    this.refreshHud(text);
  }

  resolveReturn() {
    if (!this.result || this.returning) {
      return;
    }

    this.returning = true;

    if (this.result === 'victory') {
      const defeatedEnemyIds = [...(this.returnContext.layoutState?.defeatedEnemyIds ?? [])];
      const defeatedEnemyId = this.returnContext.defeatedEnemyId;
      if (defeatedEnemyId && !defeatedEnemyIds.includes(defeatedEnemyId)) {
        defeatedEnemyIds.push(defeatedEnemyId);
      }

      const enemyCount = this.returnContext.layoutState?.enemyCount ?? defeatedEnemyIds.length;
      const nextLayoutState = {
        ...this.returnContext.layoutState,
        defeatedEnemyIds,
        enemyCount,
        encounterCompleted: enemyCount > 0 && defeatedEnemyIds.length >= enemyCount,
      };

      this.scene.start('dungeon', {
        returnX: this.returnContext.returnX,
        returnY: this.returnContext.returnY,
        layoutState: nextLayoutState,
        spawnX: this.returnContext.dungeonSpawnX,
        spawnY: this.returnContext.dungeonSpawnY,
        completionStatus: nextLayoutState.encounterCompleted ? 'complete' : 'incomplete',
        combatResult: 'victory',
      });

      return;
    }

    resetPlaytestPlayerHp();
    this.scene.start('overworld', {
      spawnX: this.returnContext.returnX ?? 170,
      spawnY: this.returnContext.returnY ?? 170,
      dungeonCompletionStatus: 'failed',
    });
  }

  refreshHud(logMessage) {
    this.turnText.setText(this.result ? `Result: ${this.result.toUpperCase()}` : this.playerTurn ? 'Turn: Player' : 'Turn: Enemy');
    this.enemyNameText.setText(this.enemyStats.name);
    this.playerHpText.setText(`HP ${this.playerStats.hp}/${this.playerStats.maxHp}`);
    this.enemyHpText.setText(`HP ${this.enemyStats.hp}/${this.enemyStats.maxHp}`);
    this.logText.setText(this.actionLog.slice(-3).join('\n'));
    this.refreshMenu();
  }

  refreshMenu() {
    if (this.result) {
      this.itemButtons.forEach((button) => button.setVisible(false));
      this.itemEmptyText.setVisible(true).setText('Encounter resolved.');
      return;
    }

    this.commandButtons.forEach((button, index) => {
      const action = this.commandOrder[index];
      const selected = this.menuState === 'commands' && index === this.commandIndex;
      const disabled = action === 'heavy' && this.heavyStrikeCooldown > 0;
      button
        .setAlpha(disabled ? 0.45 : 1)
        .setBackgroundColor(selected ? '#567cc1' : '#24314d');

      if (action === 'heavy') {
        button.setText(this.heavyStrikeCooldown > 0 ? `2) Heavy ${this.heavyStrikeCooldown}` : '2) Heavy');
      }
    });

    const items = this.getCombatItems();
    this.itemPanelTitle.setAlpha(this.menuState === 'items' ? 1 : 0.72);
    this.itemEmptyText.setVisible(items.length === 0);
    this.itemEmptyText.setText(items.length === 0 ? 'No combat items available.' : '');

    this.itemButtons.forEach((button, index) => {
      const item = items[index];
      if (!item) {
        button.setText('').setVisible(false);
        return;
      }

      const selected = this.menuState === 'items' && index === this.itemIndex;
      button
        .setVisible(true)
        .setText(`${selected ? '>' : ' '} ${item.name} x${item.quantity}`)
        .setColor(selected ? '#fff7d6' : '#f8f8f8')
        .setBackgroundColor(selected ? '#42506d' : '#111425');
    });

    const selectedItem = items[this.itemIndex] ?? items[0] ?? null;
    if (!selectedItem) {
      this.itemDetailText.setText('Consumables from the shared inventory appear here when they are battle-usable.');
      return;
    }

    const healAmount = selectedItem.combat?.effect?.amount ?? 0;
    this.itemDetailText.setText(
      `${selectedItem.description}\nEffect: restore ${healAmount} HP.\nUsing an item spends your turn.`,
    );
  }

  getCombatItems() {
    return getCombatUsableInventoryItems();
  }

  shakeSprite(sprite, offsetX, duration = 120) {
    if (!sprite) {
      return;
    }

    const startX = sprite.x;
    this.tweens.add({
      targets: sprite,
      x: startX + offsetX,
      yoyo: true,
      ease: 'Sine.easeInOut',
      duration,
      onComplete: () => {
        sprite.x = startX;
      },
    });
  }

  resolvePlayerGuard() {
    this.playerIdleFloat?.pause();
    this.playerSprite.setAngle(-10);
    this.playerSprite.play('combat-player-hurt');

    const guardRing = this.add.circle(this.ui.playerX + 10, this.ui.playerY - 8, 34, 0x8fd7ff, 0.16)
      .setStrokeStyle(4, 0xdff5ff, 0.85);
    const guardArc = this.add.ellipse(this.ui.playerX + 18, this.ui.playerY - 6, 66, 84, 0x74c6ff, 0.14)
      .setStrokeStyle(3, 0xffffff, 0.72);
    const guardSparkA = this.add.star(this.ui.playerX + 28, this.ui.playerY - 24, 4, 4, 10, 0xe6fbff, 0.9);
    const guardSparkB = this.add.star(this.ui.playerX - 4, this.ui.playerY + 14, 4, 3, 8, 0xa7dcff, 0.8);

    this.tweens.add({
      targets: [guardRing, guardArc],
      scaleX: 1.18,
      scaleY: 1.12,
      alpha: 0.32,
      duration: 180,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
    this.tweens.add({
      targets: [guardSparkA, guardSparkB],
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 220,
      onComplete: () => {
        guardSparkA.destroy();
        guardSparkB.destroy();
      },
    });

    this.time.delayedCall(320, () => {
      this.playerSprite.setAngle(0);
      this.playerSprite.play('combat-player-idle');
      this.playerIdleFloat?.resume();
      this.appendLog('You brace for impact. Incoming damage will be reduced.');
      this.refreshHud('You brace for impact. Incoming damage will be reduced.');
      this.actionLocked = false;
      this.runEnemyTurn();
    });

    this.time.delayedCall(520, () => {
      guardRing.destroy();
      guardArc.destroy();
    });
  }

  spawnGuardImpact(x, y, critical = false) {
    const color = critical ? 0xfff0a5 : 0x9fddff;
    const barrier = this.add.ellipse(x, y, critical ? 92 : 82, critical ? 116 : 100, color, 0.16)
      .setStrokeStyle(4, 0xffffff, 0.8);
    const crossA = this.add.rectangle(x, y, 72, 6, color, 0.8).setAngle(32);
    const crossB = this.add.rectangle(x, y, 72, 6, 0xffffff, 0.85).setAngle(-32);

    this.tweens.add({
      targets: [barrier, crossA, crossB],
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => {
        barrier.destroy();
        crossA.destroy();
        crossB.destroy();
      },
    });
  }

  resolvePlayerAttack(action = 'attack') {
    const isHeavy = action === 'heavy';
    const baseAttack = isHeavy ? Math.round(this.playerStats.attack * 1.65) : this.playerStats.attack;
    const outcome = this.rollAttack(baseAttack, {
      accuracy: isHeavy ? 0.82 : 0.93,
      critChance: isHeavy ? 0.11 : 0.16,
      variance: isHeavy ? 0.18 : 0.22,
    });

    if (isHeavy) {
      this.heavyStrikeCooldown = 2;
    }

    this.runAttackSequence({
      actor: 'player',
      style: 'kitty',
      outcome,
      onHit: () => {
        this.enemyStats.hp = Math.max(0, this.enemyStats.hp - outcome.damage);
        this.flashBattler(this.enemySprite, outcome.critical ? 0xfff08a : 0xffa2b1);
        this.shakeSprite(this.enemySprite, 22, 160);
      },
      onComplete: () => {
        if (this.enemyStats.hp <= 0) {
          this.finishCombat('victory', 'Victory. Press Return or Enter.');
          return;
        }

        this.actionLocked = false;
        this.time.delayedCall(360, () => this.runEnemyTurn());
      },
    });

    const message = outcome.hit
      ? isHeavy
        ? outcome.critical ? `Heavy critical for ${outcome.damage}.` : `Heavy Strike hits for ${outcome.damage}.`
        : outcome.critical ? `Critical hit for ${outcome.damage}.` : `You strike for ${outcome.damage}.`
      : isHeavy ? 'Heavy Strike misses.' : 'Your attack misses.';
    this.appendLog(message);
    this.refreshHud(message);
  }

  resolveEnemyAttack() {
    const outcome = this.rollAttack(this.enemyStats.attack, {
      accuracy: 0.88,
      critChance: 0.08,
      variance: 0.2,
    });

    let damage = outcome.damage;
    if (this.playerDefending && outcome.hit) {
      const percentageReduction = Math.ceil(damage * 0.7);
      damage = Math.max(1, damage - Math.max(this.playerStats.defendReduction, percentageReduction));
    }

    if (outcome.hit) {
      this.playerStats.hp = Math.max(0, this.playerStats.hp - damage);
      setPlaytestPlayerHp(this.playerStats.hp);
      this.flashBattler(this.playerSprite, 0xffb0b8);
      this.shakeSprite(this.playerSprite, -18, 150);
      if (this.playerDefending) {
        this.spawnGuardImpact(this.ui.playerX + 12, this.ui.playerY - 2, outcome.critical);
      }
    }

    const logMessage = !outcome.hit
      ? `${this.enemyStats.name} misses.`
      : this.playerDefending
        ? `${this.enemyStats.name} hits for ${damage} through your guard.`
        : outcome.critical
          ? `${this.enemyStats.name} lands a critical for ${damage}.`
          : `${this.enemyStats.name} hits for ${damage}.`;

    this.appendLog(logMessage);
    this.refreshHud(logMessage);
    this.runAttackSequence({
      actor: 'enemy',
      style: (ENEMY_VISUAL_CONFIG[this.enemyStats.spriteKey] ?? ENEMY_VISUAL_CONFIG['slime-idle']).attackStyle,
      outcome,
      onComplete: () => {
        if (this.playerStats.hp <= 0) {
          this.finishCombat('defeat', 'Defeat. Press Return or Enter.');
          return;
        }

        this.playerDefending = false;
        this.heavyStrikeCooldown = Math.max(0, this.heavyStrikeCooldown - 1);
        this.playerTurn = true;
        this.actionLocked = false;
        this.refreshHud(`${logMessage} Your turn.`);
      },
    });
  }

  runAttackSequence({ actor, style, outcome, onHit = null, onComplete = null }) {
    const attacker = actor === 'player' ? this.playerSprite : this.enemySprite;
    const attackerIdle = actor === 'player' ? 'combat-player-idle' : `${this.enemyStats.spriteKey}-loop`;
    const isPlayer = actor === 'player';
    const startX = isPlayer ? this.ui.playerX : this.ui.enemyX;
    const startY = isPlayer ? this.ui.playerY : this.ui.enemyY;
    const targetX = isPlayer ? this.ui.enemyX : this.ui.playerX;
    const targetY = isPlayer ? this.ui.enemyY : this.ui.playerY;
    const dashX = startX + (isPlayer ? 56 : -54);
    const angle = isPlayer ? 8 : -10;

    if (isPlayer) {
      this.playerIdleFloat?.pause();
      attacker.play('combat-player-attack');
    }

    attacker.setAngle(angle);
    this.tweens.add({
      targets: attacker,
      x: dashX,
      y: startY - 14,
      ease: 'Cubic.easeOut',
      duration: 140,
      yoyo: true,
      hold: 45,
      onYoyo: () => {
        if (outcome.hit) {
          onHit?.();
          this.spawnAttackEffect(style, isPlayer, targetX, targetY, outcome.critical);
        }
      },
      onComplete: () => {
        attacker.setAngle(0);
        attacker.setPosition(startX, startY);
        if (isPlayer) {
          attacker.play(attackerIdle);
          this.playerIdleFloat?.resume();
        }
        this.time.delayedCall(220, () => onComplete?.());
      },
    });
  }

  spawnAttackEffect(style, leftToRight, targetX, targetY, critical = false) {
    if (style === 'slime') {
      this.spawnSlimeBurst(targetX, targetY, critical);
      return;
    }

    if (style === 'plant') {
      this.spawnVineLash(targetX, targetY, critical, leftToRight);
      return;
    }

    if (style === 'vampire') {
      this.spawnVampireRush(targetX, targetY, critical, leftToRight);
      return;
    }

    this.spawnClawStrike(
      leftToRight ? this.ui.playerX + 44 : this.ui.enemyX - 28,
      leftToRight ? this.ui.playerY - 12 : this.ui.enemyY - 10,
      leftToRight ? this.ui.enemyX - 36 : this.ui.playerX + 8,
      leftToRight ? this.ui.enemyY - 8 : this.ui.playerY - 2,
      critical,
      leftToRight,
    );
  }

  spawnSlimeBurst(x, y, critical = false) {
    const color = critical ? 0xd9ff8a : 0x89f6cf;
    const splat = this.add.circle(x, y, critical ? 30 : 22, color, 0.3).setStrokeStyle(4, 0xf6ffe0, 0.8);
    const globs = [
      this.add.circle(x - 22, y + 8, 8, color, 0.8),
      this.add.circle(x + 20, y - 10, 6, 0xe8fff6, 0.85),
      this.add.circle(x + 6, y + 18, 5, color, 0.72),
    ];
    this.tweens.add({
      targets: [splat, ...globs],
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.2,
      duration: 180,
      onComplete: () => [splat, ...globs].forEach((node) => node.destroy()),
    });
  }

  spawnVineLash(x, y, critical = false, leftToRight = true) {
    const color = critical ? 0xffe78d : 0x95ff8a;
    const vine = this.add.graphics();
    vine.lineStyle(critical ? 6 : 5, color, 0.8);
    vine.beginPath();
    vine.moveTo(x + (leftToRight ? -110 : 110), y + 34);
    vine.quadraticCurveTo(x + (leftToRight ? -40 : 40), y - 34, x, y);
    vine.strokePath();
    const spores = [
      this.add.circle(x - 12, y - 8, 4, 0xf7ffd7, 0.9),
      this.add.circle(x + 10, y + 6, 5, color, 0.75),
      this.add.circle(x + 2, y - 18, 3, 0xffffff, 0.9),
    ];
    this.tweens.add({
      targets: spores,
      alpha: 0,
      y: y - 28,
      duration: 220,
      onComplete: () => spores.forEach((node) => node.destroy()),
    });
    this.time.delayedCall(200, () => vine.destroy());
  }

  spawnVampireRush(x, y, critical = false, leftToRight = true) {
    const color = critical ? 0xfff0aa : 0xff7b97;
    const wingA = this.add.triangle(x - (leftToRight ? 16 : -16), y, 0, 0, 54, -16, 36, 18, color, 0.66);
    const wingB = this.add.triangle(x + (leftToRight ? 10 : -10), y - 6, 0, 0, -48, -14, -32, 16, 0x2b0711, 0.72);
    const biteFlash = this.add.star(x, y, 6, 8, critical ? 30 : 22, color, 0.96);
    this.tweens.add({
      targets: [wingA, wingB, biteFlash],
      alpha: 0,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: 180,
      onComplete: () => [wingA, wingB, biteFlash].forEach((node) => node.destroy()),
    });
  }

  rollAttack(baseAttack, { accuracy, critChance, variance }) {
    const hit = Math.random() <= accuracy;
    if (!hit) {
      return {
        hit: false,
        critical: false,
        damage: 0,
      };
    }

    const damageRoll = baseAttack * (1 + Phaser.Math.FloatBetween(-variance, variance));
    const critical = Math.random() <= critChance;
    const damage = Math.max(1, Math.round(damageRoll * (critical ? 1.65 : 1)));

    return {
      hit: true,
      critical,
      damage,
    };
  }

  appendLog(message) {
    this.actionLog.push(message);
    this.actionLog = this.actionLog.slice(-5);
  }

  flashBattler(sprite, tint) {
    if (!sprite) {
      return;
    }

    sprite.setTint(tint);
    this.time.delayedCall(140, () => sprite.clearTint());
  }

  spawnClawStrike(fromX, fromY, toX, toY, critical = false, leftToRight = true) {
    const slashColor = critical ? 0xffef9a : 0x97ddff;
    const streakA = this.add.ellipse(fromX, fromY, 96, 12, slashColor, 0.86).setAngle(leftToRight ? -18 : 198);
    const streakB = this.add.ellipse(fromX - (leftToRight ? 6 : -6), fromY + 18, 72, 8, 0xffffff, 0.9)
      .setAngle(leftToRight ? -11 : 191);
    const streakC = this.add.ellipse(fromX - (leftToRight ? 12 : -12), fromY - 18, 64, 6, slashColor, 0.72)
      .setAngle(leftToRight ? -26 : 206);
    const impactRing = this.add.circle(toX, toY, critical ? 32 : 24, slashColor, 0.22).setStrokeStyle(3, 0xffffff, 0.75);
    const impactBurst = this.add.star(toX, toY, 5, 8, critical ? 28 : 22, slashColor, 0.95).setAngle(leftToRight ? 18 : -18);

    this.tweens.add({
      targets: [streakA, streakB, streakC],
      x: toX,
      y: toY,
      alpha: 0,
      scaleX: 1.5,
      ease: 'Cubic.easeOut',
      duration: 130,
      onComplete: () => {
        streakA.destroy();
        streakB.destroy();
        streakC.destroy();
      },
    });

    this.tweens.add({
      targets: impactRing,
      scaleX: 1.9,
      scaleY: 1.9,
      alpha: 0,
      ease: 'Quad.easeOut',
      duration: 180,
      onComplete: () => impactRing.destroy(),
    });

    this.tweens.add({
      targets: impactBurst,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0,
      angle: impactBurst.angle + (leftToRight ? 22 : -22),
      ease: 'Quad.easeOut',
      duration: 180,
      onComplete: () => impactBurst.destroy(),
    });
  }
}
