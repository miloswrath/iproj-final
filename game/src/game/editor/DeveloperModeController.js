import Phaser from 'phaser';

const EDITOR_DEPTH = 12000;
const PAN_SPEED = 14;
const HISTORY_LIMIT = 100;
const TOOLBAR_HEIGHT = 164;

const TOOL_SINGLE = 'single';
const TOOL_RECT = 'rect';
const TOOL_ERASE = 'erase';
const TOOL_MOVE = 'move';

const EDITOR_LAYERS = [
  { id: 'floor', label: 'Floor' },
  { id: 'collision', label: 'Collision/Walls' },
  { id: 'decor', label: 'Decor/Objects' },
];

const EDITOR_TOOLS = [
  { id: TOOL_SINGLE, label: 'Single Place' },
  { id: TOOL_RECT, label: 'Rectangle Fill' },
  { id: TOOL_ERASE, label: 'Erase' },
  { id: TOOL_MOVE, label: 'Move Selected Object' },
];

export class DeveloperModeController {
  constructor(scene, config) {
    this.scene = scene;
    this.sceneLabel = config.sceneLabel;
    this.tileSize = config.tileSize;
    this.cols = config.cols;
    this.rows = config.rows;
    this.worldWidth = config.worldWidth;
    this.worldHeight = config.worldHeight;
    this.registry = config.registry;
    this.autoLoadSavedWorld = config.autoLoadSavedWorld !== false;

    this.enabled = false;
    this.layerIndex = 0;
    this.toolIndex = 0;
    this.groupIndex = 0;
    this.assetIndex = 0;
    this.currentCell = { x: 0, y: 0 };
    this.toolbarTopY = 0;

    this.floorCells = new Map();
    this.collisionCells = new Map();
    this.decorCells = new Map();

    this.floorSprites = new Map();
    this.collisionSprites = new Map();
    this.decorSprites = new Map();

    this.undoStack = [];
    this.redoStack = [];

    this.dragBatch = null;
    this.rectStartCell = null;
    this.moveStartCell = null;
    this.lastSaveStatus = '';

    this.toggleKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKTICK);
    this.cameraKeys = scene.input.keyboard.addKeys('I,K,J,L');
    this.layerOneKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.layerTwoKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.layerThreeKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.toolSingleKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.toolRectKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.toolEraseKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.toolMoveKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.prevGroupKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.nextGroupKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.prevAssetKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.nextAssetKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.assetShowcaseKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);

    this.createOverlay();
    this.drawGrid();
    this.refreshSelectionForLayer();
    this.bindEditorInput();

    if (this.autoLoadSavedWorld) {
      this.loadWorldFromLocalSlot(true);
    }

    this.updateHud();

    this.scene.events.once('shutdown', () => {
      this.destroy();
    });
  }

  isEnabled() {
    return this.enabled;
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
      this.setEnabled(!this.enabled);
    }

    if (!this.enabled) {
      return false;
    }

    this.handleLayerHotkeys();
    this.handleToolHotkeys();
    this.handlePaletteHotkeys();
    this.handleEditorActions();
    this.handleCameraPan();
    this.updatePointerPreview();
    this.updateHud();

    return true;
  }

  setEnabled(enabled) {
    this.enabled = enabled;

    this.gridGraphics.setVisible(enabled);
    this.cursorHighlight.setVisible(enabled);
    this.toolbarBg.setVisible(enabled);
    this.toolbarDivider.setVisible(enabled);
    this.toolbarModeBadge.setVisible(enabled);
    this.toolbarModeText.setVisible(enabled);
    this.toolbarPrimaryText.setVisible(enabled);
    this.toolbarSecondaryText.setVisible(enabled);
    this.toolbarHelpText.setVisible(enabled);
    this.assetPreviewFrame.setVisible(enabled);
    this.assetPreviewImage.setVisible(enabled);
    this.assetPreviewLabel.setVisible(enabled);
    for (const button of this.toolButtons ?? []) {
      button.bg.setVisible(enabled);
      button.label.setVisible(enabled);
    }
    for (const tab of this.layerTabs ?? []) {
      tab.bg.setVisible(enabled);
      tab.label.setVisible(enabled);
    }
    this.rectPreviewGraphics.setVisible(enabled);
    this.movePreviewRect.setVisible(enabled && this.moveStartCell !== null);
    this.collisionOverlayGraphics.setVisible(enabled);

    if (!enabled) {
      this.ghostPreview.setVisible(false);
      this.rectPreviewGraphics.clear();
      this.dragBatch = null;
      this.rectStartCell = null;
      this.moveStartCell = null;
      this.movePreviewRect.setVisible(false);
    }

    this.updateHud();
  }

  createOverlay() {
    this.floorLayerContainer = this.scene.add.container(0, 0).setDepth(205);
    this.collisionLayerContainer = this.scene.add.container(0, 0).setDepth(325);
    this.decorLayerContainer = this.scene.add.container(0, 0).setDepth(385);

    this.gridGraphics = this.scene.add.graphics().setDepth(EDITOR_DEPTH).setVisible(false);

    this.cursorHighlight = this.scene.add
      .rectangle(0, 0, this.tileSize, this.tileSize, 0x89d2ff, 0.12)
      .setOrigin(0)
      .setStrokeStyle(1, 0x89d2ff, 0.95)
      .setDepth(EDITOR_DEPTH + 1)
      .setVisible(false);

    this.rectPreviewGraphics = this.scene.add.graphics().setDepth(EDITOR_DEPTH + 2).setVisible(false);

    this.movePreviewRect = this.scene.add
      .rectangle(0, 0, this.tileSize, this.tileSize, 0x57f78f, 0.11)
      .setOrigin(0)
      .setStrokeStyle(2, 0x57f78f, 0.95)
      .setDepth(EDITOR_DEPTH + 2)
      .setVisible(false);

    this.ghostPreview = this.scene.add
      .image(0, 0, 'overworld-field-a')
      .setDepth(EDITOR_DEPTH + 3)
      .setAlpha(0.56)
      .setVisible(false);

    this.collisionOverlayGraphics = this.scene.add.graphics().setDepth(EDITOR_DEPTH + 4).setVisible(false);

    const viewportWidth = this.scene.scale.width;
    const viewportHeight = this.scene.scale.height;
    const toolbarHeight = TOOLBAR_HEIGHT;
    const toolbarY = viewportHeight - toolbarHeight;
    this.toolbarTopY = toolbarY;

    this.toolbarBg = this.scene.add
      .rectangle(0, toolbarY, viewportWidth, toolbarHeight, 0x061018, 0.86)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(EDITOR_DEPTH + 9)
      .setStrokeStyle(1, 0x2f6f8b, 0.8)
      .setVisible(false);

    this.toolbarDivider = this.scene.add
      .rectangle(0, toolbarY, viewportWidth, 2, 0x5db8dc, 0.66)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(EDITOR_DEPTH + 10)
      .setVisible(false);

    this.toolbarModeBadge = this.scene.add
      .rectangle(16, toolbarY + 14, 102, 32, 0x2e6842, 0.95)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(EDITOR_DEPTH + 10)
      .setStrokeStyle(1, 0x95ffaf, 0.9)
      .setVisible(false);

    this.toolbarModeText = this.scene.add
      .text(28, toolbarY + 21, 'DEV ON', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e8fff0',
      })
      .setScrollFactor(0)
      .setDepth(EDITOR_DEPTH + 11)
      .setVisible(false);

    this.toolbarPrimaryText = this.scene.add
      .text(132, toolbarY + 12, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#d9f6ff',
      })
      .setScrollFactor(0)
      .setDepth(EDITOR_DEPTH + 11)
      .setVisible(false);

    this.toolbarSecondaryText = this.scene.add
      .text(132, toolbarY + 40, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#a7d9ea',
      })
      .setScrollFactor(0)
      .setDepth(EDITOR_DEPTH + 11)
      .setVisible(false);

    this.toolbarHelpText = this.scene.add
      .text(16, toolbarY + 112, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#b7ced8',
      })
      .setScrollFactor(0)
      .setDepth(EDITOR_DEPTH + 11)
      .setVisible(false);

    const previewX = viewportWidth - 180;
    const previewY = toolbarY + 22;

    this.assetPreviewFrame = this.scene.add
      .rectangle(previewX, previewY, 72, 72, 0x0c2532, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(EDITOR_DEPTH + 10)
      .setStrokeStyle(2, 0x89d2ff, 0.95)
      .setVisible(false);

    this.assetPreviewImage = this.scene.add
      .image(previewX + 36, previewY + 36, 'overworld-field-a')
      .setDisplaySize(56, 56)
      .setScrollFactor(0)
      .setDepth(EDITOR_DEPTH + 11)
      .setVisible(false);

    this.assetPreviewLabel = this.scene.add
      .text(previewX - 210, previewY + 22, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#f1fbff',
        align: 'right',
      })
      .setScrollFactor(0)
      .setDepth(EDITOR_DEPTH + 11)
      .setVisible(false);

    this.createToolbarButtons(toolbarY);
  }

  createToolbarButtons(toolbarY) {
    this.toolButtons = [];
    this.layerTabs = [];

    const toolStartX = 16;
    const toolY = toolbarY + 72;
    const toolWidth = 86;
    const toolGap = 8;

    for (let index = 0; index < EDITOR_TOOLS.length; index += 1) {
      const tool = EDITOR_TOOLS[index];
      const x = toolStartX + index * (toolWidth + toolGap);
      const bg = this.scene.add
        .rectangle(x, toolY, toolWidth, 32, 0x163342, 0.95)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(EDITOR_DEPTH + 11)
        .setStrokeStyle(1, 0x3b89ad, 0.9)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });

      const labelText = tool.id === TOOL_SINGLE ? 'Single' : tool.id === TOOL_RECT ? 'Rect' : tool.id === TOOL_ERASE ? 'Erase' : 'Move';
      const label = this.scene.add
        .text(x + toolWidth / 2, toolY + 7, labelText, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#dff5ff',
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(EDITOR_DEPTH + 12)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });

      const activateTool = () => {
        this.toolIndex = index;
        this.updateHud();
      };

      bg.on('pointerdown', activateTool);
      label.on('pointerdown', activateTool);

      this.toolButtons.push({ bg, label });
    }

    const tabStartX = 414;
    const tabY = toolbarY + 72;
    const tabWidth = 156;
    const tabGap = 8;

    for (let index = 0; index < EDITOR_LAYERS.length; index += 1) {
      const layer = EDITOR_LAYERS[index];
      const x = tabStartX + index * (tabWidth + tabGap);
      const bg = this.scene.add
        .rectangle(x, tabY, tabWidth, 32, 0x1f2d38, 0.95)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(EDITOR_DEPTH + 11)
        .setStrokeStyle(1, 0x577891, 0.9)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });

      const label = this.scene.add
        .text(x + tabWidth / 2, tabY + 7, layer.label, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#d2e6f2',
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(EDITOR_DEPTH + 12)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });

      const activateLayer = () => {
        this.layerIndex = index;
        this.refreshSelectionForLayer();
        this.updateHud();
      };

      bg.on('pointerdown', activateLayer);
      label.on('pointerdown', activateLayer);

      this.layerTabs.push({ bg, label });
    }
  }

  bindEditorInput() {
    this.pointerDownHandler = (pointer) => {
      if (!this.enabled || pointer.button !== 0) {
        return;
      }

      if (pointer.y >= this.toolbarTopY) {
        return;
      }

      const cell = this.getCellFromWorld(pointer.worldX, pointer.worldY);
      this.beginPointerAction(cell);
    };

    this.pointerMoveHandler = (pointer) => {
      if (!this.enabled) {
        return;
      }

      if (pointer.y >= this.toolbarTopY) {
        return;
      }

      const cell = this.getCellFromWorld(pointer.worldX, pointer.worldY);
      this.currentCell = cell;

      if (pointer.isDown && pointer.leftButtonDown()) {
        this.continuePointerAction(cell);
      }
    };

    this.pointerUpHandler = (pointer) => {
      if (!this.enabled || pointer.button !== 0) {
        return;
      }

      if (pointer.y >= this.toolbarTopY) {
        return;
      }

      const cell = this.getCellFromWorld(pointer.worldX, pointer.worldY);
      this.endPointerAction(cell);
    };

    this.keyDownHandler = (event) => {
      if (!this.enabled || !event.ctrlKey) {
        return;
      }

      const key = String(event.key || '').toLowerCase();
      const withShift = Boolean(event.shiftKey);

      if (key === 's') {
        event.preventDefault();

        if (withShift) {
          this.saveWorldToLocalSlot();
          return;
        }

        this.saveWorldToJsonFile();
        return;
      }

      if (key === 'l' && withShift) {
        event.preventDefault();
        this.loadWorldFromLocalSlot();
        return;
      }

      if (key === 'o') {
        event.preventDefault();
        this.promptLoadWorldFromJson();
        return;
      }

      if (key === 'z') {
        event.preventDefault();
        this.undo();
        return;
      }

      if (key === 'y') {
        event.preventDefault();
        this.redo();
      }
    };

    this.scene.input.on('pointerdown', this.pointerDownHandler);
    this.scene.input.on('pointermove', this.pointerMoveHandler);
    this.scene.input.on('pointerup', this.pointerUpHandler);
    this.scene.input.keyboard.on('keydown', this.keyDownHandler);
  }

  drawGrid() {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x5db8dc, 0.2);

    for (let x = 0; x <= this.cols; x += 1) {
      const px = x * this.tileSize;
      this.gridGraphics.beginPath();
      this.gridGraphics.moveTo(px, 0);
      this.gridGraphics.lineTo(px, this.worldHeight);
      this.gridGraphics.strokePath();
    }

    for (let y = 0; y <= this.rows; y += 1) {
      const py = y * this.tileSize;
      this.gridGraphics.beginPath();
      this.gridGraphics.moveTo(0, py);
      this.gridGraphics.lineTo(this.worldWidth, py);
      this.gridGraphics.strokePath();
    }
  }

  handleLayerHotkeys() {
    if (Phaser.Input.Keyboard.JustDown(this.layerOneKey)) {
      this.layerIndex = 0;
      this.refreshSelectionForLayer();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.layerTwoKey)) {
      this.layerIndex = 1;
      this.refreshSelectionForLayer();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.layerThreeKey)) {
      this.layerIndex = 2;
      this.refreshSelectionForLayer();
    }
  }

  handleToolHotkeys() {
    if (Phaser.Input.Keyboard.JustDown(this.toolSingleKey)) {
      this.toolIndex = this.findToolIndexById(TOOL_SINGLE);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.toolRectKey)) {
      this.toolIndex = this.findToolIndexById(TOOL_RECT);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.toolEraseKey)) {
      this.toolIndex = this.findToolIndexById(TOOL_ERASE);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.toolMoveKey)) {
      this.toolIndex = this.findToolIndexById(TOOL_MOVE);
    }
  }

  handlePaletteHotkeys() {
    const groups = this.getGroupsForActiveLayer();
    if (groups.length === 0) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.prevGroupKey)) {
      this.groupIndex = Phaser.Math.Wrap(this.groupIndex - 1, 0, groups.length);
      this.assetIndex = 0;
    } else if (Phaser.Input.Keyboard.JustDown(this.nextGroupKey)) {
      this.groupIndex = Phaser.Math.Wrap(this.groupIndex + 1, 0, groups.length);
      this.assetIndex = 0;
    }

    const selectedGroup = groups[this.groupIndex];

    if (!selectedGroup || selectedGroup.assets.length === 0) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.prevAssetKey)) {
      this.assetIndex = Phaser.Math.Wrap(this.assetIndex - 1, 0, selectedGroup.assets.length);
    } else if (Phaser.Input.Keyboard.JustDown(this.nextAssetKey)) {
      this.assetIndex = Phaser.Math.Wrap(this.assetIndex + 1, 0, selectedGroup.assets.length);
    }
  }

  handleEditorActions() {
    if (Phaser.Input.Keyboard.JustDown(this.assetShowcaseKey)) {
      this.generateAssetShowcaseLayout();
    }
  }

  generateAssetShowcaseLayout() {
    this.clearAllEditorCells();

    const sectionPadding = 2;
    const camera = this.scene.cameras?.main;
    const visibleStartX = Phaser.Math.Clamp(
      Math.floor((camera?.worldView?.x ?? 0) / this.tileSize) + 1,
      1,
      Math.max(1, this.cols - 2),
    );
    const visibleStartY = Phaser.Math.Clamp(
      Math.floor((camera?.worldView?.y ?? 0) / this.tileSize) + 1,
      1,
      Math.max(1, this.rows - 2),
    );
    const sectionWidth = Math.max(1, this.cols - visibleStartX - 1);
    const baseFloorAsset = this.getFirstAvailableLayerAsset('floor');
    let nextStartY = visibleStartY;
    const placements = [];

    for (const layerId of ['floor', 'collision', 'decor']) {
      const assets = this.getAssetsForLayer(layerId);
      if (assets.length === 0) {
        continue;
      }

      const requiredRows = Math.max(1, Math.ceil(assets.length / sectionWidth));
      if (nextStartY + requiredRows >= this.rows - 1) {
        this.lastSaveStatus = `Showcase truncated: not enough rows for ${layerId} assets`;
        break;
      }

      for (let index = 0; index < assets.length; index += 1) {
        const cellX = visibleStartX + (index % sectionWidth);
        const cellY = nextStartY + Math.floor(index / sectionWidth);
        const cellKey = this.toCellKey(cellX, cellY);
        const assetKey = assets[index].key;

        if (layerId === 'floor') {
          this.setFloorCell(cellKey, assetKey);
        } else if (layerId === 'collision') {
          if (baseFloorAsset && !this.floorCells.has(cellKey)) {
            this.setFloorCell(cellKey, baseFloorAsset.key);
          }
          this.setCollisionCell(cellKey, assetKey);
        } else {
          if (baseFloorAsset && !this.floorCells.has(cellKey)) {
            this.setFloorCell(cellKey, baseFloorAsset.key);
          }
          this.setDecorCell(cellKey, assetKey);
        }

        placements.push(`${layerId}:${assetKey}`);
      }

      nextStartY += requiredRows + sectionPadding;
    }

    this.undoStack = [];
    this.redoStack = [];
    this.lastSaveStatus = `Showcase generated (${placements.length} assets)`;
  }

  getFirstAvailableLayerAsset(layerId) {
    const groups = this.registry.byLayer[layerId] ?? [];
    for (const group of groups) {
      for (const asset of group.assets ?? []) {
        if (asset?.key && this.scene.textures.exists(asset.key)) {
          return asset;
        }
      }
    }
    return null;
  }

  getAssetsForLayer(layerId) {
    const groups = this.registry.byLayer[layerId] ?? [];
    const seen = new Set();
    const assets = [];

    for (const group of groups) {
      for (const asset of group.assets ?? []) {
        if (!asset?.key || seen.has(asset.key) || !this.scene.textures.exists(asset.key)) {
          continue;
        }
        seen.add(asset.key);
        assets.push(asset);
      }
    }

    return assets;
  }

  handleCameraPan() {
    const camera = this.scene.cameras.main;
    const dx = Number(this.cameraKeys.L.isDown) - Number(this.cameraKeys.J.isDown);
    const dy = Number(this.cameraKeys.K.isDown) - Number(this.cameraKeys.I.isDown);

    if (dx === 0 && dy === 0) {
      return;
    }

    camera.scrollX = Phaser.Math.Clamp(camera.scrollX + dx * PAN_SPEED, 0, this.worldWidth - camera.width);
    camera.scrollY = Phaser.Math.Clamp(camera.scrollY + dy * PAN_SPEED, 0, this.worldHeight - camera.height);
  }

  updatePointerPreview() {
    const pointer = this.scene.input.activePointer;

    const cell = this.getCellFromWorld(pointer.worldX, pointer.worldY);
    this.currentCell = cell;

    this.cursorHighlight.setPosition(cell.x * this.tileSize, cell.y * this.tileSize);

    if (this.rectStartCell) {
      this.drawRectPreview(this.rectStartCell, cell);
    }

    if (this.moveStartCell) {
      this.movePreviewRect
        .setPosition(this.moveStartCell.x * this.tileSize, this.moveStartCell.y * this.tileSize)
        .setVisible(true);
    }

    const selectedAsset = this.getSelectedAsset();
    const activeTool = this.getActiveTool();

    if (activeTool.id === TOOL_MOVE) {
      this.ghostPreview.setVisible(false);
      return;
    }

    if (!selectedAsset || !this.scene.textures.exists(selectedAsset.key)) {
      this.ghostPreview.setVisible(false);
      return;
    }

    this.ghostPreview
      .setTexture(selectedAsset.key)
      .setPosition(cell.x * this.tileSize + this.tileSize / 2, cell.y * this.tileSize + this.tileSize / 2)
      .setDisplaySize(this.tileSize, this.tileSize)
      .setVisible(true);
  }

  beginPointerAction(cell) {
    const activeTool = this.getActiveTool();

    if (activeTool.id === TOOL_MOVE) {
      this.beginMoveAction(cell);
      return;
    }

    if (activeTool.id === TOOL_RECT) {
      this.rectStartCell = cell;
      this.drawRectPreview(cell, cell);
      return;
    }

    this.dragBatch = { ops: [], touched: new Set() };
    this.applyBrushAtCell(cell, activeTool, this.dragBatch);
  }

  continuePointerAction(cell) {
    const activeTool = this.getActiveTool();

    if (activeTool.id === TOOL_RECT || activeTool.id === TOOL_MOVE) {
      return;
    }

    if (!this.dragBatch) {
      return;
    }

    this.applyBrushAtCell(cell, activeTool, this.dragBatch);
  }

  endPointerAction(cell) {
    const activeTool = this.getActiveTool();

    if (activeTool.id === TOOL_MOVE) {
      this.endMoveAction(cell);
      return;
    }

    if (activeTool.id === TOOL_RECT) {
      this.commitRectangleAction(cell);
      return;
    }

    this.commitBatch(this.dragBatch);
    this.dragBatch = null;
  }

  beginMoveAction(cell) {
    const layerId = this.getActiveLayer().id;

    if (layerId !== 'decor') {
      return;
    }

    const sourceKey = this.toCellKey(cell.x, cell.y);
    if (!this.decorCells.has(sourceKey)) {
      this.moveStartCell = null;
      this.movePreviewRect.setVisible(false);
      return;
    }

    this.moveStartCell = cell;
    this.movePreviewRect
      .setPosition(cell.x * this.tileSize, cell.y * this.tileSize)
      .setVisible(true);
  }

  endMoveAction(targetCell) {
    if (!this.moveStartCell) {
      return;
    }

    const fromKey = this.toCellKey(this.moveStartCell.x, this.moveStartCell.y);
    const toKey = this.toCellKey(targetCell.x, targetCell.y);

    const movedAssetKey = this.decorCells.get(fromKey);
    const destinationAssetKey = this.decorCells.get(toKey) ?? null;

    const batch = { ops: [], touched: new Set() };

    if (movedAssetKey && fromKey !== toKey) {
      this.pushCellChange(batch, 'decor', fromKey, movedAssetKey, null);
      this.pushCellChange(batch, 'decor', toKey, destinationAssetKey, movedAssetKey);
      this.applyBatch(batch, true);
      this.commitBatch(batch);
    }

    this.moveStartCell = null;
    this.movePreviewRect.setVisible(false);
  }

  commitRectangleAction(endCell) {
    if (!this.rectStartCell) {
      return;
    }

    const activeTool = this.getActiveTool();
    const batch = { ops: [], touched: new Set() };

    const minX = Math.min(this.rectStartCell.x, endCell.x);
    const maxX = Math.max(this.rectStartCell.x, endCell.x);
    const minY = Math.min(this.rectStartCell.y, endCell.y);
    const maxY = Math.max(this.rectStartCell.y, endCell.y);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        this.applyBrushAtCell({ x, y }, activeTool, batch);
      }
    }

    this.rectStartCell = null;
    this.rectPreviewGraphics.clear();
    this.commitBatch(batch);
  }

  applyBrushAtCell(cell, activeTool, batch) {
    const layerId = this.getActiveLayer().id;
    const cellKey = this.toCellKey(cell.x, cell.y);

    if (batch.touched.has(cellKey)) {
      return;
    }

    const beforeValue = this.getLayerCellValue(layerId, cellKey);
    let afterValue = null;

    if (activeTool.id === TOOL_ERASE) {
      afterValue = null;
    } else {
      const selectedAsset = this.getSelectedAsset();
      if (!selectedAsset) {
        return;
      }
      afterValue = selectedAsset.key;
    }

    this.pushCellChange(batch, layerId, cellKey, beforeValue, afterValue);
    this.applyLastBatchChange(batch, true);
  }

  pushCellChange(batch, layerId, cellKey, before, after) {
    if (before === after) {
      return;
    }

    batch.touched.add(cellKey);
    batch.ops.push({
      type: 'set-cell',
      layerId,
      cellKey,
      before,
      after,
    });
  }

  applyLastBatchChange(batch, useAfter) {
    const op = batch.ops[batch.ops.length - 1];
    if (!op) {
      return;
    }

    this.applyCellChange(op, useAfter);
  }

  applyBatch(batch, useAfter) {
    if (!batch || batch.ops.length === 0) {
      return;
    }

    for (const op of batch.ops) {
      this.applyCellChange(op, useAfter);
    }
  }

  applyCellChange(op, useAfter) {
    const nextValue = useAfter ? op.after : op.before;

    if (op.layerId === 'floor') {
      this.setFloorCell(op.cellKey, nextValue);
      return;
    }

    if (op.layerId === 'collision') {
      this.setCollisionCell(op.cellKey, nextValue);
      return;
    }

    this.setDecorCell(op.cellKey, nextValue);
  }

  setFloorCell(cellKey, assetKey) {
    this.setLayerCell(cellKey, assetKey, this.floorCells, this.floorSprites, this.floorLayerContainer, 208);
  }

  setCollisionCell(cellKey, assetKey) {
    this.setLayerCell(
      cellKey,
      assetKey,
      this.collisionCells,
      this.collisionSprites,
      this.collisionLayerContainer,
      328,
      true,
    );
    this.redrawCollisionOverlay();
  }

  setDecorCell(cellKey, assetKey) {
    this.setLayerCell(cellKey, assetKey, this.decorCells, this.decorSprites, this.decorLayerContainer, 390);
  }

  setLayerCell(cellKey, assetKey, dataMap, spriteMap, container, baseDepth, withCollisionTint = false) {
    const oldSprite = spriteMap.get(cellKey);
    if (oldSprite) {
      oldSprite.destroy();
      spriteMap.delete(cellKey);
    }

    if (!assetKey) {
      dataMap.delete(cellKey);
      return;
    }

    if (!this.scene.textures.exists(assetKey)) {
      return;
    }

    const cell = this.fromCellKey(cellKey);
    const sprite = this.scene.add
      .image(
        cell.x * this.tileSize + this.tileSize / 2,
        cell.y * this.tileSize + this.tileSize / 2,
        assetKey,
      )
      .setDisplaySize(this.tileSize, this.tileSize)
      .setDepth(baseDepth + cell.y)
      .setAlpha(withCollisionTint ? 0.78 : 0.95);

    if (withCollisionTint) {
      sprite.setTint(0xe7d0c1);
    }

    container.add(sprite);
    dataMap.set(cellKey, assetKey);
    spriteMap.set(cellKey, sprite);
  }

  redrawCollisionOverlay() {
    this.collisionOverlayGraphics.clear();

    if (!this.enabled || this.collisionCells.size === 0) {
      return;
    }

    this.collisionOverlayGraphics.lineStyle(1, 0xffa86c, 0.85);
    this.collisionOverlayGraphics.fillStyle(0x7f2d1d, 0.18);

    for (const cellKey of this.collisionCells.keys()) {
      const cell = this.fromCellKey(cellKey);
      const x = cell.x * this.tileSize;
      const y = cell.y * this.tileSize;
      this.collisionOverlayGraphics.fillRect(x, y, this.tileSize, this.tileSize);
      this.collisionOverlayGraphics.strokeRect(x + 1, y + 1, this.tileSize - 2, this.tileSize - 2);
    }
  }

  commitBatch(batch) {
    if (!batch || batch.ops.length === 0) {
      return;
    }

    this.undoStack.push({ ops: batch.ops });
    if (this.undoStack.length > HISTORY_LIMIT) {
      this.undoStack.shift();
    }

    this.redoStack = [];
    this.updateHud();
  }

  undo() {
    const batch = this.undoStack.pop();
    if (!batch) {
      return;
    }

    for (let i = batch.ops.length - 1; i >= 0; i -= 1) {
      this.applyCellChange(batch.ops[i], false);
    }

    this.redoStack.push(batch);
    this.updateHud();
  }

  redo() {
    const batch = this.redoStack.pop();
    if (!batch) {
      return;
    }

    this.applyBatch(batch, true);
    this.undoStack.push(batch);
    this.updateHud();
  }

  saveWorldToJsonFile() {
    const worldData = this.serializeWorldData();
    const json = JSON.stringify(worldData, null, 2);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    const defaultName = `world-${this.sceneLabel.toLowerCase()}-${Date.now()}`;
    const requestedName = window.prompt('Save map filename (.json optional):', defaultName);
    if (requestedName === null) {
      URL.revokeObjectURL(url);
      return;
    }

    anchor.href = url;
    anchor.download = this.normalizeJsonFilename(requestedName, defaultName);
    anchor.click();

    URL.revokeObjectURL(url);
    localStorage.setItem(this.getAutoSaveKey(), json);
    this.lastSaveStatus = `Saved file ${anchor.download}`;
  }

  saveWorldToLocalSlot() {
    const worldData = this.serializeWorldData();
    const json = JSON.stringify(worldData);
    localStorage.setItem(this.getAutoSaveKey(), json);
    this.lastSaveStatus = `Quick-saved slot ${this.getAutoSaveKey()}`;
  }

  loadWorldFromLocalSlot(silent = false) {
    const text = localStorage.getItem(this.getAutoSaveKey());
    if (!text) {
      if (!silent) {
        this.lastSaveStatus = 'No quick-save slot found';
      }
      return;
    }

    this.loadWorldFromJsonText(text);
    if (!silent) {
      this.lastSaveStatus = 'Loaded quick-save slot';
    }
  }

  normalizeJsonFilename(requestedName, fallbackName) {
    const trimmed = String(requestedName ?? '').trim();
    const safeBase = trimmed.length > 0 ? trimmed : fallbackName;
    return safeBase.toLowerCase().endsWith('.json') ? safeBase : `${safeBase}.json`;
  }

  promptLoadWorldFromJson() {
    if (!this.fileInputElement) {
      this.fileInputElement = document.createElement('input');
      this.fileInputElement.type = 'file';
      this.fileInputElement.accept = '.json,application/json';
      this.fileInputElement.addEventListener('change', async () => {
        const file = this.fileInputElement.files?.[0];
        if (!file) {
          return;
        }

        const text = await file.text();
        this.loadWorldFromJsonText(text);
        this.fileInputElement.value = '';
      });
    }

    this.fileInputElement.click();
  }

  loadWorldFromJsonText(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return;
    }

    if (!this.isValidWorldData(data)) {
      return;
    }

    this.clearAllEditorCells();

    for (const floorCell of data.layers.floor.cells) {
      const key = this.toCellKey(floorCell.x, floorCell.y);
      this.setFloorCell(key, floorCell.assetKey);
    }

    for (const collisionCell of data.layers.collision.cells) {
      const key = this.toCellKey(collisionCell.x, collisionCell.y);
      this.setCollisionCell(key, collisionCell.assetKey);
    }

    for (const decorObj of data.layers.decor.objects) {
      const key = this.toCellKey(decorObj.x, decorObj.y);
      this.setDecorCell(key, decorObj.assetKey);
    }

    this.undoStack = [];
    this.redoStack = [];
    localStorage.setItem(this.getAutoSaveKey(), JSON.stringify(data));
    this.updateHud();
  }

  clearAllEditorCells() {
    for (const key of [...this.floorCells.keys()]) {
      this.setFloorCell(key, null);
    }

    for (const key of [...this.collisionCells.keys()]) {
      this.setCollisionCell(key, null);
    }

    for (const key of [...this.decorCells.keys()]) {
      this.setDecorCell(key, null);
    }
  }

  serializeWorldData() {
    return {
      schemaVersion: 1,
      scene: this.sceneLabel.toLowerCase(),
      savedAt: new Date().toISOString(),
      bounds: {
        cols: this.cols,
        rows: this.rows,
        tileSize: this.tileSize,
      },
      layers: {
        floor: {
          cells: this.serializeCellMap(this.floorCells),
        },
        collision: {
          cells: this.serializeCellMap(this.collisionCells),
        },
        decor: {
          objects: this.serializeCellMap(this.decorCells),
        },
      },
      markers: {
        dungeonEntry: null,
        spawn: null,
        notes: [],
      },
    };
  }

  isValidWorldData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.bounds || data.bounds.cols !== this.cols || data.bounds.rows !== this.rows) {
      return false;
    }

    if (!data.layers || !data.layers.floor || !data.layers.collision || !data.layers.decor) {
      return false;
    }

    if (!Array.isArray(data.layers.floor.cells)) {
      return false;
    }

    if (!Array.isArray(data.layers.collision.cells)) {
      return false;
    }

    return Array.isArray(data.layers.decor.objects);
  }

  serializeCellMap(map) {
    const cells = [];

    for (const [cellKey, assetKey] of map.entries()) {
      const cell = this.fromCellKey(cellKey);
      cells.push({ x: cell.x, y: cell.y, assetKey });
    }

    cells.sort((a, b) => {
      if (a.y !== b.y) {
        return a.y - b.y;
      }
      return a.x - b.x;
    });

    return cells;
  }

  drawRectPreview(fromCell, toCell) {
    this.rectPreviewGraphics.clear();

    const minX = Math.min(fromCell.x, toCell.x) * this.tileSize;
    const minY = Math.min(fromCell.y, toCell.y) * this.tileSize;
    const width = (Math.abs(fromCell.x - toCell.x) + 1) * this.tileSize;
    const height = (Math.abs(fromCell.y - toCell.y) + 1) * this.tileSize;

    this.rectPreviewGraphics.fillStyle(0x7adfff, 0.12);
    this.rectPreviewGraphics.fillRect(minX, minY, width, height);
    this.rectPreviewGraphics.lineStyle(2, 0x7adfff, 0.85);
    this.rectPreviewGraphics.strokeRect(minX + 1, minY + 1, width - 2, height - 2);
  }

  refreshSelectionForLayer() {
    this.groupIndex = 0;
    this.assetIndex = 0;
  }

  getGroupsForActiveLayer() {
    const layer = this.getActiveLayer().id;
    return this.registry.byLayer[layer] ?? [];
  }

  getSelectedAsset() {
    const groups = this.getGroupsForActiveLayer();
    if (groups.length === 0) {
      return null;
    }

    const group = groups[this.groupIndex];
    if (!group || !group.assets || group.assets.length === 0) {
      return null;
    }

    return group.assets[this.assetIndex] ?? null;
  }

  getActiveLayer() {
    return EDITOR_LAYERS[this.layerIndex];
  }

  getActiveTool() {
    return EDITOR_TOOLS[this.toolIndex];
  }

  findToolIndexById(toolId) {
    const idx = EDITOR_TOOLS.findIndex((tool) => tool.id === toolId);
    return idx < 0 ? 0 : idx;
  }

  getLayerCellValue(layerId, cellKey) {
    if (layerId === 'floor') {
      return this.floorCells.get(cellKey) ?? null;
    }

    if (layerId === 'collision') {
      return this.collisionCells.get(cellKey) ?? null;
    }

    return this.decorCells.get(cellKey) ?? null;
  }

  toCellKey(x, y) {
    return `${x},${y}`;
  }

  fromCellKey(cellKey) {
    const [xText, yText] = cellKey.split(',');
    return {
      x: Number(xText),
      y: Number(yText),
    };
  }

  getCellFromWorld(worldX, worldY) {
    return {
      x: Phaser.Math.Clamp(Math.floor(worldX / this.tileSize), 0, this.cols - 1),
      y: Phaser.Math.Clamp(Math.floor(worldY / this.tileSize), 0, this.rows - 1),
    };
  }

  getAutoSaveKey() {
    return `dev-world-builder:${this.sceneLabel.toLowerCase()}`;
  }

  updateHud() {
    const activeLayer = this.getActiveLayer();
    const activeTool = this.getActiveTool();
    const groups = this.getGroupsForActiveLayer();
    const selectedGroup = groups[this.groupIndex] ?? null;
    const selectedAsset = this.getSelectedAsset();

    if (!this.enabled) {
      return;
    }

    const groupLabel = selectedGroup ? selectedGroup.label : 'None';
    const modeOnStyle = { fill: 0x2e6842, stroke: 0x95ffaf };

    this.toolbarModeBadge
      .setFillStyle(modeOnStyle.fill, 0.95)
      .setStrokeStyle(1, modeOnStyle.stroke, 0.9);
    this.toolbarModeText.setText('DEV ON');

    this.toolbarPrimaryText.setText(
      `${this.sceneLabel}  |  Tool: ${activeTool.label}  |  Layer: ${activeLayer.label}`,
    );
    this.toolbarSecondaryText.setText(
      `Category: ${groupLabel}  |  Cell: ${this.currentCell.x},${this.currentCell.y}  |  Undo: ${this.undoStack.length}/${HISTORY_LIMIT}  Redo: ${this.redoStack.length}`,
    );

    this.toolbarHelpText.setText(
      'Tools P/F/R/M | Layer 1/2/3 | Palette Q/E + Z/X | Showcase G | Undo Ctrl+Z | Redo Ctrl+Y | Save Ctrl+S | Quick Save Ctrl+Shift+S | Quick Load Ctrl+Shift+L | Load Ctrl+O | Camera I/J/K/L',
    );

    if (this.lastSaveStatus) {
      this.toolbarSecondaryText.setText(`${this.toolbarSecondaryText.text}  |  ${this.lastSaveStatus}`);
    }

    for (let index = 0; index < (this.toolButtons?.length ?? 0); index += 1) {
      const active = this.toolIndex === index;
      const button = this.toolButtons[index];
      button.bg.setFillStyle(active ? 0x2a6f8f : 0x163342, 0.95);
      button.bg.setStrokeStyle(1, active ? 0x9ce7ff : 0x3b89ad, 0.9);
      button.label.setColor(active ? '#ffffff' : '#dff5ff');
    }

    for (let index = 0; index < (this.layerTabs?.length ?? 0); index += 1) {
      const active = this.layerIndex === index;
      const tab = this.layerTabs[index];
      tab.bg.setFillStyle(active ? 0x375445 : 0x1f2d38, 0.95);
      tab.bg.setStrokeStyle(1, active ? 0x95ffaf : 0x577891, 0.9);
      tab.label.setColor(active ? '#ecfff3' : '#d2e6f2');
    }

    if (selectedAsset && this.scene.textures.exists(selectedAsset.key)) {
      this.assetPreviewImage.setTexture(selectedAsset.key).setVisible(true);
      this.assetPreviewLabel.setText(`Selected Asset\n${selectedAsset.label}`).setVisible(true);
      return;
    }

    this.assetPreviewImage.setVisible(false);
    this.assetPreviewLabel.setText('Selected Asset\nNone').setVisible(true);
  }

  destroy() {
    if (this.scene.input) {
      this.scene.input.off('pointerdown', this.pointerDownHandler);
      this.scene.input.off('pointermove', this.pointerMoveHandler);
      this.scene.input.off('pointerup', this.pointerUpHandler);
    }

    if (this.scene.input?.keyboard) {
      this.scene.input.keyboard.off('keydown', this.keyDownHandler);
    }

    if (this.fileInputElement) {
      this.fileInputElement.remove();
      this.fileInputElement = null;
    }

    for (const button of this.toolButtons ?? []) {
      button.bg.destroy();
      button.label.destroy();
    }

    for (const tab of this.layerTabs ?? []) {
      tab.bg.destroy();
      tab.label.destroy();
    }
  }
}
