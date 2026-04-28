import Phaser from 'phaser';

const OVERLAY_DEPTH = 20000;
const SLOT_COLUMNS = 5;
const SLOT_SIZE = 46;
const SLOT_ICON_SIZE = 34;
const SLOT_GAP = 10;
const EQUIPMENT_COLUMNS = 2;
const EQUIPMENT_SLOT_SIZE = 42;
const EQUIPMENT_ICON_SIZE = 32;
const DETAIL_ICON_SIZE = 44;

export class InventoryOverlay {
  constructor(scene, inventoryState, options = {}) {
    this.scene = scene;
    this.inventoryState = inventoryState;
    this.title = options.title ?? 'Inventory';
    this.subtitle = options.subtitle ?? 'I / Tab toggle | Arrow keys browse';
    this.selectedSlotIndex = 0;
    this.isOpen = false;

    this.toggleKeys = [
      scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB),
    ];
    this.leftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.upKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

    this.build();
    this.refresh();
    this.setVisible(false);
  }

  build() {
    const { width, height } = this.scene.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const panelWidth = 920;
    const panelHeight = 388;
    const panelLeft = centerX - panelWidth / 2;
    const panelTop = centerY - panelHeight / 2;
    const detailPanelWidth = 292;
    const gridPanelWidth = 328;
    const gearPanelWidth = 212;
    const detailPanelLeft = panelLeft + 24;
    const gridPanelLeft = detailPanelLeft + detailPanelWidth + 24;
    const gearPanelLeft = gridPanelLeft + gridPanelWidth + 24;
    const sectionTop = panelTop + 54;
    const sectionHeight = 268;
    const slotOriginX = gridPanelLeft + 28;
    const slotOriginY = sectionTop + 44;
    const gearSlotOriginX = gearPanelLeft + 32;
    const gearSlotOriginY = sectionTop + 76;

    this.elements = [];
    this.backdrop = this.scene.add.rectangle(centerX, centerY, width, height, 0x081017, 0.76);
    this.panelShadow = this.scene.add.rectangle(centerX, centerY + 10, panelWidth + 26, panelHeight + 24, 0x000000, 0.34);
    this.panelFrame = this.scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0xe8d1a2, 0.98)
      .setStrokeStyle(4, 0x55361f, 0.9);
    this.detailPanel = this.scene.add.rectangle(
      detailPanelLeft + detailPanelWidth / 2,
      sectionTop + sectionHeight / 2,
      detailPanelWidth,
      sectionHeight,
      0xf4e5bb,
      1,
    ).setStrokeStyle(3, 0x7f5b34, 0.95);
    this.gridPanel = this.scene.add.rectangle(
      gridPanelLeft + gridPanelWidth / 2,
      sectionTop + sectionHeight / 2,
      gridPanelWidth,
      sectionHeight,
      0xf4e5bb,
      1,
    ).setStrokeStyle(3, 0x7f5b34, 0.95);
    this.gearPanel = this.scene.add.rectangle(
      gearPanelLeft + gearPanelWidth / 2,
      sectionTop + sectionHeight / 2,
      gearPanelWidth,
      sectionHeight,
      0xf4e5bb,
      1,
    ).setStrokeStyle(3, 0x7f5b34, 0.95);
    this.detailHeader = this.scene.add.rectangle(
      detailPanelLeft + detailPanelWidth / 2,
      panelTop + 28,
      detailPanelWidth,
      34,
      0x59b68a,
      1,
    ).setStrokeStyle(3, 0x30593f, 0.95);
    this.gridHeader = this.scene.add.rectangle(
      gridPanelLeft + gridPanelWidth / 2,
      panelTop + 28,
      gridPanelWidth,
      34,
      0x59b68a,
      1,
    ).setStrokeStyle(3, 0x30593f, 0.95);
    this.gearHeader = this.scene.add.rectangle(
      gearPanelLeft + gearPanelWidth / 2,
      panelTop + 28,
      gearPanelWidth,
      34,
      0x59b68a,
      1,
    ).setStrokeStyle(3, 0x30593f, 0.95);
    this.titleText = this.scene.add.text(detailPanelLeft + 16, panelTop + 14, this.title, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#20311c',
    });
    this.gridTitleText = this.scene.add.text(gridPanelLeft + 92, panelTop + 14, 'Backpack', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#20311c',
    });
    this.gearTitleText = this.scene.add.text(gearPanelLeft + 64, panelTop + 14, 'Equipment', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#20311c',
    });
    this.subtitleText = this.scene.add.text(panelLeft + 24, panelTop + panelHeight - 28, this.subtitle, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#36503a',
    });
    this.emptyText = this.scene.add.text(detailPanelLeft + 28, sectionTop + 132, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#5c503a',
      wordWrap: { width: 230 },
    });
    this.detailNameText = this.scene.add.text(detailPanelLeft + 24, sectionTop + 18, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#2a2418',
      wordWrap: { width: 170 },
    });
    this.detailTypeText = this.scene.add.text(detailPanelLeft + 24, sectionTop + 56, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#5f5037',
    });
    this.detailQuantityText = this.scene.add.text(detailPanelLeft + 24, sectionTop + 82, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#5f5037',
    });
    this.detailDescriptionText = this.scene.add.text(detailPanelLeft + 28, sectionTop + 170, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#3d3427',
      wordWrap: { width: 230 },
    });
    this.detailIconFrame = this.scene.add.rectangle(detailPanelLeft + 226, sectionTop + 66, 60, 60, 0xd8b37f, 1)
      .setStrokeStyle(3, 0x7f5b34, 0.95);
    this.detailIcon = this.scene.add.image(detailPanelLeft + 226, sectionTop + 66, 'ui-inventory-icons', 0)
      .setDisplaySize(DETAIL_ICON_SIZE, DETAIL_ICON_SIZE)
      .setAlpha(0);

    this.slotSprites = [];
    this.iconSprites = [];
    this.quantityTexts = [];

    for (let index = 0; index < this.inventoryState.slots; index += 1) {
      const col = index % SLOT_COLUMNS;
      const row = Math.floor(index / SLOT_COLUMNS);
      const slotX = slotOriginX + col * (SLOT_SIZE + SLOT_GAP);
      const slotY = slotOriginY + row * (SLOT_SIZE + SLOT_GAP);

      const slot = this.scene.add.rectangle(slotX, slotY, SLOT_SIZE, SLOT_SIZE, 0xdab482, 1)
        .setStrokeStyle(3, 0x8a623a, 0.95);
      const icon = this.scene.add.image(slotX, slotY, 'ui-inventory-icons', 0)
        .setDisplaySize(SLOT_ICON_SIZE, SLOT_ICON_SIZE)
        .setVisible(false)
        .setAlpha(0);
      const quantity = this.scene.add.text(slotX + 16, slotY + 14, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#fff7d9',
        backgroundColor: '#4f3320',
        padding: { x: 3, y: 1 },
      }).setOrigin(1, 1);

      this.slotSprites.push(slot);
      this.iconSprites.push(icon);
      this.quantityTexts.push(quantity);
    }

    this.equipmentSlotBoxes = [];
    this.equipmentSlotLabels = [];
    this.equipmentIcons = [];
    const equipmentSlots = this.inventoryState.equipmentSlots ?? [];

    for (let index = 0; index < equipmentSlots.length; index += 1) {
      const col = index % EQUIPMENT_COLUMNS;
      const row = Math.floor(index / EQUIPMENT_COLUMNS);
      const slotX = gearSlotOriginX + col * 86;
      const slotY = gearSlotOriginY + row * 86;
      const slotDef = equipmentSlots[index];

      const slotBox = this.scene.add.rectangle(slotX, slotY, EQUIPMENT_SLOT_SIZE, EQUIPMENT_SLOT_SIZE, 0xdab482, 1)
        .setStrokeStyle(3, 0x8a623a, 0.95);
      const icon = this.scene.add.image(slotX, slotY, 'ui-inventory-icons', 0)
        .setDisplaySize(EQUIPMENT_ICON_SIZE, EQUIPMENT_ICON_SIZE)
        .setVisible(false)
        .setAlpha(0);
      const label = this.scene.add.text(slotX, slotY + 34, slotDef.label, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#5f5037',
      }).setOrigin(0.5, 0);

      this.equipmentSlotBoxes.push(slotBox);
      this.equipmentIcons.push(icon);
      this.equipmentSlotLabels.push(label);
    }

    this.equipmentHintText = this.scene.add.text(gearPanelLeft + 18, sectionTop + sectionHeight - 50, 'Character gear slots.\nEmpty until equipment exists.', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#5c503a',
      wordWrap: { width: gearPanelWidth - 30 },
    });

    this.selectionOutline = this.scene.add.rectangle(slotOriginX, slotOriginY, SLOT_SIZE + 10, SLOT_SIZE + 10)
      .setStrokeStyle(3, 0x53cf8f, 0.95)
      .setFillStyle(0xffffff, 0);
    this.selectionCursor = this.scene.add.text(slotOriginX + 23, slotOriginY - 18, '>', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#3acb8f',
    });

    this.elements.push(
      this.backdrop,
      this.panelShadow,
      this.panelFrame,
      this.detailPanel,
      this.gridPanel,
      this.gearPanel,
      this.detailHeader,
      this.gridHeader,
      this.gearHeader,
      this.titleText,
      this.gridTitleText,
      this.gearTitleText,
      this.subtitleText,
      this.emptyText,
      this.detailNameText,
      this.detailTypeText,
      this.detailQuantityText,
      this.detailDescriptionText,
      this.detailIconFrame,
      this.detailIcon,
      this.selectionOutline,
      this.selectionCursor,
      this.equipmentHintText,
      ...this.slotSprites,
      ...this.iconSprites,
      ...this.quantityTexts,
      ...this.equipmentSlotBoxes,
      ...this.equipmentIcons,
      ...this.equipmentSlotLabels,
    );

    for (const element of this.elements) {
      element.setScrollFactor(0);
      element.setDepth(OVERLAY_DEPTH);
    }

    this.selectionOutline.setDepth(OVERLAY_DEPTH + 1);
    this.selectionCursor.setDepth(OVERLAY_DEPTH + 2);
  }

  update() {
    if (this.toggleKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      this.toggle();
      return true;
    }

    if (!this.isOpen) {
      return false;
    }

    let moved = false;

    if (Phaser.Input.Keyboard.JustDown(this.leftKey)) {
      this.moveSelection(-1, 0);
      moved = true;
    } else if (Phaser.Input.Keyboard.JustDown(this.rightKey)) {
      this.moveSelection(1, 0);
      moved = true;
    } else if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.moveSelection(0, -1);
      moved = true;
    } else if (Phaser.Input.Keyboard.JustDown(this.downKey)) {
      this.moveSelection(0, 1);
      moved = true;
    }

    if (moved) {
      this.refresh();
    }

    return true;
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.setVisible(this.isOpen);
    if (this.isOpen) {
      this.refresh();
    }
  }

  setVisible(visible) {
    for (const element of this.elements) {
      element.setVisible(visible);
    }
  }

  moveSelection(dx, dy) {
    const totalSlots = this.inventoryState.slots;
    const totalRows = Math.ceil(totalSlots / SLOT_COLUMNS);
    const currentCol = this.selectedSlotIndex % SLOT_COLUMNS;
    const currentRow = Math.floor(this.selectedSlotIndex / SLOT_COLUMNS);
    const nextCol = Phaser.Math.Wrap(currentCol + dx, 0, SLOT_COLUMNS);
    const nextRow = Phaser.Math.Wrap(currentRow + dy, 0, totalRows);
    const candidate = nextRow * SLOT_COLUMNS + nextCol;

    this.selectedSlotIndex = candidate >= totalSlots ? nextRow * SLOT_COLUMNS : candidate;
  }

  refresh() {
    for (let index = 0; index < this.inventoryState.slots; index += 1) {
      const item = this.inventoryState.items[index] ?? null;
      const icon = this.iconSprites[index];
      const quantityText = this.quantityTexts[index];
      const slot = this.slotSprites[index];
      const isSelected = index === this.selectedSlotIndex;

      slot.setFillStyle(isSelected ? 0xe7efc3 : 0xdab482, 1);
      slot.setStrokeStyle(3, isSelected ? 0x4bb27f : 0x8a623a, 0.95);
      icon.clearTint();

      if (!item) {
        icon.setVisible(false).setAlpha(0);
        quantityText.setText('').setVisible(false);
        continue;
      }

      this.applyItemIcon(icon, item, SLOT_ICON_SIZE);
      quantityText.setText(item.quantity > 1 ? `${item.quantity}` : '').setVisible(item.quantity > 1);
    }

    const selectedSlot = this.slotSprites[this.selectedSlotIndex];
    const selectedItem = this.inventoryState.items[this.selectedSlotIndex] ?? null;
    this.selectionOutline.setPosition(selectedSlot.x, selectedSlot.y);
    this.selectionCursor.setPosition(selectedSlot.x + 22, selectedSlot.y - 18);

    const equipmentSlots = this.inventoryState.equipmentSlots ?? [];
    for (let index = 0; index < this.equipmentSlotBoxes.length; index += 1) {
      const slot = equipmentSlots[index];
      const icon = this.equipmentIcons[index];
      if (slot?.item) {
        this.applyItemIcon(icon, slot.item, EQUIPMENT_ICON_SIZE);
      } else {
        icon.setVisible(false).setAlpha(0);
      }
    }

    if (!selectedItem) {
      this.detailIcon.setVisible(false).setAlpha(0);
      this.detailNameText.setText('Empty Slot');
      this.detailTypeText.setText('Type: none');
      this.detailQuantityText.setText('Quantity: 0');
      this.detailDescriptionText.setText('Explore dungeons and open chests to claim your first items.');
      this.emptyText.setText('No item stored in this slot.');
      return;
    }

    this.applyItemIcon(this.detailIcon, selectedItem, DETAIL_ICON_SIZE);
    this.detailNameText.setText(selectedItem.name);
    this.detailTypeText.setText(`Type: ${selectedItem.type}`);
    this.detailQuantityText.setText(`Quantity: ${selectedItem.quantity}`);
    this.detailDescriptionText.setText(selectedItem.description);
    this.emptyText.setText('');
  }

  applyItemIcon(icon, item, size) {
    const textureKey = item.iconTexture ?? 'ui-inventory-icons';
    icon.setTexture(textureKey);
    if (textureKey === 'ui-inventory-icons') {
      icon.setFrame(item.iconFrame);
    }

    icon
      .setDisplaySize(size, size)
      .setVisible(true)
      .setAlpha(1);
  }
}
