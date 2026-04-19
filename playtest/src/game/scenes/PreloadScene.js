import Phaser from 'phaser';
import { assetPaths } from '../assetPaths';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    const progressLabel = this.add.text(24, 24, 'Loading assets: 0%', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });

    this.load.on('progress', (value) => {
      progressLabel.setText(`Loading assets: ${Math.round(value * 100)}%`);
    });

    this.load.image('overworld-tile', assetPaths.overworldTileUrl);
    this.load.image('dungeon-tile', assetPaths.dungeonTileUrl);
    this.load.spritesheet('dungeon-floor-tiles', assetPaths.dungeonFloorTilesUrl, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('dungeon-wall-tiles', assetPaths.dungeonWallTilesUrl, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('dungeon-objects', assetPaths.dungeonObjectsUrl, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('undead-ground-tiles', assetPaths.undeadGroundTilesUrl, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('undead-objects', assetPaths.undeadObjectsUrl, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('witch-kitty', assetPaths.witchKittyWalkUrl, {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet('slime-idle', assetPaths.slimeIdleUrl, {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet('plant1-idle', assetPaths.plant1IdleUrl, {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet('vampire1-idle', assetPaths.vampire1IdleUrl, {
      frameWidth: 64,
      frameHeight: 64,
    });
  }

  create() {
    this.scene.start('overworld');
  }
}