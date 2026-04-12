import Phaser from 'phaser';

export class DungeonScene extends Phaser.Scene {
  constructor() {
    super('dungeon');
  }

  create(data) {
    this.returnX = data.returnX ?? 120;
    this.returnY = data.returnY ?? 120;
    this.returning = false;

    this.add.rectangle(480, 270, 960, 540, 0x0a1018, 1);
    this.add
      .image(480, 270, 'dungeon-tile')
      .setDisplaySize(960, 540)
      .setTint(0x7d8dad)
      .setAlpha(0.35);
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.35);
    this.add.rectangle(480, 270, 540, 320, 0x000000, 0.35).setStrokeStyle(2, 0xd3d3d3, 0.9);

    this.add.text(270, 220, 'Dungeon test scene', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#f4f4f4',
    });

    this.add.text(245, 270, 'Press Q or click Return to Overworld', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#c8d8ff',
    });

    this.add
      .text(330, 305, 'Return to Overworld', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#d9ffb8',
        backgroundColor: '#233138',
        padding: { x: 10, y: 6 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.returnToOverworld());

    this.qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.input.keyboard.addCapture([Phaser.Input.Keyboard.KeyCodes.Q]);
    this.input.keyboard.on('keydown', (event) => {
      const key = event.key;
      const code = event.code;
      if (key?.toLowerCase() === 'q' || code === 'KeyQ') {
        this.returnToOverworld();
      }
    });
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
      this.returnToOverworld();
    }
  }

  returnToOverworld() {
    if (this.returning) {
      return;
    }

    this.returning = true;
    this.scene.start('overworld', {
      spawnX: this.returnX,
      spawnY: this.returnY,
    });
  }
}