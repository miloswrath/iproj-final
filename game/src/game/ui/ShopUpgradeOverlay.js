import Phaser from 'phaser';
import {
  buyVillageShopItem,
  getInventoryItemQuantity,
  getPlaytestProgressionSummary,
  getUpgradeProgressionState,
  getVillageShopState,
  purchaseUpgrade,
} from '../playtestProgression';
import { INVENTORY_ITEM_DEFS } from './inventoryData';

const OVERLAY_DEPTH = 21000;
const ROW_HEIGHT = 82;
const RESOURCE_IDS = [
  'sun-coins',
  'slime-jelly',
  'cracked-fang',
  'iron-ore',
  'ash-glass',
  'crystal-shard',
  'tempered-bloom',
  'echo-thread',
];
const INVENTORY_DEFS_BY_ID = new Map(Object.values(INVENTORY_ITEM_DEFS).map((item) => [item.id, item]));

function getItemName(itemId) {
  return INVENTORY_DEFS_BY_ID.get(itemId)?.name ?? itemId;
}

function formatCost(cost = []) {
  if (!cost.length) {
    return 'No cost';
  }

  return cost.map((entry) => `${getInventoryItemQuantity(entry.itemId)}/${entry.quantity} ${getItemName(entry.itemId)}`).join(' | ');
}

function formatUpgradeEffect(entry) {
  if (entry.stat === 'attack') {
    return `Attack +${entry.amountPerRank} per rank`;
  }
  if (entry.stat === 'maxHp') {
    return `Max HP +${entry.amountPerRank} per rank`;
  }
  if (entry.stat === 'defendReduction') {
    return `Defend +${entry.amountPerRank} per rank`;
  }
  return `${entry.stat} +${entry.amountPerRank} per rank`;
}

function singleLine(text = '', maxLength = 64) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

const MODE_CONFIG = {
  shop: {
    title: 'Village Shop',
    feedback: 'Choose a supply item to buy.',
  },
  upgrades: {
    title: 'Upgrade Workshop',
    feedback: 'Choose an upgrade to improve.',
  },
  healer: {
    title: 'Healer',
    feedback: 'Buy recovery supplies or strengthen Ward.',
  },
  trainer: {
    title: 'Training Yard',
    feedback: 'Train combat upgrades before the next dungeon.',
  },
  quests: {
    title: 'Quest Hub',
    feedback: 'Review the current loop and village goals.',
  },
};

export class ShopUpgradeOverlay {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.onAfterPurchase = options.onAfterPurchase ?? (() => {});
    this.isOpen = false;
    this.mode = 'shop';
    this.selectedIndex = 0;
    this.feedback = '';

