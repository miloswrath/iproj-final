import Phaser from 'phaser';
import { createOverworldLayout, FRIEND_NPC_ANCHORS, TileKinds, worldFromTile } from '../overworld/overworldLayout';
import { DeveloperModeController } from '../editor/DeveloperModeController';
import { loadDevAssetRegistry } from '../editor/devAssetRegistry';
import { InventoryOverlay } from '../ui/InventoryOverlay';
import { INVENTORY_ITEM_DEFS } from '../ui/inventoryData';
import { ConversationOverlay } from '../ui/ConversationOverlay';
import { FriendRosterOverlay } from '../ui/FriendRosterOverlay';
import { LoreCodexOverlay } from '../ui/LoreCodexOverlay';
import { HUDController } from '../ui/HUDController';
import { ShopUpgradeOverlay } from '../ui/ShopUpgradeOverlay';
import {
  activateFollowerForNpc,
  applyFriendshipUpdate,
  clearFollowerState,
  clearPostBattleReturnContext,
  ensureStarterSelection,
  getFollowState,
  getActiveCharacterState,
  getInventoryItemQuantity,
  getPlaytestInventoryState,
  getPlaytestProgressionSummary,
  getUpgradeProgressionState,
  getVillageShopState,
  grantInventoryItem,
  restoreFollowerAfterTransition,
  setActiveCharacterState,
  setFriendRoster,
  setFollowState,
  setPostBattleReturnContext,
  setQuestRunState,
  clearQuestRunState,
  markFollowerTransitionPending,
} from '../playtestProgression';
import { resolveNpcConfig, resolveNpcConfigForArchetype } from '../npc/npcConfig';
import { QuestEventStream, getLastQuestStartPayload } from '../services/questEvents';
import { fetchActiveCharacterState, fetchFriendRoster } from '../services/questRunClient';
import { spawnQuestToast } from '../ui/QuestToast';

const PLAYER_SPEED = 180;
const SPRINT_MULTIPLIER = 1.85;
const HUD_DEPTH = 1000;
const SHOW_COLLISION_OVERLAY = false;
const PLAYER_WORLD_SCALE = 0.52;
const VILLAGE_STRUCTURE_SCALE = 1.22;
const AI_NPC_WORLD_SCALE = 0.72;
const TOWN_NPC_SCALE_MULTIPLIER = 1.22;

export class OverworldScene extends Phaser.Scene {
  constructor() {
    super('overworld');
  }

