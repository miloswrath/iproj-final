import Phaser from 'phaser';
import { assetPaths } from '../assetPaths';
import { preloadAutoAssetImages } from '../autoAssetManifest';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const isAssetCanvasMode = mode === 'asset-canvas';

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
    this.load.spritesheet('dungeon-chests-doors', assetPaths.dungeonDoorsChestsUrl, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('dungeon-fire-anim', assetPaths.dungeonFireAnimationUrl, {
      frameWidth: 44,
      frameHeight: 48,
    });
    this.load.spritesheet('dungeon-fire-anim-small', assetPaths.dungeonFireAnimation2Url, {
      frameWidth: 24,
      frameHeight: 32,
    });
    this.load.spritesheet('dungeon-trap-anim', assetPaths.dungeonTrapAnimationUrl, {
      frameWidth: 48,
      frameHeight: 40,
    });
    this.load.spritesheet('undead-ground-tiles', assetPaths.undeadGroundTilesUrl, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('undead-objects', assetPaths.undeadObjectsUrl, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('undead-objects-large', assetPaths.undeadObjectsUrl, {
      frameWidth: 64,
      frameHeight: 64,
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
    this.load.spritesheet('swordsman-attack', assetPaths.swordsmanAttackUrl, {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet('swordsman-hurt', assetPaths.swordsmanHurtUrl, {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.image('ui-inventory-layout', assetPaths.inventoryLayoutUrl);
    this.load.spritesheet('ui-inventory-layout-tiles', assetPaths.inventoryLayoutUrl, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('ui-inventory-frame-tiles', assetPaths.inventoryFrameTilesUrl, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('ui-inventory-icons', assetPaths.inventoryIconsUrl, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image('ui-field-tonic-icon', assetPaths.fieldTonicIconUrl);
    this.load.spritesheet('npc-girl-1-idle', assetPaths.npcGirl1IdleUrl, {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.spritesheet('npc-girl-1-walk', assetPaths.npcGirl1WalkUrl, {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.spritesheet('npc-girl-1-dialogue', assetPaths.npcGirl1DialogueUrl, {
      frameWidth: 128,
      frameHeight: 128,
    });

    if (isAssetCanvasMode) {
      preloadAutoAssetImages(this);
    }
  }

  create() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const startScene = mode === 'asset-canvas' ? 'asset-canvas' : 'overworld';
    this.scene.start(startScene);
  }
}
