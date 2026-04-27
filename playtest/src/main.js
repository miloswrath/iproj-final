import Phaser from 'phaser';
import './style.css';
import { BootScene } from './game/scenes/BootScene';
import { PreloadScene } from './game/scenes/PreloadScene';
import { OverworldScene } from './game/scenes/OverworldScene';
import { DungeonScene } from './game/scenes/DungeonScene';
import { CombatScene } from './game/scenes/CombatScene';
import { AssetCanvasScene } from './game/scenes/AssetCanvasScene';

const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 1280,
  height: 720,
  pixelArt: true,
  backgroundColor: '#101418',
  dom: {
    createContainer: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, OverworldScene, DungeonScene, CombatScene, AssetCanvasScene],
};

const game = new Phaser.Game(gameConfig);

if (import.meta.env.DEV) {
  window.__playtestGame = game;
}
