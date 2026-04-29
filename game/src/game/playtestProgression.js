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
  playerCombat: {
    maxHp: 30,
    hp: 30,
    attack: 8,
    defendReduction: 4,
  },
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
  questRunState: null,
};

function normalizeInventoryState() {
  if (!progressionState.playerCombat || typeof progressionState.playerCombat !== 'object') {
    progressionState.playerCombat = {
      maxHp: 30,
      hp: 30,
      attack: 8,
      defendReduction: 4,
    };
  }

  progressionState.playerCombat.maxHp = progressionState.playerCombat.maxHp ?? 30;
  progressionState.playerCombat.attack = progressionState.playerCombat.attack ?? 8;
  progressionState.playerCombat.defendReduction = progressionState.playerCombat.defendReduction ?? 4;
  progressionState.playerCombat.hp = Math.max(
    0,
    Math.min(
      progressionState.playerCombat.hp ?? progressionState.playerCombat.maxHp,
      progressionState.playerCombat.maxHp,
    ),
  );

  if (!Array.isArray(progressionState.inventory.items)) {
    progressionState.inventory.items = createEmptyInventorySlots();
  }

  if (progressionState.inventory.items.length !== INVENTORY_SLOTS) {
    progressionState.inventory.items = Array.from({ length: INVENTORY_SLOTS }, (_, index) => (
      progressionState.inventory.items[index] ?? null
    ));
  }

  if (!Array.isArray(progressionState.inventory.equipmentSlots) || progressionState.inventory.equipmentSlots.length !== EQUIPMENT_SLOT_DEFS.length) {
    progressionState.inventory.equipmentSlots = createEmptyEquipmentSlots();
  }
}

export function getPlaytestInventoryState() {
  normalizeInventoryState();
  return progressionState.inventory;
}

export function getPlaytestCombatantState() {
  normalizeInventoryState();
  return progressionState.playerCombat;
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

export function getCombatUsableInventoryItems() {
  normalizeInventoryState();

  return progressionState.inventory.items
    .map((item, slotIndex) => {
      if (!item?.combat?.usable || item.quantity <= 0) {
        return null;
      }

      return {
        ...item,
        slotIndex,
      };
    })
    .filter(Boolean);
}

export function consumeInventoryItem(itemId, quantity = 1) {
  normalizeInventoryState();

  if (quantity <= 0) {
    return false;
  }

  for (let index = 0; index < progressionState.inventory.items.length; index += 1) {
    const item = progressionState.inventory.items[index];
    if (!item || item.id !== itemId || item.quantity < quantity) {
      continue;
    }

    item.quantity -= quantity;
    if (item.quantity <= 0) {
      progressionState.inventory.items[index] = null;
    }
    return true;
  }

  return false;
}

export function setPlaytestPlayerHp(hp) {
  normalizeInventoryState();
  progressionState.playerCombat.hp = Math.max(0, Math.min(hp, progressionState.playerCombat.maxHp));
  return progressionState.playerCombat.hp;
}

export function applyCombatItemEffect(itemId) {
  normalizeInventoryState();

  const itemDef = inventoryItemDefsById.get(itemId);
  if (!itemDef?.combat?.usable) {
    return {
      applied: false,
      reason: 'not-usable',
    };
  }

  const effect = itemDef.combat.effect ?? null;
  if (!effect) {
    return {
      applied: false,
      reason: 'no-effect',
    };
  }

  if (!consumeInventoryItem(itemId, 1)) {
    return {
      applied: false,
      reason: 'missing-item',
    };
  }

  if (effect.kind === 'heal') {
    const previousHp = progressionState.playerCombat.hp;
    const nextHp = setPlaytestPlayerHp(previousHp + effect.amount);
    return {
      applied: true,
      effect: 'heal',
      amount: nextHp - previousHp,
      itemName: itemDef.name,
      hp: nextHp,
    };
  }

  return {
    applied: false,
    reason: 'unsupported-effect',
  };
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

// ─── Quest Run State ──────────────────────────────────────────────────────────

export function getQuestRunState() {
  return progressionState.questRunState;
}

export function setQuestRunState(state) {
  progressionState.questRunState = state;
}

export function clearQuestRunState() {
  progressionState.questRunState = null;
}

export function isQuestRunActive() {
  return progressionState.questRunState !== null && progressionState.questRunState.isActive === true;
}

export function advanceQuestRunFloor() {
  const state = progressionState.questRunState;
  if (!state) return false;
  if (state.currentFloorIndex >= 2) return false;
  state.currentFloorIndex += 1;
  return true;
}

export function recordQuestFloorEnemyDefeated(enemyId) {
  const state = progressionState.questRunState;
  if (!state) return;
  if (!state.defeatedEnemyIds) {
    state.defeatedEnemyIds = {};
  }
  const floorKey = `floor${state.currentFloorIndex}`;
  if (enemyId && state.defeatedEnemyIds[floorKey]?.includes(enemyId)) {
    return;
  }
  if (enemyId) {
    if (!state.defeatedEnemyIds[floorKey]) {
      state.defeatedEnemyIds[floorKey] = [];
    }
    state.defeatedEnemyIds[floorKey].push(enemyId);
  }
  if (!state.floorStats) state.floorStats = {};
  if (!state.floorStats[floorKey]) state.floorStats[floorKey] = { enemiesDefeated: 0, chestsOpened: 0 };
  state.floorStats[floorKey].enemiesDefeated += 1;
  state.totalEnemiesDefeated = (state.totalEnemiesDefeated ?? 0) + 1;
}

export function recordQuestFloorChestOpened() {
  const state = progressionState.questRunState;
  if (!state) return;
  if (!state.floorStats) state.floorStats = {};
  const key = `floor${state.currentFloorIndex}`;
  if (!state.floorStats[key]) state.floorStats[key] = { enemiesDefeated: 0, chestsOpened: 0 };
  state.floorStats[key].chestsOpened += 1;
  state.totalChestsOpened = (state.totalChestsOpened ?? 0) + 1;
}