    this.upKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.enterKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.build();
    this.setVisible(false);
  }

  build() {
    const { width, height } = this.scene.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const panelWidth = Math.min(900, width - 80);
    const panelHeight = 500;
    const panelLeft = centerX - panelWidth / 2;
    const panelTop = centerY - panelHeight / 2;

    this.elements = [];
    this.backdrop = this.scene.add.rectangle(centerX, centerY, width, height, 0x081017, 0.7);
    this.panelShadow = this.scene.add.rectangle(centerX + 8, centerY + 10, panelWidth, panelHeight, 0x000000, 0.32);
    this.panel = this.scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0xf1dfb2, 0.98)
      .setStrokeStyle(4, 0x52371f, 0.92);
    this.header = this.scene.add.rectangle(centerX, panelTop + 34, panelWidth - 34, 44, 0x4c956c, 1)
      .setStrokeStyle(3, 0x25452f, 0.9);

    this.titleText = this.scene.add.text(panelLeft + 36, panelTop + 20, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#162719',
    });
    this.hintText = this.scene.add.text(panelLeft + panelWidth - 36, panelTop + 23, 'Up/Down select | Enter buy | Esc close', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#1f3625',
    }).setOrigin(1, 0);

    this.resourcePanel = this.scene.add.rectangle(panelLeft + 154, panelTop + 258, 238, 324, 0xf8ebc7, 1)
      .setStrokeStyle(3, 0x8a623a, 0.88);
    this.resourceTitle = this.scene.add.text(panelLeft + 50, panelTop + 114, 'Resources', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#2c2318',
    });
    this.resourceText = this.scene.add.text(panelLeft + 50, panelTop + 148, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#3b3326',
      lineSpacing: 7,
    });
    this.statText = this.scene.add.text(panelLeft + 50, panelTop + 354, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#4a3925',
      lineSpacing: 5,
    });

    this.listPanel = this.scene.add.rectangle(panelLeft + 588, panelTop + 258, panelWidth - 328, 324, 0xf8ebc7, 1)
      .setStrokeStyle(3, 0x8a623a, 0.88);
    this.rowContainers = [];
    this.rowBoxes = [];
    this.rowNameTexts = [];
    this.rowDetailTexts = [];
    this.rowCostTexts = [];
    this.rowActionTexts = [];

    for (let index = 0; index < 4; index += 1) {
      const rowY = panelTop + 132 + (index * ROW_HEIGHT);
      const row = this.scene.add.container(panelLeft + 328, rowY);
      const box = this.scene.add.rectangle(0, 0, panelWidth - 370, 70, 0xdec28c, 1)
        .setOrigin(0, 0.5)
        .setStrokeStyle(2, 0x8a623a, 0.85)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.purchase(index))
        .on('pointerover', () => this.select(index));
      const name = this.scene.add.text(16, -22, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#211910',
      });
      const detail = this.scene.add.text(16, -1, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#51412c',
      });
      const cost = this.scene.add.text(16, 19, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#674c2d',
      });
      const action = this.scene.add.text(panelWidth - 394, -10, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#162719',
        backgroundColor: '#f7e7bd',
        padding: { x: 7, y: 3 },
      }).setOrigin(1, 0);

      row.add([box, name, detail, cost, action]);
      this.rowContainers.push(row);
      this.rowBoxes.push(box);
      this.rowNameTexts.push(name);
      this.rowDetailTexts.push(detail);
      this.rowCostTexts.push(cost);
      this.rowActionTexts.push(action);
    }

    this.feedbackText = this.scene.add.text(panelLeft + 328, panelTop + panelHeight - 74, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#25452f',
      wordWrap: { width: panelWidth - 370 },
    });
    this.footerText = this.scene.add.text(panelLeft + 36, panelTop + panelHeight - 30, 'Purchases spend dungeon and companion rewards from your inventory.', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#5d4d35',
    });

    this.elements.push(
      this.backdrop,
      this.panelShadow,
      this.panel,
      this.header,
      this.titleText,
      this.hintText,
      this.resourcePanel,
      this.resourceTitle,
      this.resourceText,
      this.statText,
      this.listPanel,
      this.feedbackText,
      this.footerText,
      ...this.rowContainers,
    );

    for (const element of this.elements) {
      element.setScrollFactor(0);
      element.setDepth(OVERLAY_DEPTH);
    }
  }

  update() {
    if (!this.isOpen) {
      return false;
    }

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.close();
      return true;
    }

    if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.select(Phaser.Math.Wrap(this.selectedIndex - 1, 0, this.getEntries().length));
      return true;
    }

    if (Phaser.Input.Keyboard.JustDown(this.downKey)) {
      this.select(Phaser.Math.Wrap(this.selectedIndex + 1, 0, this.getEntries().length));
      return true;
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.purchase(this.selectedIndex);
      return true;
    }

    return true;
  }

  open(mode = 'shop', preferredId = null) {
    this.mode = MODE_CONFIG[mode] ? mode : 'shop';
    const entries = this.getEntries();
    const preferredIndex = preferredId ? entries.findIndex((entry) => entry.id === preferredId) : -1;
    this.selectedIndex = preferredIndex >= 0 ? preferredIndex : 0;
    this.feedback = MODE_CONFIG[this.mode].feedback;
    this.isOpen = true;
    this.setVisible(true);
    this.refresh();
  }

  close() {
    this.isOpen = false;
    this.setVisible(false);
  }

  setVisible(visible) {
    for (const element of this.elements) {
      element.setVisible(visible);
    }
  }

  select(index) {
    const entries = this.getEntries();
    if (!entries.length) {
      this.selectedIndex = 0;
      return;
    }
    this.selectedIndex = Phaser.Math.Clamp(index, 0, entries.length - 1);
    this.refresh();
  }

  getEntries() {
    const shopEntries = getVillageShopState().map((entry, index) => ({
      ...entry,
      kind: 'shop',
      id: `shop-${index}`,
      stockIndex: index,
      itemDef: INVENTORY_DEFS_BY_ID.get(entry.itemId) ?? null,
    }));

    const upgradeEntries = getUpgradeProgressionState().map((entry) => ({
      ...entry,
      kind: 'upgrade',
    }));

    if (this.mode === 'upgrades') {
      return upgradeEntries;
    }

    if (this.mode === 'healer') {
      return [
        ...shopEntries.filter((entry) => ['field-tonic', 'ember-tonic'].includes(entry.itemId)),
        ...upgradeEntries.filter((entry) => entry.id === 'ward'),
      ];
    }

    if (this.mode === 'trainer') {
      return upgradeEntries.filter((entry) => ['guard', 'claws'].includes(entry.id));
    }

    if (this.mode === 'quests') {
      const summary = getPlaytestProgressionSummary();
      const lastReward = summary.lastReward?.name ?? 'none yet';
      return [
        {
          kind: 'info',
          id: 'quest-loop',
          label: 'Core Loop',
          detail: 'Dungeon clears feed rewards, shops, upgrades, then harder runs.',
          cost: [],
          canBuy: false,
        },
        {
          kind: 'info',
          id: 'quest-progress',
          label: 'Run Progress',
          detail: `${summary.dungeonClears} clears | ${summary.rewardsEarned} rewards earned`,
          cost: [],
          canBuy: false,
        },
        {
          kind: 'info',
          id: 'quest-reward',
          label: 'Latest Reward',
          detail: lastReward,
          cost: [],
          canBuy: false,
        },
      ];
    }

    return shopEntries;
  }

  purchase(index) {
    const entries = this.getEntries();
    const entry = entries[index];
    if (!entry) {
      return;
    }

    let result;
    if (entry.kind === 'upgrade') {
      result = purchaseUpgrade(entry.id);
      if (result.purchased) {
        this.feedback = `${result.label} upgraded to rank ${result.rank}.`;
      } else if (result.reason === 'maxed') {
        this.feedback = `${result.label} is already maxed.`;
      } else {
        this.feedback = `${result.label} needs more materials.`;
      }
    } else if (entry.kind === 'shop') {
      result = buyVillageShopItem(entry.stockIndex);
      this.feedback = result.purchased
        ? `Bought ${result.quantity}x ${result.itemName}.`
        : `Need more goods for ${result.itemName ?? entry.name}.`;
    } else {
      this.feedback = entry.detail;
    }

    this.onAfterPurchase(this.feedback);
    this.refresh();
  }

  refresh() {
    const entries = this.getEntries();
    const progression = getPlaytestProgressionSummary();
    const combat = progression.combat ?? {};

    this.titleText.setText(MODE_CONFIG[this.mode].title);
    this.resourceText.setText(RESOURCE_IDS.map((itemId) => {
      const qty = getInventoryItemQuantity(itemId);
      return `${getItemName(itemId)}: ${qty}`;
    }).join('\n'));
    this.statText.setText([
      `Attack: ${combat.attack ?? 0}`,
      `Max HP: ${combat.maxHp ?? 0}`,
      `Defend: ${combat.defendReduction ?? 0}`,
    ].join('\n'));
    this.feedbackText.setText(this.feedback);

    for (let index = 0; index < this.rowContainers.length; index += 1) {
      const entry = entries[index];
      const visible = Boolean(entry);
      this.rowContainers[index].setVisible(visible && this.isOpen);
      if (!visible) {
        continue;
      }

      const selected = index === this.selectedIndex;
      const canBuy = entry.kind !== 'info' && entry.canBuy;
      this.rowBoxes[index].setFillStyle(selected ? 0xeaf1bf : 0xdec28c, 1);
      this.rowBoxes[index].setStrokeStyle(3, selected ? 0x4c956c : 0x8a623a, 0.9);
      this.rowNameTexts[index].setText(this.getEntryName(entry));
      this.rowDetailTexts[index].setText(this.getEntryDetail(entry));
      this.rowCostTexts[index].setText(`Cost: ${formatCost(entry.cost)}`);
      this.rowActionTexts[index]
        .setText(this.getActionLabel(entry))
        .setColor(canBuy ? '#162719' : '#6c5640')
        .setBackgroundColor(canBuy ? '#d7f171' : '#d2b68a');
    }
  }

  getEntryName(entry) {
    if (entry.kind === 'upgrade') {
      return `${entry.label} rank ${entry.rank}/${entry.maxRank}`;
    }
    if (entry.kind === 'info') {
      return entry.label;
    }

    return `${entry.name} x${entry.quantity}`;
  }

  getEntryDetail(entry) {
    if (entry.kind === 'upgrade') {
      return entry.maxed ? 'Fully upgraded' : formatUpgradeEffect(entry);
    }
    if (entry.kind === 'info') {
      return singleLine(entry.detail);
    }

    return singleLine(entry.itemDef?.description ?? 'Village stock for the next dungeon run.');
  }

  getActionLabel(entry) {
    if (entry.kind === 'info') {
      return 'Info';
    }
    if (entry.kind === 'upgrade' && entry.maxed) {
      return 'Maxed';
    }

    return entry.canBuy ? 'Buy' : 'Need';
  }
}
