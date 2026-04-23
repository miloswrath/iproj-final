import { INVENTORY_ITEM_DEFS, createInventoryEntry } from './ui/inventoryData';

const INVENTORY_SLOTS = 15;
const EQUIPMENT_SLOT_DEFS = [
  { key: 'weapon', label: 'Weapon' },
  { key: 'armor', label: 'Armor' },
  { key: 'trinket', label: 'Trinket' },
  { key: 'boots', label: 'Boots' },
];

function createEmptyInventorySlots() {
  return Array.from({ length: INVENTORY_SLOTS }, () => null);
}

function createEmptyEquipmentSlots() {
  return EQUIPMENT_SLOT_DEFS.map((slot) => ({ ...slot, item: null }));
}

const progressionState = {
  inventory: {
    slots: INVENTORY_SLOTS,
    items: createEmptyInventorySlots(),
    equipmentSlots: createEmptyEquipmentSlots(),
  },
  totals: {
    dungeonClears: 0,
    chestsOpened: 0,
    rewardsEarned: 0,
  },
  lastReward: null,
};

function normalizeInventoryState() {
  if (!Array.isArray(progressionState.inventory.items)) {
    progressionState.inventory.items = createEmptyInventorySlots();
  }

  if (progressionState.inventory.items.length !== INVENTORY_SLOTS) {
    progressionState.inventory.items = Array.from({ length: INVENTORY_SLOTS }, (_, index) => (
      progressionState.inventory.items[index] ?? null
    ));
  }

  if (progressionState.totals.chestsOpened === 0 && progressionState.totals.rewardsEarned === 0) {
    progressionState.inventory.items = createEmptyInventorySlots();
  }

  if (!Array.isArray(progressionState.inventory.equipmentSlots) || progressionState.inventory.equipmentSlots.length !== EQUIPMENT_SLOT_DEFS.length) {
    progressionState.inventory.equipmentSlots = createEmptyEquipmentSlots();
  }
}

export function getPlaytestInventoryState() {
  normalizeInventoryState();
  return progressionState.inventory;
}

export function getPlaytestProgressionSummary() {
  normalizeInventoryState();
  return {
    dungeonClears: progressionState.totals.dungeonClears,
    chestsOpened: progressionState.totals.chestsOpened,
    rewardsEarned: progressionState.totals.rewardsEarned,
    lastReward: progressionState.lastReward,
  };
}

const inventoryItemDefsById = new Map(Object.values(INVENTORY_ITEM_DEFS).map((item) => [item.id, item]));

function findInventoryEntry(itemId) {
  for (const item of progressionState.inventory.items) {
    if (item?.id === itemId) {
      return item;
    }
  }

  return null;
}

function findFirstEmptySlotIndex() {
  return progressionState.inventory.items.findIndex((item) => item === null);
}

function addInventoryQuantity(itemDef, quantity) {
  if (quantity <= 0) {
    return;
  }

  const existing = findInventoryEntry(itemDef.id);
  if (existing) {
    existing.quantity += quantity;
    return;
  }

  const emptySlotIndex = findFirstEmptySlotIndex();
  if (emptySlotIndex === -1) {
    return;
  }

  progressionState.inventory.items[emptySlotIndex] = createInventoryEntry(itemDef, quantity);
}

export function claimChestRewards(chest, dungeonId = 'generated') {
  normalizeInventoryState();

  if (!chest || chest.opened || !Array.isArray(chest.rewards) || chest.rewards.length === 0) {
    return {
      granted: false,
      rewards: [],
      summaryText: '',
    };
  }

  const rewards = chest.rewards.map((reward) => {
    const itemDef = inventoryItemDefsById.get(reward.itemId);
    if (!itemDef) {
      return null;
    }

    addInventoryQuantity(itemDef, reward.quantity);
    return {
      id: itemDef.id,
      name: itemDef.name,
      quantity: reward.quantity,
    };
  }).filter(Boolean);

  chest.opened = true;
  progressionState.totals.chestsOpened += 1;
  progressionState.totals.rewardsEarned += rewards.reduce((sum, reward) => sum + reward.quantity, 0);
  progressionState.lastReward = {
    dungeonId,
    rewards,
    summaryText: rewards.map((reward) => `+${reward.quantity} ${reward.name}`).join(', '),
  };

  return {
    granted: true,
    rewards,
    summaryText: progressionState.lastReward.summaryText,
  };
}

export function recordDungeonClear(layoutState) {
  if (!layoutState?.encounterCompleted || layoutState.clearRecorded) {
    return false;
  }

  layoutState.clearRecorded = true;
  progressionState.totals.dungeonClears += 1;
  return true;
}
