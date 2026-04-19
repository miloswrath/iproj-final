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
    this.load.image('overworld-field-a', assetPaths.overworldFieldTileAUrl);
    this.load.image('overworld-field-b', assetPaths.overworldFieldTileBUrl);
    this.load.image('overworld-field-c', assetPaths.overworldFieldTileCUrl);
    this.load.image('overworld-path-a', assetPaths.overworldPathTileAUrl);
    this.load.image('overworld-path-b', assetPaths.overworldPathTileBUrl);
    this.load.image('overworld-path-c', assetPaths.overworldPathTileCUrl);
    this.load.image('overworld-path-d', assetPaths.overworldPathTileDUrl);
    this.load.image('overworld-transition-a', assetPaths.overworldTransitionTileAUrl);
    this.load.image('overworld-transition-b', assetPaths.overworldTransitionTileBUrl);
    this.load.image('overworld-town-tile', assetPaths.overworldTownTileUrl);
    this.load.image('overworld-water-tile', assetPaths.overworldWaterTileUrl);
    this.load.image('overworld-grass-1', assetPaths.overworldGrass1Url);
    this.load.image('overworld-grass-6', assetPaths.overworldGrass6Url);
    this.load.image('overworld-stone-3', assetPaths.overworldStone3Url);
    this.load.image('overworld-box-2', assetPaths.overworldBox2Url);
    this.load.image('overworld-tent-1', assetPaths.overworldTent1Url);
    this.load.image('overworld-tent-2', assetPaths.overworldTent2Url);
    this.load.image('overworld-tent-3', assetPaths.overworldTent3Url);
    this.load.image('overworld-tent-4', assetPaths.overworldTent4Url);
    this.load.image('overworld-house-1', assetPaths.overworldHouse1Url);
    this.load.image('overworld-house-2', assetPaths.overworldHouse2Url);
    this.load.image('overworld-house-3', assetPaths.overworldHouse3Url);
    this.load.image('overworld-house-4', assetPaths.overworldHouse4Url);
    this.load.image('guild-hall-exterior', assetPaths.guildHallExteriorUrl);
    this.load.image('forest-white-tree-1', assetPaths.forestWhiteTree1Url);
    this.load.image('forest-willow-1', assetPaths.forestWillow1Url);
    this.load.image('forest-living-gazebo-1', assetPaths.forestLivingGazebo1Url);
    this.load.image('forest-mega-tree-1', assetPaths.forestMegaTree1Url);
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
    this.load.spritesheet('swordsman-idle', assetPaths.swordsmanIdleUrl, {
      frameWidth: 64,
      frameHeight: 64,
    });
  }

  create() {
    this.scene.start('overworld');
  }
}