  create(data) {
    ensureStarterSelection();
    this.dungeonCompletionStatus = data?.dungeonCompletionStatus ?? null;
    this.rewardSummaryText = data?.rewardSummaryText ?? '';
    this.companionFollowActive = false;
    this.companionFollowSprite = null;
    this.questPortalLabel = null;
    this.questEventStream = new QuestEventStream();
    this.codexOverlay = null;
    this.friendOverlay = null;
    this.creativeGalleryOpen = false;
    this.creativeGallerySelection = 0;

    // If returning from completed quest run, clear run state
    if (data?.questCompleted || data?.dungeonCompletionStatus === 'complete') {
      clearQuestRunState();
      clearFollowerState();
    }

    if (data?.postBattleReturnContext) {
      setPostBattleReturnContext(data.postBattleReturnContext);
      if (data.postBattleReturnContext.activeNpcId) {
        setActiveCharacterState({ activeNpcId: data.postBattleReturnContext.activeNpcId });
      }
    } else if (data?.questCompleted || data?.dungeonCompletionStatus === 'failed') {
      clearPostBattleReturnContext();
    }

    this.layout = createOverworldLayout();
    this.cameras.main.setBackgroundColor(0x9bad76);

    this.renderGroundLayer();
    this.renderTransitionLayer();
    this.renderPondShoreLayer();
    this.renderGroundDetailLayer();
    this.renderAtmosphereLayer();
    if (SHOW_COLLISION_OVERLAY) {
      this.renderCollisionLayer();
    }
    this.renderDecorLayer();
    this.renderAmbientLifeLayer();
    this.renderForegroundLayer();
    this.renderTownNpcs();
    this.renderAiNpcs();
    this.renderLandmarks();
    this.renderDungeonPortal();

    this.physics.world.setBounds(0, 0, this.layout.worldWidth, this.layout.worldHeight);
    this.cameras.main.setBounds(0, 0, this.layout.worldWidth, this.layout.worldHeight);

    const spawnX = data?.spawnX ?? this.layout.spawnWorld.x;
    const spawnY = data?.spawnY ?? this.layout.spawnWorld.y;
    this.player = this.physics.add.sprite(spawnX, spawnY, 'witch-kitty').setScale(PLAYER_WORLD_SCALE);
    this.player.setFrame(0);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(450);
    this.player.body.setSize(this.player.width * 0.5, this.player.height * 0.7);

    this.createPlayerAnimations();
    this.lastDirection = 'down';

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.restoreCompanionFollowFromState();

    this.obstacles = this.physics.add.staticGroup();
    this.buildCollisionBodies();
    this.physics.add.collider(this.player, this.obstacles);
    const audit = this.runTraversalAudit();

    this.dungeonEntry = this.add.zone(
      this.layout.dungeonEntryWorld.x,
      this.layout.dungeonEntryWorld.y,
      this.layout.dungeonEntryZoneSize.width,
      this.layout.dungeonEntryZoneSize.height,
    );
    this.physics.add.existing(this.dungeonEntry, true);

    this.keys = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    const params = new URLSearchParams(window.location.search);
    this.presentationDebugHud = params.get('demoDebug') === '1';
    this.devModeEnabled = params.get('devMode') === '1';

    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.devModeController = this.devModeEnabled
      ? new DeveloperModeController(this, {
        sceneLabel: 'Overworld',
        tileSize: this.layout.tileSize,
        cols: this.layout.cols,
        rows: this.layout.rows,
        worldWidth: this.layout.worldWidth,
        worldHeight: this.layout.worldHeight,
        registry: loadDevAssetRegistry('overworld', this.textures),
      })
      : null;

    const lowerHudY = Math.max(220, this.scale.height - 112);

    this.add.text(16, 16, 'Move: WASD/Arrows | Shift sprint | E interact', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(HUD_DEPTH);

    this.enterPrompt = this.add
      .text(16, lowerHudY - 72, 'Press E to enter dungeon', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#d9ffb8',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(false);

    this.completionLabel = this.add
      .text(16, lowerHudY - 48, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#fff7cc',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(false);

    this.ambientLabel = this.add
      .text(16, 112, `Ambient loops: ${this.layout.ambientItems.length}/35`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#b8f4ff',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(this.presentationDebugHud);

    this.auditLabel = this.add
      .text(16, 136, audit.message, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: audit.pass ? '#c8ffbc' : '#ffbcbc',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(this.presentationDebugHud);

    const progressionSummary = getPlaytestProgressionSummary();
    const inventoryCount = getPlaytestInventoryState().items.reduce(
      (sum, item) => sum + (item?.quantity ?? 0),
      0,
    );

    this.progressionLabel = this.add
      .text(16, lowerHudY, `Run: ${progressionSummary.dungeonClears} clears | ${inventoryCount} loot | Upgrades C${progressionSummary.upgrades?.claws ?? 0}/W${progressionSummary.upgrades?.ward ?? 0}/G${progressionSummary.upgrades?.guard ?? 0}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffd98e',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.villageActionLabel = this.add
      .text(16, lowerHudY + 48, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#d7f171',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(false);

    this.rewardLabel = this.add
      .text(16, lowerHudY + 24, this.rewardSummaryText ? `Latest reward: ${this.rewardSummaryText}` : 'Latest reward: none yet', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c8ffbc',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.inventoryOverlay = new InventoryOverlay(this, getPlaytestInventoryState(), {
      title: 'Field Inventory',
      subtitle: 'I / Tab toggle | Arrow keys or mouse select an item to read details',
    });
    this.shopUpgradeOverlay = new ShopUpgradeOverlay(this, {
      onAfterPurchase: (message) => {
        this.setVillageActionResult(message);
        this.refreshProgressionLabels();
      },
    });

    if (this.dungeonCompletionStatus === 'complete') {
      this.completionLabel.setText('Dungeon status: encounter completed.').setVisible(true);
    } else if (this.dungeonCompletionStatus === 'failed') {
      this.completionLabel.setText('Dungeon status: defeated, try again.').setVisible(true);
    }

    this.createMiniMap();
    this.createWalletCounter();

    this.portalZoneMarker = this.add
      .rectangle(
        this.layout.dungeonEntryWorld.x,
        this.layout.dungeonEntryWorld.y,
        this.layout.dungeonEntryZoneSize.width,
        this.layout.dungeonEntryZoneSize.height,
        0x4a7f2d,
        0.08,
      )
      .setDepth(419)
      .setStrokeStyle(2, 0xd7f171, 0.55);

    this.hud = new HUDController(this);

    // Subscribe to quest events for portal labeling + companion follow
    this._unsubQuestStart = this.questEventStream.onQuestStart((payload) => {
      this.onQuestStarted(payload);
    });

    // Initialize portal label from any in-progress active quest
    const existingQuestPayload = getLastQuestStartPayload();
    if (existingQuestPayload?.questTitle) {
      this.updatePortalLabel(existingQuestPayload.questTitle);
    }

    // C key opens lore codex
    this.codexKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.friendKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.creativeGalleryKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F9);
    this.creativeGrantKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.creativeEscKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.buildCreativeItemGallery();

    if (data?.questCompleted && data?.questTitle) {
      spawnQuestToast(this, {
        kind: 'quest_complete',
        title: data.questTitle,
        bodyLine: 'All floors cleared!',
      });
    }

    this.events.once('shutdown', () => {
      if (this.conversationOverlay) { this.conversationOverlay.destroy(); this.conversationOverlay = null; }
      if (this.friendOverlay) { this.friendOverlay.destroy(); this.friendOverlay = null; }
      this.destroyCreativeItemGallery();
      if (this.hud) { this.hud.destroy(); this.hud = null; }
      if (this._unsubQuestStart) { this._unsubQuestStart(); this._unsubQuestStart = null; }
      if (this.questEventStream) { this.questEventStream.dispose(); this.questEventStream = null; }
    });

    this.syncBridgeFriendshipState();
  }

  update() {
    if (this.creativeGalleryOpen) {
      this.updateCreativeItemGallery();
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      this.updateMiniMap();
      return;
    }

    if (this.conversationOverlay?.isOpen) {
      this.conversationOverlay.update();
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      this.updateMiniMap();
      return;
    }

    const editorHasFocus = this.devModeController?.update() ?? false;
    if (editorHasFocus) {
      if (!this.editorCameraDetached) {
        this.cameras.main.stopFollow();
        this.editorCameraDetached = true;
      }
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      this.updateMiniMap();
      return;
    }

    if (this.editorCameraDetached) {
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.editorCameraDetached = false;
    }

    if (this.inventoryOverlay?.update()) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      this.updateMiniMap();
      return;
    }

    if (this.shopUpgradeOverlay?.update()) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      this.updateMiniMap();
      return;
    }

    if (this.codexOverlay?.isOpen) {
      if (Phaser.Input.Keyboard.JustDown(this.codexKey)) {
        this.codexOverlay.close();
      } else {
        this.codexOverlay.update();
      }
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      this.updateMiniMap();
      return;
    }

    if (this.friendOverlay?.isOpen) {
      if (Phaser.Input.Keyboard.JustDown(this.friendKey)) {
        this.friendOverlay.close();
      }
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      this.updateMiniMap();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.codexKey)) {
      this.getCodexOverlay().open();
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      this.updateMiniMap();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.friendKey)) {
      this.getFriendOverlay().open();
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      this.updateMiniMap();
      return;
    }

    const nearestNpc = this.updateAiNpcInteraction();
    const nearestTownNpc = this.updateTownNpcInteraction();
    this.updateCompanionFollow();

    const left = this.keys.left.isDown || this.wasd.A.isDown;
    const right = this.keys.right.isDown || this.wasd.D.isDown;
    const up = this.keys.up.isDown || this.wasd.W.isDown;
    const down = this.keys.down.isDown || this.wasd.S.isDown;

    const dx = Number(right) - Number(left);
    const dy = Number(down) - Number(up);
    const speed = this.shiftKey.isDown ? PLAYER_SPEED * SPRINT_MULTIPLIER : PLAYER_SPEED;
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(speed);

    this.player.setVelocity(direction.x || 0, direction.y || 0);
    this.updateMiniMap();

    const inDungeonZone = this.physics.overlap(this.player, this.dungeonEntry);
    this.enterPrompt.setVisible(inDungeonZone);

    if (inDungeonZone && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      markFollowerTransitionPending();
      this.scene.start('dungeon', {
        returnX: this.layout.dungeonEntryWorld.x,
        returnY: this.layout.dungeonEntryWorld.y,
      });
      return;
    }

    if (nearestTownNpc && !nearestNpc && !inDungeonZone && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.handleTownNpcInteraction(nearestTownNpc);
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.creativeGalleryKey)) {
      this.openCreativeItemGallery();
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
      this.updateMiniMap();
      return;
    }

    if (nearestNpc && !inDungeonZone && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      const overlay = this.getActiveConversationOverlay();
      overlay.open(nearestNpc.config);
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame(this.lastDirection));
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

  renderGroundLayer() {
    for (let y = 0; y < this.layout.rows; y += 1) {
      for (let x = 0; x < this.layout.cols; x += 1) {
        const tile = this.layout.ground[y][x];
        const worldX = x * this.layout.tileSize + this.layout.tileSize / 2;
        const worldY = y * this.layout.tileSize + this.layout.tileSize / 2;

        const texture = this.getGroundTextureForCell(tile, x, y);
        const tint = this.getGroundTintForCell(tile, x, y);

        if (!texture) {
          continue;
        }

        const groundImage = this.add
          .image(worldX, worldY, texture)
          .setDisplaySize(this.layout.tileSize, this.layout.tileSize)
          .setDepth(0)
          .setAlpha(tile === TileKinds.GROUND_WATER ? 0.62 : 0.98)
          .setTint(tint);
        groundImage.setFlipX((this.hash2d(x + 5, y + 11) & 1) === 1);
        groundImage.setFlipY((this.hash2d(x + 13, y + 7) & 2) === 2);
      }
    }
  }

  getGroundTextureForCell(tile, x, y) {
    const grain = this.hash2d(x, y);

    if (tile === TileKinds.GROUND_PATH) {
      const pathTextures = ['overworld-path-a', 'overworld-path-b', 'overworld-path-c', 'overworld-path-d'];
      return pathTextures[grain % pathTextures.length];
    }

    if (tile === TileKinds.GROUND_TOWN) {
      return 'overworld-town-tile';
    }

    if (tile === TileKinds.GROUND_TRANSITION) {
      const transitionTextures = ['overworld-transition-a', 'overworld-transition-b'];
      return transitionTextures[grain % transitionTextures.length];
    }

    if (tile === TileKinds.GROUND_WATER) {
      return 'overworld-field-b';
    }

    const fieldTextures = ['overworld-field-a', 'overworld-field-b', 'overworld-field-c'];
    return fieldTextures[grain % fieldTextures.length];
  }

  getGroundTintForCell(tile, x, y) {
    const grain = this.hash2d(x + 17, y + 29) % 5;

    if (tile === TileKinds.GROUND_PATH) {
      const tints = [0xdab78e, 0xcfab7f, 0xc8a173, 0xd2b183, 0xcfa879];
      return tints[grain];
    }

    if (tile === TileKinds.GROUND_TOWN) {
      const tints = [0xd9c09c, 0xcfb38c, 0xc7aa82, 0xd5bc96, 0xcfb28d];
      return tints[grain];
    }

    if (tile === TileKinds.GROUND_TRANSITION) {
      const tints = [0xb9bf84, 0xadb673, 0xb4bc7d, 0xaeb878, 0xb7bf83];
      return tints[grain];
    }

    if (tile === TileKinds.GROUND_WATER) {
      const tints = [0x7fa58d, 0x789f8a, 0x719988, 0x83aa93, 0x789d86];
      return tints[grain];
    }

    const tints = [0xa3bd85, 0x97b578, 0x8faf70, 0x9db985, 0x95b174];
    return tints[grain];
  }

  renderTransitionLayer() {
    const graphics = this.add.graphics();
    graphics.setDepth(150);

    for (let y = 0; y < this.layout.rows; y += 1) {
      for (let x = 0; x < this.layout.cols; x += 1) {
        if (this.layout.ground[y][x] !== TileKinds.GROUND_TRANSITION) {
          continue;
        }

        const worldX = x * this.layout.tileSize;
        const worldY = y * this.layout.tileSize;
        graphics.fillStyle(0xd2c181, 0.2);
        graphics.fillRect(worldX + 6, worldY + 6, this.layout.tileSize - 12, this.layout.tileSize - 12);
      }
    }
  }

  renderPondShoreLayer() {
    const pondCells = this.layout.pondCells ?? [];
    if (pondCells.length === 0) {
      return;
    }

    const waterKeys = new Set(pondCells.map((cell) => `${cell.x},${cell.y}`));
    const graphics = this.add.graphics().setDepth(20);
    const waterGraphics = this.add.graphics().setDepth(22);
    const minX = Math.min(...pondCells.map((cell) => cell.x));
    const maxX = Math.max(...pondCells.map((cell) => cell.x));
    const minY = Math.min(...pondCells.map((cell) => cell.y));
    const maxY = Math.max(...pondCells.map((cell) => cell.y));
    const pondCenterX = (minX + maxX + 1) * this.layout.tileSize / 2;
    const pondCenterY = (minY + maxY + 1) * this.layout.tileSize / 2;
    const pondWidth = (maxX - minX + 1) * this.layout.tileSize;
    const pondHeight = (maxY - minY + 1) * this.layout.tileSize;

    graphics.fillStyle(0x566941, 0.28);
    graphics.fillEllipse(pondCenterX, pondCenterY + 10, pondWidth * 1.12, pondHeight * 1.02);
    graphics.fillStyle(0xc0b579, 0.46);
    graphics.fillEllipse(pondCenterX, pondCenterY + 4, pondWidth * 1.02, pondHeight * 0.9);
    waterGraphics.fillStyle(0x4f95aa, 0.82);
    waterGraphics.fillEllipse(pondCenterX, pondCenterY + 2, pondWidth * 0.86, pondHeight * 0.68);
    waterGraphics.fillStyle(0x77bfd1, 0.26);
    waterGraphics.fillEllipse(pondCenterX - 20, pondCenterY - 8, pondWidth * 0.46, pondHeight * 0.22);
    waterGraphics.fillStyle(0x2f7187, 0.2);
    waterGraphics.fillEllipse(pondCenterX + 18, pondCenterY + 16, pondWidth * 0.55, pondHeight * 0.2);

    for (const cell of pondCells) {
      const x = cell.x * this.layout.tileSize;
      const y = cell.y * this.layout.tileSize;
      const centerX = x + this.layout.tileSize / 2;
      const centerY = y + this.layout.tileSize / 2;
      const grain = this.hash2d(cell.x + 503, cell.y + 211);
      const nearTop = !waterKeys.has(`${cell.x},${cell.y - 1}`);
      const nearBottom = !waterKeys.has(`${cell.x},${cell.y + 1}`);
      const nearLeft = !waterKeys.has(`${cell.x - 1},${cell.y}`);
      const nearRight = !waterKeys.has(`${cell.x + 1},${cell.y}`);

      if (nearTop) {
        graphics.fillStyle(0xd4c58f, 0.32);
        graphics.fillEllipse(centerX, y + 4, this.layout.tileSize * 0.82, 7 + (grain % 3));
      }

      if (nearBottom) {
        graphics.fillStyle(0x6f8b57, 0.28);
        graphics.fillEllipse(centerX, y + this.layout.tileSize - 3, this.layout.tileSize * 0.8, 7 + (grain % 3));
      }

      if (nearLeft) {
        graphics.fillStyle(0x7d9d64, 0.22);
        graphics.fillEllipse(x + 3, centerY, 7 + (grain % 2), this.layout.tileSize * 0.72);
      }

      if (nearRight) {
        graphics.fillStyle(0x9faa75, 0.22);
        graphics.fillEllipse(x + this.layout.tileSize - 3, centerY, 7 + (grain % 2), this.layout.tileSize * 0.72);
      }
    }

    for (let i = 0; i < 8; i += 1) {
      const rx = pondCenterX - pondWidth * 0.28 + i * pondWidth * 0.08;
      const ry = pondCenterY - 4 + ((i % 3) - 1) * 18;
      waterGraphics.fillStyle(0xbce5ef, 0.16);
      waterGraphics.fillEllipse(rx, ry, 18 + (i % 3) * 6, 3);
    }
  }

  renderGroundDetailLayer() {
    for (let y = 0; y < this.layout.rows; y += 1) {
      for (let x = 0; x < this.layout.cols; x += 1) {
        const tile = this.layout.ground[y][x];
        const grain = this.hash2d(x + 91, y + 47);
        const worldX = x * this.layout.tileSize + this.layout.tileSize / 2;
        const worldY = y * this.layout.tileSize + this.layout.tileSize / 2;

        if (tile === TileKinds.GROUND_PATH && grain % 9 === 0) {
          this.add
            .ellipse(worldX + ((grain % 5) - 2), worldY + ((grain >> 3) % 4) + 7, 6, 3, 0x8f6f46, 0.35)
            .setDepth(18);
          continue;
        }

        if (tile === TileKinds.GROUND_TRANSITION && grain % 11 === 0) {
          this.add
            .ellipse(worldX + ((grain % 3) - 1), worldY + 6, 5, 2, 0xb6c07f, 0.28)
            .setDepth(17);
          continue;
        }

        if (tile === TileKinds.GROUND_WATER && grain % 19 === 0) {
          this.add
            .ellipse(worldX, worldY + ((grain % 3) - 1), 12 + (grain % 4), 2, 0xbfe4f6, 0.16)
            .setDepth(14);
        }
      }
    }
  }

  renderAtmosphereLayer() {
    const worldMidX = this.layout.worldWidth / 2;
    const worldMidY = this.layout.worldHeight / 2;

    // Soft daylight wash to reduce flatness while keeping readability.
    this.add
      .ellipse(worldMidX - 120, worldMidY - 220, this.layout.worldWidth * 0.95, this.layout.worldHeight * 0.8, 0xfff4d4, 0.07)
      .setDepth(190);

    this.add
      .ellipse(worldMidX + 220, worldMidY + 120, this.layout.worldWidth * 0.8, this.layout.worldHeight * 0.72, 0x8fc8e0, 0.05)
      .setDepth(191);

    for (let i = 0; i < 18; i += 1) {
      const xCell = 6 + i * 4;
      const yCell = 8 + ((i * 3) % 18);
      const worldX = xCell * this.layout.tileSize;
      const worldY = yCell * this.layout.tileSize;
      const alpha = 0.035 + (this.hash2d(xCell, yCell) % 8) * 0.004;

      this.add
        .ellipse(worldX, worldY, 140, 52, 0xffffff, alpha)
        .setDepth(192);
    }
  }

  renderCollisionLayer() {
    const graphics = this.add.graphics();
    graphics.setDepth(200);

    for (let y = 0; y < this.layout.rows; y += 1) {
      for (let x = 0; x < this.layout.cols; x += 1) {
        if (!this.layout.blocked[y][x]) {
          continue;
        }

        const worldX = x * this.layout.tileSize;
        const worldY = y * this.layout.tileSize;
        graphics.fillStyle(0x2a1f16, 0.14);
        graphics.fillRect(worldX, worldY, this.layout.tileSize, this.layout.tileSize);
        graphics.lineStyle(1, 0xa78662, 0.5);
        graphics.strokeRect(worldX + 1, worldY + 1, this.layout.tileSize - 2, this.layout.tileSize - 2);
      }
    }

    for (const rect of this.layout.collisionRects ?? []) {
      graphics.fillStyle(0x572a1f, 0.18);
      graphics.fillRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height);
      graphics.lineStyle(1, 0xffd27d, 0.6);
      graphics.strokeRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height);
    }
  }

  renderDecorLayer() {
    for (const item of this.layout.decorItems) {
      if (item.layer !== 'decor') {
        continue;
      }

      const worldX = item.x * this.layout.tileSize + this.layout.tileSize / 2;
      const worldY = item.y * this.layout.tileSize + this.layout.tileSize / 2;
      const grain = this.hash2d(item.x, item.y);
      const xJitter = (grain % 5) - 2;
      const yJitter = ((grain >> 3) % 5) - 2;

      if (item.kind === 'flower') {
        this.add
          .image(worldX + xJitter, worldY + 6 + yJitter, grain % 2 === 0 ? 'overworld-grass-1' : 'overworld-grass-6')
          .setDisplaySize(20, 15)
          .setDepth(306)
          .setTint(grain % 2 === 0 ? 0xf0d38c : 0xd8a1db)
          .setAlpha(0.94);
        continue;
      }

      if (item.kind === 'reeds') {
        this.add.rectangle(worldX - 5, worldY + 7, 3, 20, 0x526d38, 0.9).setRotation(-0.22).setDepth(306);
        this.add.rectangle(worldX, worldY + 6, 3, 22, 0x6b7b3d, 0.9).setDepth(307);
        this.add.rectangle(worldX + 6, worldY + 7, 3, 19, 0x586f36, 0.9).setRotation(0.2).setDepth(306);
        this.add.ellipse(worldX, worldY + 16, 22, 8, 0x000000, 0.13).setDepth(305);
        continue;
      }

      if (item.kind === 'town-sign') {
        this.add.rectangle(worldX, worldY + 8, 4, 24, 0x6b452b, 1).setDepth(307);
        this.add.rectangle(worldX, worldY - 5, 26, 14, 0x9f7045, 1).setStrokeStyle(2, 0x4d321f, 0.9).setDepth(308);
        this.add.rectangle(worldX, worldY - 5, 17, 2, 0xe0bd7f, 0.75).setDepth(309);
        continue;
      }

      if (item.kind === 'town-well') {
        this.add.ellipse(worldX, worldY + 14, 34, 12, 0x000000, 0.2).setDepth(305);
        this.add.circle(worldX, worldY + 3, 15, 0x817568, 1).setStrokeStyle(3, 0x4c4036, 0.9).setDepth(307);
        this.add.circle(worldX, worldY + 3, 8, 0x223844, 0.86).setDepth(308);
        this.add.rectangle(worldX - 14, worldY - 11, 5, 22, 0x6b452b, 1).setDepth(307);
        this.add.rectangle(worldX + 14, worldY - 11, 5, 22, 0x6b452b, 1).setDepth(307);
        this.add.rectangle(worldX, worldY - 24, 36, 6, 0x8a5a3a, 1).setDepth(308);
        continue;
      }

      if (item.kind === 'town-fountain') {
        this.add.ellipse(worldX, worldY + 14, 48, 16, 0x000000, 0.18).setDepth(305);
        this.add.ellipse(worldX, worldY + 6, 42, 22, 0x7b756b, 1).setStrokeStyle(3, 0x4f4a43, 0.88).setDepth(307);
        this.add.ellipse(worldX, worldY + 4, 30, 13, 0x7fc6dc, 0.72).setDepth(308);
        this.add.circle(worldX, worldY - 5, 6, 0xb6dbe5, 0.9).setDepth(309);
        continue;
      }

      if (item.kind === 'flower-bed') {
        this.add.rectangle(worldX, worldY + 8, 44, 14, 0x5b3a22, 0.92).setStrokeStyle(2, 0x382313, 0.82).setDepth(306);
        this.add.circle(worldX - 13, worldY + 5, 5, 0xf0d38c, 0.95).setDepth(307);
        this.add.circle(worldX, worldY + 4, 5, 0xd8a1db, 0.95).setDepth(307);
        this.add.circle(worldX + 13, worldY + 6, 5, 0x9dd7ff, 0.9).setDepth(307);
        continue;
      }

      if (item.kind === 'crate-stack') {
        this.add.rectangle(worldX - 5, worldY + 8, 18, 16, 0x8c633a, 1).setStrokeStyle(2, 0x4f321c, 0.9).setDepth(307);
        this.add.rectangle(worldX + 10, worldY + 10, 16, 14, 0xa47745, 1).setStrokeStyle(2, 0x4f321c, 0.9).setDepth(307);
        this.add.rectangle(worldX + 2, worldY - 5, 16, 14, 0xb27d46, 1).setStrokeStyle(2, 0x4f321c, 0.9).setDepth(308);
        continue;
      }

      if (item.kind === 'shrine-lantern') {
        this.add.ellipse(worldX, worldY + 13, 24, 10, 0x000000, 0.2).setDepth(305);
        this.add.rectangle(worldX, worldY + 5, 10, 24, 0x4a5248, 1).setStrokeStyle(2, 0x20261f, 0.85).setDepth(307);
        this.add.circle(worldX, worldY + 1, 7, 0xffd36f, 0.72).setDepth(308);
        this.add.circle(worldX, worldY + 1, 16, 0xffd36f, 0.16).setDepth(306);
        continue;
      }

      let grassTexture = grain % 2 === 0 ? 'overworld-grass-1' : 'overworld-grass-6';
      let width = 22 + (grain % 5);
      let height = 16 + (grain % 3);

      if (item.kind === 'portal-stone' || item.kind === 'pond-stone') {
        grassTexture = 'overworld-stone-3';
        width = item.kind === 'portal-stone' ? 30 : 24;
        height = item.kind === 'portal-stone' ? 22 : 18;
      }

      this.add
        .image(worldX + xJitter, worldY + 4 + yJitter, grassTexture)
        .setDisplaySize(width, height)
        .setDepth(306)
        .setAlpha(item.kind === 'portal-stone' ? 0.98 : 0.9);
    }
  }

  renderAmbientLifeLayer() {
    for (const item of this.layout.ambientItems) {
      const worldX = item.x * this.layout.tileSize + this.layout.tileSize / 2;
      const worldY = item.y * this.layout.tileSize + this.layout.tileSize / 2;

      if (item.kind === 'foliage-sway') {
        const leaf = this.add
          .image(worldX, worldY + 4, 'overworld-grass-6')
          .setDisplaySize(20, 16)
          .setDepth(312);
        this.tweens.add({
          targets: leaf,
          x: worldX + 3,
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
        continue;
      }

      if (item.kind === 'torch-fx') {
        const glow = this.add.circle(worldX, worldY + 2, 7, 0xffda6f, 0.33).setDepth(318);
        this.tweens.add({
          targets: glow,
          alpha: { from: 0.2, to: 0.48 },
          scale: { from: 0.85, to: 1.2 },
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
        continue;
      }

      if (item.kind === 'water-loop') {
        const ripple = this.add.ellipse(worldX, worldY, 12, 4, 0x9ddaf3, 0.45).setDepth(130);
        this.tweens.add({
          targets: ripple,
          alpha: { from: 0.16, to: 0.5 },
          width: { from: 8, to: 18 },
          duration: 1250,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
        continue;
      }

      if (item.kind === 'critter-loop') {
        const critter = this.add
          .sprite(worldX - 6, worldY + 1, 'slime-idle', 0)
          .setScale(0.28)
          .setDepth(314);
        this.tweens.add({
          targets: critter,
          x: worldX + 6,
          duration: 1700,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
      }
    }
  }

  renderForegroundLayer() {
    for (const item of this.layout.decorItems) {
      if (item.layer !== 'foreground') {
        continue;
      }

      const worldX = item.x * this.layout.tileSize + this.layout.tileSize / 2;
      const worldY = item.y * this.layout.tileSize + this.layout.tileSize / 2;

      if (item.kind === 'town-hall') {
        this.renderTownHall(worldX, worldY);
      } else if (item.kind === 'guild-hall-exterior') {
        this.add
          .image(worldX, worldY - 20, 'guild-hall-exterior')
          .setDepth(worldY + 150)
          .setScale(0.44 * VILLAGE_STRUCTURE_SCALE);
      } else if (item.kind === 'house-1') {
        this.add
          .image(worldX, worldY - 8, 'overworld-house-1')
          .setDepth(worldY + 120)
          .setScale(0.76 * VILLAGE_STRUCTURE_SCALE);
      } else if (item.kind === 'house-2') {
        this.add
          .image(worldX, worldY - 8, 'overworld-house-2')
          .setDepth(worldY + 120)
          .setScale(0.68 * VILLAGE_STRUCTURE_SCALE);
      } else if (item.kind === 'house-3') {
        this.add
          .image(worldX, worldY - 8, 'overworld-house-3')
          .setDepth(worldY + 120)
          .setScale(0.64 * VILLAGE_STRUCTURE_SCALE);
      } else if (item.kind === 'house-4') {
        this.add
          .image(worldX, worldY - 8, 'overworld-house-4')
          .setDepth(worldY + 120)
          .setScale(0.64 * VILLAGE_STRUCTURE_SCALE);
      } else if (item.kind === 'mega-tree') {
        this.add.ellipse(worldX, worldY + 11, 34, 16, 0x000000, 0.24).setDepth(worldY + 101);
        this.add
          .image(worldX, worldY - 26, 'forest-mega-tree-1')
          .setDepth(worldY + 130)
          .setScale(0.62);
      } else if (item.kind === 'willow-tree') {
        this.add.ellipse(worldX, worldY + 9, 26, 12, 0x000000, 0.2).setDepth(worldY + 101);
        this.add
          .image(worldX, worldY - 12, 'forest-willow-1')
          .setDepth(worldY + 125)
          .setScale(0.88);
      } else if (item.kind === 'tower-pad-1') {
        this.add.ellipse(worldX, worldY + 11, 54, 22, 0x000000, 0.18).setDepth(worldY + 101);
        this.add
          .image(worldX, worldY - 2, 'overworld-tower-pad-1')
          .setDepth(worldY + 116)
          .setScale(0.88);
      } else if (item.kind === 'tower-pad-2') {
        this.add.ellipse(worldX, worldY + 11, 48, 20, 0x000000, 0.18).setDepth(worldY + 101);
        this.add
          .image(worldX, worldY - 1, 'overworld-tower-pad-2')
          .setDepth(worldY + 116)
          .setScale(0.92);
      } else if (item.kind === 'village-gazebo') {
        this.add.ellipse(worldX, worldY + 14, 72, 22, 0x000000, 0.18).setDepth(worldY + 101);
        this.add
          .image(worldX, worldY - 15, 'forest-living-gazebo-1')
          .setDepth(worldY + 124)
          .setScale(0.52 * VILLAGE_STRUCTURE_SCALE);
      } else if (item.kind === 'tent-1') {
        this.add
          .image(worldX, worldY - 4, 'overworld-tent-1')
          .setDepth(worldY + 110)
          .setScale(0.78 * VILLAGE_STRUCTURE_SCALE);
      } else if (item.kind === 'tent-2') {
        this.add
          .image(worldX, worldY - 4, 'overworld-tent-2')
          .setDepth(worldY + 110)
          .setScale(0.78 * VILLAGE_STRUCTURE_SCALE);
      } else if (item.kind === 'tent-3') {
        this.add
          .image(worldX, worldY - 4, 'overworld-tent-3')
          .setDepth(worldY + 110)
          .setScale(0.78 * VILLAGE_STRUCTURE_SCALE);
      } else if (item.kind === 'tent-4') {
        this.add
          .image(worldX, worldY - 4, 'overworld-tent-4')
          .setDepth(worldY + 110)
          .setScale(0.78 * VILLAGE_STRUCTURE_SCALE);
      } else {
        this.add
          .image(worldX, worldY - 8, 'overworld-house-2')
          .setDepth(worldY + 120)
          .setScale(0.93 * VILLAGE_STRUCTURE_SCALE);
      }
    }
  }

  renderTownHall(worldX, worldY) {
    const depth = worldY + 145;
    this.add.ellipse(worldX, worldY + 24, 170, 46, 0x000000, 0.22).setDepth(depth - 22);

    this.add
      .image(worldX, worldY - 20, 'overworld-house-2')
      .setDepth(depth)
      .setScale(1.05 * VILLAGE_STRUCTURE_SCALE);

    this.add.rectangle(worldX, worldY - 54, 76, 12, 0x7f2f2a, 0.95)
      .setStrokeStyle(2, 0x4a221f, 0.9)
      .setDepth(depth + 1);
    this.add.rectangle(worldX, worldY - 54, 56, 3, 0xd48743, 0.9).setDepth(depth + 2);

    this.add.rectangle(worldX, worldY + 17, 54, 18, 0x5b3823, 0.96)
      .setStrokeStyle(2, 0x2b1c13, 0.9)
      .setDepth(depth + 3);
    this.add.text(worldX, worldY + 7, 'HALL', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#f8e0a0',
    }).setOrigin(0.5, 0).setDepth(depth + 4);

    this.add.rectangle(worldX - 56, worldY + 9, 9, 28, 0xe9d6a6, 0.95)
      .setStrokeStyle(2, 0x6a4b31, 0.85)
      .setDepth(depth + 2);
    this.add.rectangle(worldX + 56, worldY + 9, 9, 28, 0xe9d6a6, 0.95)
      .setStrokeStyle(2, 0x6a4b31, 0.85)
      .setDepth(depth + 2);

    this.add.circle(worldX, worldY - 39, 9, 0xf0c15e, 0.95)
      .setStrokeStyle(2, 0x5a3522, 0.9)
      .setDepth(depth + 3);
  }

  renderAiNpcs() {
    if (this.aiNpcs?.length) {
      for (const entry of this.aiNpcs) {
        entry.shadow?.destroy();
        entry.prompt?.destroy();
        entry.sprite?.destroy();
      }
    }
    const npcs = this.getRenderableFriendNpcs();
    this.aiNpcs = [];

    for (const npc of npcs) {
      const worldX = npc.world.x;
      const worldY = npc.world.y;
      const animKey = `${npc.spriteKey}-loop`;
      if (!this.anims.exists(animKey)) {
        const tex = this.textures.get(npc.spriteKey);
        const totalFrames = tex?.frameTotal ? Math.max(1, tex.frameTotal - 1) : 1;
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(npc.spriteKey, {
            start: 0,
            end: Math.max(0, totalFrames - 1),
          }),
          frameRate: 6,
          repeat: -1,
        });
      }

      const shadow = this.add.ellipse(worldX, worldY + 18, 36, 14, 0x000000, 0.28).setDepth(worldY + 105);
      const sprite = this.add
        .sprite(worldX, worldY, npc.spriteKey, 0)
        .setDepth(worldY + 120)
        .setScale(npc.scale ?? AI_NPC_WORLD_SCALE);
      if (npc.tint) {
        sprite.setTint(npc.tint);
      }
      sprite.anims.play(animKey, true);

      const prompt = this.add
        .text(worldX, worldY - 36, '[ E ]', {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#fff7d9',
          backgroundColor: '#3a2a16',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5, 1)
        .setDepth(worldY + 130)
        .setVisible(false);

      this.aiNpcs.push({ config: npc, sprite, prompt, shadow, worldX, worldY });
    }
  }

  getActiveConversationOverlay() {
    if (!this.conversationOverlay) {
      this.conversationOverlay = new ConversationOverlay(this);
    }
    return this.conversationOverlay;
  }

  getCodexOverlay() {
    if (!this.codexOverlay) {
      this.codexOverlay = new LoreCodexOverlay(this);
    }
    return this.codexOverlay;
  }

  getFriendOverlay() {
    if (!this.friendOverlay) {
      this.friendOverlay = new FriendRosterOverlay(this);
    }
    return this.friendOverlay;
  }

  buildCreativeItemGallery() {
    this.creativeItems = Object.values(INVENTORY_ITEM_DEFS);
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const panelWidth = Math.min(1120, width - 48);
    const panelHeight = Math.min(620, height - 48);
    const panelLeft = centerX - panelWidth / 2;
    const panelTop = centerY - panelHeight / 2;
    const columns = 7;
    const cellWidth = Math.floor((panelWidth - 64) / columns);
    const cellHeight = 102;
    const gridLeft = panelLeft + 32;
    const gridTop = panelTop + 84;

    this.creativeGalleryElements = [];
    this.creativeGalleryCells = [];

    this.creativeBackdrop = this.add.rectangle(centerX, centerY, width, height, 0x061018, 0.82);
    this.creativePanel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0xe8d1a2, 0.98)
      .setStrokeStyle(4, 0x55361f, 0.95);
    this.creativeTitle = this.add.text(panelLeft + 26, panelTop + 20, 'Creative Item Gallery', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#20311c',
    });
    this.creativeHelp = this.add.text(panelLeft + 26, panelTop + 50, 'F9 / Esc close | Arrow keys inspect | Enter adds selected item', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#36503a',
    });
    this.creativeDetail = this.add.text(panelLeft + 26, panelTop + panelHeight - 60, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#2a2418',
      wordWrap: { width: panelWidth - 52 },
    });

    this.creativeGalleryElements.push(
      this.creativeBackdrop,
      this.creativePanel,
      this.creativeTitle,
      this.creativeHelp,
      this.creativeDetail,
    );

    for (let index = 0; index < this.creativeItems.length; index += 1) {
      const item = this.creativeItems[index];
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = gridLeft + col * cellWidth + cellWidth / 2;
      const y = gridTop + row * cellHeight + 44;

      const box = this.add.rectangle(x, y, cellWidth - 12, 88, 0xf4e5bb, 1)
        .setStrokeStyle(2, 0x8a623a, 0.9);
      const icon = this.add.image(x, y - 18, item.iconTexture ?? 'ui-inventory-icons', 0)
        .setDisplaySize(34, 34);
      if (Number.isInteger(item.iconFrame)) {
        icon.setFrame(item.iconFrame ?? 0);
      }
      const name = this.add.text(x, y + 12, item.name, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#2a2418',
        align: 'center',
        wordWrap: { width: cellWidth - 24 },
      }).setOrigin(0.5, 0);
      const type = this.add.text(x, y + 48, item.type, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#5f5037',
      }).setOrigin(0.5, 0);

      this.creativeGalleryCells.push({ box, icon, name, type });
      this.creativeGalleryElements.push(box, icon, name, type);
    }

    for (const element of this.creativeGalleryElements) {
      element.setScrollFactor(0);
      element.setDepth(23000);
      element.setVisible(false);
    }
  }

  destroyCreativeItemGallery() {
    for (const element of this.creativeGalleryElements ?? []) {
      try { element.destroy(); } catch { /* ignore */ }
    }
    this.creativeGalleryElements = [];
    this.creativeGalleryCells = [];
  }

  openCreativeItemGallery() {
    this.creativeGalleryOpen = true;
    this.setCreativeItemGalleryVisible(true);
    this.refreshCreativeItemGallery();
  }

  closeCreativeItemGallery() {
    this.creativeGalleryOpen = false;
    this.setCreativeItemGalleryVisible(false);
  }

  setCreativeItemGalleryVisible(visible) {
    for (const element of this.creativeGalleryElements ?? []) {
      element.setVisible(visible);
    }
  }

  updateCreativeItemGallery() {
    if (
      Phaser.Input.Keyboard.JustDown(this.creativeGalleryKey) ||
      Phaser.Input.Keyboard.JustDown(this.creativeEscKey)
    ) {
      this.closeCreativeItemGallery();
      return;
    }

    const columns = 7;
    let moved = false;
    if (Phaser.Input.Keyboard.JustDown(this.keys.left)) {
      this.creativeGallerySelection = Phaser.Math.Wrap(this.creativeGallerySelection - 1, 0, this.creativeItems.length);
      moved = true;
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.right)) {
      this.creativeGallerySelection = Phaser.Math.Wrap(this.creativeGallerySelection + 1, 0, this.creativeItems.length);
      moved = true;
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.up)) {
      this.creativeGallerySelection = Phaser.Math.Wrap(this.creativeGallerySelection - columns, 0, this.creativeItems.length);
      moved = true;
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.down)) {
      this.creativeGallerySelection = Phaser.Math.Wrap(this.creativeGallerySelection + columns, 0, this.creativeItems.length);
      moved = true;
    }

    if (Phaser.Input.Keyboard.JustDown(this.creativeGrantKey)) {
      const item = this.creativeItems[this.creativeGallerySelection];
      const quantity = item.id === 'sun-coins' ? 99 : 5;
      grantInventoryItem(item.id, quantity);
      this.setVillageActionResult(`Creative added +${quantity} ${item.name}.`);
      this.refreshProgressionLabels();
      this.inventoryOverlay?.refresh();
    }

    if (moved) {
      this.refreshCreativeItemGallery();
    }
  }

  refreshCreativeItemGallery() {
    for (let index = 0; index < this.creativeGalleryCells.length; index += 1) {
      const selected = index === this.creativeGallerySelection;
      const cell = this.creativeGalleryCells[index];
      cell.box.setFillStyle(selected ? 0xe7efc3 : 0xf4e5bb, 1);
      cell.box.setStrokeStyle(2, selected ? 0x4bb27f : 0x8a623a, selected ? 1 : 0.9);
      cell.icon.setAlpha(selected ? 1 : 0.88);
    }

    const item = this.creativeItems[this.creativeGallerySelection];
    this.creativeDetail?.setText(`${item.name} | ${item.type} | ${item.id} - ${item.description}`);
  }

  getRenderableFriendNpcs() {
    const active = getActiveCharacterState();
    const followState = getFollowState();
    const completed = new Set(active.completedNpcIds ?? []);
    const renderables = [];
    const usedPlacements = new Set();

    const pushRenderable = (npcId, placement) => {
      if (!npcId || !placement || usedPlacements.has(placement.placementId)) return;
      if (followState.shouldFollow && active.activeNpcId === npcId) return;
      const config = resolveNpcConfig(npcId);
      if (!config) return;
      usedPlacements.add(placement.placementId);
      renderables.push({
        ...config,
        placementId: placement.placementId,
        placementRole: placement.placementRole,
        world: worldFromTile(placement.tile),
      });
    };

    let completedIndex = 0;
    for (const npcId of completed) {
      pushRenderable(npcId, FRIEND_NPC_ANCHORS.completed[completedIndex] ?? FRIEND_NPC_ANCHORS.completed.at(-1));
      completedIndex += 1;
    }

    const pendingUnlockNpcId = active.pendingUnlockNpcId ?? null;
    if (pendingUnlockNpcId && !completed.has(pendingUnlockNpcId)) {
      pushRenderable(pendingUnlockNpcId, FRIEND_NPC_ANCHORS.unlocked[0]);
    } else if (active.activeNpcId && !completed.has(active.activeNpcId)) {
      pushRenderable(active.activeNpcId, FRIEND_NPC_ANCHORS.active[0]);
    }

    return renderables;
  }

  async syncBridgeFriendshipState() {
    try {
      const [activeCharacter, roster] = await Promise.all([
        fetchActiveCharacterState(),
        fetchFriendRoster(),
      ]);
      if (activeCharacter) {
        const localActive = getActiveCharacterState();
        setActiveCharacterState({
          ...activeCharacter,
          starterNpcId: localActive.starterNpcId,
          starterArchetype: localActive.starterArchetype,
          unlockedNpcIds: Array.from(new Set([
            ...(localActive.unlockedNpcIds ?? []),
            ...(activeCharacter.unlockedNpcIds ?? []),
          ])),
          completedNpcIds: Array.from(new Set([
            ...(localActive.completedNpcIds ?? []),
            ...(activeCharacter.completedNpcIds ?? []),
          ])),
          shouldFollow: localActive.shouldFollow,
          followMode: localActive.followMode,
          followTarget: localActive.followTarget,
          transitionResumePending: localActive.transitionResumePending,
        });
      }
      if (roster?.friends) {
        setFriendRoster(roster.friends);
      }
      this.renderAiNpcs();
    } catch {
      // Best-effort sync; local state remains usable offline.
    }
  }

  handleFriendshipUpdate(update) {
    const applied = applyFriendshipUpdate(update);
    if (applied?.rewardSummaryText) {
      this.rewardSummaryText = applied.rewardSummaryText;
      this.rewardLabel?.setText(`Latest reward: ${applied.rewardSummaryText}`);
    }
    this.renderAiNpcs();
    this.questEventStream?.emitFriendUnlock?.(update);
    spawnQuestToast(this, {
      kind: 'quest_complete',
      title: `${update.displayName} became a friend`,
      bodyLine: update.newlyUnlockedNpcId
        ? 'A new character is waiting somewhere in the overworld.'
        : 'Friendship rewards granted.',
    });
  }

  async handleFriendSummaryUpdated(_npcId) {
    try {
      const roster = await fetchFriendRoster();
      if (roster?.friends) {
        setFriendRoster(roster.friends);
        this.questEventStream?.emitFriendSummaryUpdated?.({
          npcId: _npcId,
          deferredResolved: false,
        });
      }
    } catch {
      // Non-blocking UI refresh.
    }
  }

  onQuestStarted(payload) {
    if (!this.scene?.isActive()) return;

    const questTitle = payload?.questTitle ?? payload?.questId ?? 'Quest';
    this.updatePortalLabel(questTitle);

    // Build quest run state from the 3-floor pool
    this.buildQuestRunState(payload);

    // Activate companion follow if NPC sprite is available
    this.activateCompanionFollow(payload);
  }

  updatePortalLabel(title) {
    if (this.questPortalLabel) {
      this.questPortalLabel.destroy();
      this.questPortalLabel = null;
    }
    if (!title) return;
    const x = this.layout.dungeonEntryWorld.x;
    const y = this.layout.dungeonEntryWorld.y;
    this.questPortalLabel = this.add
      .text(x, y - 52, title, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#d7f171',
        backgroundColor: '#1d2d19cc',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(440)
      .setScrollFactor(1);
  }

  buildQuestRunState(payload) {
    // Select 3 floor IDs from the curated pool deterministically
    const poolLayouts = this.getAvailableFloorIds();
    const floorIds = this.pickThreeFloors(poolLayouts, payload?.questId ?? '');
    const runState = {
      isActive: true,
      questId: payload?.questId ?? 'unknown_quest',
      questTitle: payload?.questTitle ?? 'Quest',
      character: payload?.character ?? 'general',
      floorIds,
      currentFloorIndex: 0,
      totalEnemiesDefeated: 0,
      totalChestsOpened: 0,
      startedAt: new Date().toISOString(),
    };
    setQuestRunState(runState);
  }

  getAvailableFloorIds() {
    return ['atrium-chain', 'sundered-halls', 'ring-galleries', 'split-sanctum', 'lantern-way'];
  }

  pickThreeFloors(poolIds, seed) {
    // Simple deterministic selection of 3 floors from available IDs
    const CURATED_IDS = ['atrium-chain', 'sundered-halls', 'ring-galleries', 'split-sanctum', 'lantern-way'];
    const available = poolIds.length >= 3 ? poolIds : CURATED_IDS;
    const hash = (str) => str.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7);
    const h = hash(seed);
    const first = h % available.length;
    const second = (h + 1) % available.length;
    const third = (h + 2) % available.length;
    return [
      available[first],
      available[second !== first ? second : (second + 1) % available.length],
      available[third !== first && third !== second ? third : (third + 2) % available.length],
    ];
  }

  restoreCompanionFollowFromState() {
    const followState = getFollowState();
    if (!followState.shouldFollow) {
      this.companionFollowActive = false;
      if (this.companionFollowSprite) {
        this.companionFollowSprite.destroy();
        this.companionFollowSprite = null;
      }
      return;
    }

    if (followState.transitionResumePending) {
      restoreFollowerAfterTransition();
    }
    this.activateCompanionFollow({ npcId: followState.npcId });
  }

  ensureCompanionFollowSprite(npcConfig) {
    if (!npcConfig || !this.player) return;
    const followOffsetX = -28;
    const followOffsetY = 4;
    const animKey = `${npcConfig.walkKey ?? npcConfig.spriteKey}-loop`;
    const textureKey = npcConfig.walkKey ?? npcConfig.spriteKey;
    if (!this.anims.exists(animKey)) {
      const tex = this.textures.get(textureKey);
      const totalFrames = tex?.frameTotal ? Math.max(1, tex.frameTotal - 1) : 1;
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: Math.max(0, totalFrames - 1) }),
        frameRate: 6,
        repeat: -1,
      });
    }

    if (this.companionFollowSprite?.texture?.key !== textureKey) {
      this.companionFollowSprite?.destroy();
      this.companionFollowSprite = this.add
        .sprite(this.player.x + followOffsetX, this.player.y + followOffsetY, textureKey, 0)
        .setDepth(this.player.y + 118)
        .setScale(npcConfig.scale ?? AI_NPC_WORLD_SCALE);
      this.companionFollowSprite.anims.play(animKey, true);
    }
  }

  activateCompanionFollow(payload = {}) {
    const npcConfig =
      resolveNpcConfig(payload?.npcId)
      ?? resolveNpcConfig(getActiveCharacterState().activeNpcId)
      ?? resolveNpcConfigForArchetype(payload?.character);
    if (!npcConfig) {
      this.companionFollowActive = false;
      this.companionFollowSprite = null;
      return;
    }
    activateFollowerForNpc(npcConfig.id);
    this.companionFollowActive = true;
    this.ensureCompanionFollowSprite(npcConfig);
    this.renderAiNpcs();
  }

  updateCompanionFollow() {
    if (!this.companionFollowActive || !this.companionFollowSprite || !this.player) return;
    const FOLLOW_SPEED = 320;
    const DESIRED_DIST = 40;
    const dx = this.player.x - this.companionFollowSprite.x;
    const dy = this.player.y - this.companionFollowSprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > DESIRED_DIST) {
      const t = Math.min(1, (dist - DESIRED_DIST) / 120);
      const moveX = (dx / dist) * FOLLOW_SPEED * t * (1 / 60);
      const moveY = (dy / dist) * FOLLOW_SPEED * t * (1 / 60);
      this.companionFollowSprite.x += moveX;
      this.companionFollowSprite.y += moveY;
      this.companionFollowSprite.setDepth(this.companionFollowSprite.y + 120);
      this.companionFollowSprite.anims.play(`${this.companionFollowSprite.texture.key}-loop`, true);
    } else {
      this.companionFollowSprite.anims.stop();
      this.companionFollowSprite.setFrame(0);
    }
    const followState = getFollowState();
    if (followState.transitionResumePending || followState.followMode !== 'active') {
      setFollowState({ followMode: 'active', transitionResumePending: false });
    }
  }

  updateAiNpcInteraction() {
    if (!this.aiNpcs?.length) return null;
    let nearest = null;
    let nearestDist = Infinity;
    for (const entry of this.aiNpcs) {
      const dx = this.player.x - entry.worldX;
      const dy = this.player.y - entry.worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inRange = dist <= entry.config.interactionRadius;
      entry.prompt.setVisible(inRange);
      if (inRange && dist < nearestDist) {
        nearestDist = dist;
        nearest = entry;
      }
    }
    return nearest;
  }

  renderTownNpcs() {
    const npcs = this.layout.townNpcs ?? [];
    this.townNpcEntries = [];

    for (const npc of npcs) {
      const worldX = npc.x * this.layout.tileSize + this.layout.tileSize / 2;
      const worldY = npc.y * this.layout.tileSize + this.layout.tileSize / 2;
      const pulse = 1200 + ((npc.x * 3 + npc.y) % 5) * 120;

      const actorScale = (npc.scale ?? 1.1) * TOWN_NPC_SCALE_MULTIPLIER;
      this.add.ellipse(worldX, worldY + 16, 34, 14, 0x000000, 0.24).setDepth(worldY + 105);

      const actor = this.add
        .sprite(worldX, worldY + 1, npc.sprite, npc.frame ?? 0)
        .setDepth(worldY + 120)
        .setScale(actorScale);
      if (npc.tint) {
        actor.setTint(npc.tint);
      }

      this.tweens.add({
        targets: actor,
        y: worldY - 2,
        duration: pulse + 160,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });

      const markerColor = npc.markerColor ?? 0xd7e7ff;
      const markerY = worldY - 23;
      const marker = this.add.circle(worldX, markerY, 4, markerColor, 0.86).setDepth(worldY + 130);
      this.add.rectangle(worldX, markerY, 12, 2, markerColor, 0.35).setDepth(worldY + 129);
      this.tweens.add({
        targets: marker,
        alpha: { from: 0.55, to: 0.95 },
        duration: pulse,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });

      const roleText = this.getTownRoleLabel(npc.role);
      this.add
        .text(worldX, worldY + 26, roleText, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#f3f3e2',
          backgroundColor: '#00000077',
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5, 0)
        .setDepth(worldY + 131);

      const prompt = this.add
        .text(worldX, worldY - 36, '[ E ]', {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#fff7d9',
          backgroundColor: '#3a2a16',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5, 1)
        .setDepth(worldY + 132)
        .setVisible(false);

      this.townNpcEntries.push({ config: npc, prompt, worldX, worldY });
    }
  }

  getTownRoleLabel(role) {
    const labels = {
      'blacksmith-stall': 'Upgrade Smith',
      scribe: 'Quest Records',
      'guard-captain': 'Training',
      'merchant-stall': 'Item Shop',
      'provisions-stall': 'Materials',
      'inn-host': 'Rest Point',
      'gate-watch': 'Dungeon Watch',
      healer: 'Healer',
      'pet-keeper': 'Companion Care',
      'house-elder': 'Quest Hub',
      'shrine-keeper': 'Dungeon Shrine',
    };
    return labels[role] ?? 'Village Role';
  }

  updateTownNpcInteraction() {
    if (!this.townNpcEntries?.length) {
      this.villageActionLabel?.setVisible(false);
      return null;
    }

    let nearest = null;
    let nearestDist = Infinity;
    for (const entry of this.townNpcEntries) {
      const dx = this.player.x - entry.worldX;
      const dy = this.player.y - entry.worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inRange = dist <= 42;
      entry.prompt.setVisible(inRange);
      if (inRange && dist < nearestDist) {
        nearestDist = dist;
        nearest = entry;
      }
    }

    if (nearest) {
      this.villageActionLabel
        ?.setText(this.getTownInteractionHint(nearest.config.role))
        .setVisible(true);
    } else {
      this.villageActionLabel?.setVisible(false);
    }

    return nearest;
  }

  getTownInteractionHint(role) {
    if (role === 'merchant-stall') {
      const shopState = getVillageShopState();
      const stock = shopState.find((entry) => entry.canBuy) ?? shopState[0];
      return `Shop: E buys ${stock.name} (${stock.canBuy ? 'ready' : 'need goods'})`;
    }
    if (role === 'provisions-stall') {
      const stock = getVillageShopState()[1];
      return `Shop: E buys ${stock.name} (${stock.canBuy ? 'ready' : 'need trade goods'})`;
    }
    if (role === 'blacksmith-stall') {
      const upgrade = getUpgradeProgressionState().find((entry) => entry.id === 'claws');
      return `Upgrade: E improves Claws rank ${upgrade?.rank ?? 0}/${upgrade?.maxRank ?? 5}`;
    }
    if (role === 'healer') {
      const upgrade = getUpgradeProgressionState().find((entry) => entry.id === 'ward');
      return `Healer: E opens tonics + Ward rank ${upgrade?.rank ?? 0}/${upgrade?.maxRank ?? 5}`;
    }
    if (role === 'guard-captain') {
      const upgrade = getUpgradeProgressionState().find((entry) => entry.id === 'guard');
      return `Trainer: E opens Guard rank ${upgrade?.rank ?? 0}/${upgrade?.maxRank ?? 4}`;
    }
    if (role === 'house-elder' || role === 'scribe') {
      return 'Quest hub: E opens village records.';
    }
    if (role === 'shrine-keeper' || role === 'gate-watch') {
      return 'Dungeon access: use the shrine road gate.';
    }
    return `${this.getTownRoleLabel(role)}: progression contact.`;
  }

  handleTownNpcInteraction(entry) {
    const role = entry.config.role;

    if (role === 'merchant-stall') {
      this.shopUpgradeOverlay?.open('shop', 'shop-0');
      this.setVillageActionResult('Village shop opened.');
    } else if (role === 'provisions-stall') {
      this.shopUpgradeOverlay?.open('shop', 'shop-1');
      this.setVillageActionResult('Materials shop opened.');
    } else if (role === 'blacksmith-stall') {
      this.shopUpgradeOverlay?.open('upgrades', 'claws');
      this.setVillageActionResult('Upgrade workshop opened.');
    } else if (role === 'healer') {
      this.shopUpgradeOverlay?.open('healer', 'ward');
      this.setVillageActionResult('Healer shop opened.');
    } else if (role === 'guard-captain') {
      this.shopUpgradeOverlay?.open('trainer', 'guard');
      this.setVillageActionResult('Training yard opened.');
    } else if (role === 'house-elder' || role === 'scribe') {
      this.shopUpgradeOverlay?.open('quests', 'quest-loop');
      this.setVillageActionResult('Quest hub opened.');
    } else {
      this.setVillageActionResult(this.getTownInteractionHint(role));
    }

    this.refreshProgressionLabels();
  }

  setVillageActionResult(message) {
    this.villageActionLabel?.setText(message).setVisible(true);
    this.rewardLabel?.setText(`Latest reward: ${message}`);
  }

  createWalletCounter() {
    const walletText = this.getWalletText();
    const x = this.miniMapOrigin.x;
    const y = this.miniMapOrigin.y + (this.layout.rows * this.miniMapCellPx) + 12;
    this.walletCounterLabel = this.add
      .text(x, y, walletText, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffe08a',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH + 14);
  }

  getWalletText() {
    return `Coins: ${getInventoryItemQuantity('sun-coins')}`;
  }

  refreshWalletCounter() {
    this.walletCounterLabel?.setText(this.getWalletText());
  }

  refreshProgressionLabels() {
    const progressionSummary = getPlaytestProgressionSummary();
    const inventoryCount = getPlaytestInventoryState().items.reduce(
      (sum, item) => sum + (item?.quantity ?? 0),
      0,
    );
    const upgrades = progressionSummary.upgrades ?? {};
    this.progressionLabel?.setText(
      `Run: ${progressionSummary.dungeonClears} clears | ${inventoryCount} loot | Upgrades C${upgrades.claws ?? 0}/W${upgrades.ward ?? 0}/G${upgrades.guard ?? 0}`,
    );
    this.refreshWalletCounter();
  }

  renderLandmarks() {
    for (const point of this.layout.landmarks) {
      const worldX = point.x * this.layout.tileSize + this.layout.tileSize / 2;
      const worldY = point.y * this.layout.tileSize + this.layout.tileSize / 2;

      this.add.circle(worldX, worldY, 5, 0xffed9a, 0.85).setDepth(420);
      this.add
        .text(worldX + 10, worldY - 18, point.label, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#f3f3e2',
          backgroundColor: '#00000077',
          padding: { x: 3, y: 1 },
        })
        .setDepth(420);
    }
  }

  renderDungeonPortal() {
    const x = this.layout.dungeonEntryWorld.x;
    const y = this.layout.dungeonEntryWorld.y;
    const baseDepth = 430;

    this.add.ellipse(x, y + 16, 132, 42, 0x000000, 0.3).setDepth(baseDepth - 3);
    this.add.ellipse(x, y + 12, 112, 38, 0x4d534f, 0.36).setDepth(baseDepth - 2);
    this.add.ellipse(x, y + 7, 88, 34, 0x6cae67, 0.2).setDepth(baseDepth - 1);
    this.add.ellipse(x, y + 1, 58, 76, 0x233044, 0.5).setDepth(baseDepth);
    this.add.ellipse(x, y - 2, 36, 56, 0x79c6e7, 0.28).setDepth(baseDepth + 1);
    this.add.ellipse(x, y - 2, 18, 38, 0xd7f171, 0.36).setDepth(baseDepth + 2);

    this.add
      .rectangle(x, y + 25, 118, 8, 0x38423e, 0.86)
      .setStrokeStyle(1, 0xd7f171, 0.34)
      .setDepth(baseDepth + 3);

    this.add
      .text(x, y + 42, 'E', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#f6ffce',
        backgroundColor: '#1d2d19cc',
        padding: { x: 5, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(baseDepth + 4);
  }

  buildCollisionBodies() {
    const structureCells = new Set();
    for (const rect of this.layout.collisionRects ?? []) {
      const minX = Math.max(0, Math.floor((rect.x - rect.width / 2) / this.layout.tileSize));
      const maxX = Math.min(this.layout.cols - 1, Math.floor((rect.x + rect.width / 2) / this.layout.tileSize));
      const minY = Math.max(0, Math.floor((rect.y - rect.height / 2) / this.layout.tileSize));
      const maxY = Math.min(this.layout.rows - 1, Math.floor((rect.y + rect.height / 2) / this.layout.tileSize));

      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          structureCells.add(`${x},${y}`);
        }
      }
    }

    for (let y = 0; y < this.layout.rows; y += 1) {
      for (let x = 0; x < this.layout.cols; x += 1) {
        if (!this.layout.blocked[y][x] || structureCells.has(`${x},${y}`)) {
          continue;
        }

        const worldX = x * this.layout.tileSize + this.layout.tileSize / 2;
        const worldY = y * this.layout.tileSize + this.layout.tileSize / 2;
        const body = this.add.zone(worldX, worldY, this.layout.tileSize, this.layout.tileSize);
        this.physics.add.existing(body, true);
        this.obstacles.add(body);
      }
    }

    for (const rect of this.layout.collisionRects ?? []) {
      const body = this.add.zone(rect.x, rect.y, rect.width, rect.height);
      this.physics.add.existing(body, true);
      this.obstacles.add(body);
    }
  }

  createMiniMap() {
    this.miniMapCellPx = 2;
    const viewportWidth = this.scale.width;
    this.miniMapOrigin = {
      x: viewportWidth - this.layout.cols * this.miniMapCellPx - 16,
      y: 16,
    };

    this.miniMapBackground = this.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH + 10);
    this.miniMapDynamic = this.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH + 12);
    this.miniMapFrame = this.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH + 13);

    const width = this.layout.cols * this.miniMapCellPx;
    const height = this.layout.rows * this.miniMapCellPx;

    this.miniMapBackground.fillStyle(0x0a1115, 0.75);
    this.miniMapBackground.fillRect(this.miniMapOrigin.x - 4, this.miniMapOrigin.y - 4, width + 8, height + 8);

    for (let y = 0; y < this.layout.rows; y += 1) {
      for (let x = 0; x < this.layout.cols; x += 1) {
        const tile = this.layout.ground[y][x];
        let color = 0x476b38;

        if (tile === TileKinds.GROUND_PATH) {
          color = 0xc19b67;
        } else if (tile === TileKinds.GROUND_TRANSITION) {
          color = 0x7f8e59;
        } else if (tile === TileKinds.GROUND_TOWN) {
          color = 0xa68054;
        } else if (tile === TileKinds.GROUND_WATER) {
          color = 0x396f8e;
        }

        this.miniMapBackground.fillStyle(color, 1);
        this.miniMapBackground.fillRect(
          this.miniMapOrigin.x + x * this.miniMapCellPx,
          this.miniMapOrigin.y + y * this.miniMapCellPx,
          this.miniMapCellPx,
          this.miniMapCellPx,
        );
      }
    }

    this.miniMapFrame.lineStyle(1, 0xffffff, 0.95);
    this.miniMapFrame.strokeRect(this.miniMapOrigin.x - 4, this.miniMapOrigin.y - 4, width + 8, height + 8);

    const gateX = Math.floor(this.layout.dungeonEntryWorld.x / this.layout.tileSize);
    const gateY = Math.floor(this.layout.dungeonEntryWorld.y / this.layout.tileSize);
    this.miniMapDynamic.fillStyle(0x7ee887, 1);
    this.miniMapDynamic.fillRect(
      this.miniMapOrigin.x + gateX * this.miniMapCellPx,
      this.miniMapOrigin.y + gateY * this.miniMapCellPx,
      this.miniMapCellPx + 1,
      this.miniMapCellPx + 1,
    );
  }

  updateMiniMap() {
    if (!this.miniMapDynamic || !this.player?.body) {
      return;
    }

    const cellX = Phaser.Math.Clamp(
      Math.floor(this.player.x / this.layout.tileSize),
      0,
      this.layout.cols - 1,
    );
    const cellY = Phaser.Math.Clamp(
      Math.floor(this.player.y / this.layout.tileSize),
      0,
      this.layout.rows - 1,
    );

    this.miniMapDynamic.clear();

    const gateX = Math.floor(this.layout.dungeonEntryWorld.x / this.layout.tileSize);
    const gateY = Math.floor(this.layout.dungeonEntryWorld.y / this.layout.tileSize);
    this.miniMapDynamic.fillStyle(0x7ee887, 1);
    this.miniMapDynamic.fillRect(
      this.miniMapOrigin.x + gateX * this.miniMapCellPx,
      this.miniMapOrigin.y + gateY * this.miniMapCellPx,
      this.miniMapCellPx + 1,
      this.miniMapCellPx + 1,
    );

    this.miniMapDynamic.fillStyle(0xfff2a8, 1);
    this.miniMapDynamic.fillRect(
      this.miniMapOrigin.x + cellX * this.miniMapCellPx,
      this.miniMapOrigin.y + cellY * this.miniMapCellPx,
      this.miniMapCellPx + 1,
      this.miniMapCellPx + 1,
    );
  }

  runTraversalAudit() {
    const { cols, rows, blocked, tileSize, spawnWorld, dungeonEntryWorld } = this.layout;
    const toCell = (worldX, worldY) => {
      return {
        x: Math.floor(worldX / tileSize),
        y: Math.floor(worldY / tileSize),
      };
    };

    const start = toCell(spawnWorld.x, spawnWorld.y);
    const goal = toCell(dungeonEntryWorld.x, dungeonEntryWorld.y);

    if (blocked[start.y]?.[start.x]) {
      return { pass: false, message: 'Traversal audit: FAIL (spawn blocked)' };
    }

    if (blocked[goal.y]?.[goal.x]) {
      return { pass: false, message: 'Traversal audit: FAIL (gate blocked)' };
    }

    const visited = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
    const queue = [{ x: start.x, y: start.y, dist: 0 }];
    visited[start.y][start.x] = true;

    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    while (queue.length > 0) {
      const current = queue.shift();

      if (current.x === goal.x && current.y === goal.y) {
        return {
          pass: true,
          message: `Traversal audit: PASS (${current.dist} cells path, sprint x${SPRINT_MULTIPLIER.toFixed(2)})`,
        };
      }

      for (const dir of dirs) {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        const inBounds = nx >= 0 && ny >= 0 && nx < cols && ny < rows;

        if (!inBounds || visited[ny][nx] || blocked[ny][nx]) {
          continue;
        }

        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny, dist: current.dist + 1 });
      }
    }

    return { pass: false, message: 'Traversal audit: FAIL (no route to gate)' };
  }

  hash2d(x, y) {
    return (x * 73856093 + y * 19349663) >>> 0;
  }
}
