import Phaser from 'phaser';

export class CombatScene extends Phaser.Scene {
  constructor() {
    super('combat');
  }

  create(data) {
    this.returning = false;
    this.returnContext = data.returnContext ?? {};

    this.playerStats = {
      maxHp: data?.playerStats?.maxHp ?? 30,
      hp: data?.playerStats?.maxHp ?? 30,
      attack: data?.playerStats?.attack ?? 8,
      defendReduction: data?.playerStats?.defendReduction ?? 4,
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

    this.drawPanel();
    this.createEnemyVisual();
    this.bindKeys();
    this.refreshHud('Choose an action.');
  }

  createEnemyVisual() {
    const animationConfig = {
      'slime-idle': { endFrame: 5, frameRate: 7, scale: 2.2 },
      'plant1-idle': { endFrame: 3, frameRate: 6, scale: 2.3 },
      'vampire1-idle': { endFrame: 3, frameRate: 6, scale: 2.1 },
    };

    const spriteKey = this.enemyStats.spriteKey;
    const config = animationConfig[spriteKey] ?? animationConfig['slime-idle'];
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
  }

  drawPanel() {
    const viewportWidth = this.scale.width;
    const viewportHeight = this.scale.height;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    const panelWidth = Math.min(1120, viewportWidth - 80);
    const panelHeight = Math.min(560, viewportHeight - 76);
    const panelLeft = centerX - panelWidth / 2;
    const panelTop = centerY - panelHeight / 2;

    this.ui = {
      panelLeft,
      panelTop,
      panelWidth,
      panelHeight,
      enemyX: panelLeft + panelWidth * 0.79,
      enemyY: panelTop + panelHeight * 0.34,
    };

    this.add.rectangle(centerX, centerY, viewportWidth, viewportHeight, 0x101018, 1);
    this.add
      .rectangle(centerX, centerY, panelWidth, panelHeight, 0x1d1f2e, 0.98)
      .setStrokeStyle(3, 0x7aa4d6, 0.95);

    this.add.text(panelLeft + 34, panelTop + 28, 'Combat Sandbox', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#f9fbff',
    });

    this.turnText = this.add.text(panelLeft + 34, panelTop + 74, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#b2d3ff',
    });

    this.playerHpText = this.add.text(panelLeft + 34, panelTop + 126, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#c6ffc0',
    });

    this.enemyHpText = this.add.text(panelLeft + 34, panelTop + 166, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffc2bc',
    });

    this.logText = this.add.text(panelLeft + 34, panelTop + 228, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#f5edd0',
      wordWrap: { width: Math.floor(panelWidth * 0.58) },
    });

    this.attackButton = this.add
      .text(panelLeft + 34, panelTop + panelHeight - 140, '1) Attack', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#f8f8f8',
        backgroundColor: '#2e3a2f',
        padding: { x: 12, y: 8 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.handleAction('attack'));

    this.defendButton = this.add
      .text(panelLeft + 236, panelTop + panelHeight - 140, '2) Defend', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#f8f8f8',
        backgroundColor: '#2f3448',
        padding: { x: 12, y: 8 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.handleAction('defend'));

    this.exitButton = this.add
      .text(panelLeft + 34, panelTop + panelHeight - 76, 'Return', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#d7ffb8',
        backgroundColor: '#26352a',
        padding: { x: 12, y: 7 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.resolveReturn())
      .setVisible(false);

    this.helpText = this.add.text(panelLeft + 34, panelTop + panelHeight - 36, 'Use keys 1/2 or click actions.', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#c8ccdc',
    });
  }

  bindKeys() {
    this.keyOne = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.keyTwo = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keyOne)) {
      this.handleAction('attack');
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyTwo)) {
      this.handleAction('defend');
    }

    if (this.result && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.resolveReturn();
    }
  }

  handleAction(action) {
    if (!this.playerTurn || this.result) {
      return;
    }

    this.playerTurn = false;
    this.playerDefending = action === 'defend';

    if (action === 'attack') {
      this.enemyStats.hp = Math.max(0, this.enemyStats.hp - this.playerStats.attack);
      this.refreshHud(`You attack for ${this.playerStats.attack} damage.`);

      if (this.enemyStats.hp <= 0) {
        this.finishCombat('victory', 'Victory. Press Return or Enter.');
        return;
      }
    } else {
      this.refreshHud('You brace for impact. Incoming damage will be reduced.');
    }

    this.time.delayedCall(380, () => this.runEnemyTurn());
  }

  runEnemyTurn() {
    if (this.result) {
      return;
    }

    const reducedDamage = Math.max(1, this.enemyStats.attack - this.playerStats.defendReduction);
    const damage = this.playerDefending ? reducedDamage : this.enemyStats.attack;
    this.playerStats.hp = Math.max(0, this.playerStats.hp - damage);

    const logMessage = this.playerDefending
      ? `${this.enemyStats.name} attacks for ${damage} (defended).`
      : `${this.enemyStats.name} attacks for ${damage}.`;

    this.refreshHud(logMessage);

    if (this.playerStats.hp <= 0) {
      this.finishCombat('defeat', 'Defeat. Press Return or Enter.');
      return;
    }

    this.playerDefending = false;
    this.playerTurn = true;
    this.refreshHud(`${logMessage} Your turn.`);
  }

  finishCombat(result, text) {
    this.result = result;
    this.playerTurn = false;
    this.attackButton.setAlpha(0.55);
    this.defendButton.setAlpha(0.55);
    this.attackButton.disableInteractive();
    this.defendButton.disableInteractive();
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

    this.scene.start('overworld', {
      spawnX: this.returnContext.returnX ?? 170,
      spawnY: this.returnContext.returnY ?? 170,
      dungeonCompletionStatus: 'failed',
    });
  }

  refreshHud(logMessage) {
    this.turnText.setText(this.result ? `Result: ${this.result.toUpperCase()}` : this.playerTurn ? 'Turn: Player' : 'Turn: Enemy');
    this.playerHpText.setText(`Player HP: ${this.playerStats.hp}/${this.playerStats.maxHp}`);
    this.enemyHpText.setText(`${this.enemyStats.name} HP: ${this.enemyStats.hp}/${this.enemyStats.maxHp}`);
    this.logText.setText(logMessage);
  }
}
