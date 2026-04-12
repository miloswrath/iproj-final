import Phaser from 'phaser';
import './style.css';
import { BootScene } from './game/scenes/BootScene';
import { PreloadScene } from './game/scenes/PreloadScene';
import { OverworldScene } from './game/scenes/OverworldScene';
import { DungeonScene } from './game/scenes/DungeonScene';

const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 960,
  height: 540,
  pixelArt: true,
  backgroundColor: '#101418',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, OverworldScene, DungeonScene],
};

new Phaser.Game(gameConfig);
