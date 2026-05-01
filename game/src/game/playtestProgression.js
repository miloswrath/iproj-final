import { INVENTORY_ITEM_DEFS, createInventoryEntry } from './ui/inventoryData';

const INVENTORY_SLOTS = 15;
const STORAGE_KEY = 'final.playtest.progression.v2';
const EQUIPMENT_SLOT_DEFS = [
  { key: 'weapon', label: 'Weapon' },
  { key: 'armor', label: 'Armor' },
  { key: 'trinket', label: 'Trinket' },
  { key: 'boots', label: 'Boots' },
];

const BASE_PLAYER_COMBAT = {
  maxHp: 36,
  attack: 9,
  defendReduction: 6,
};

function createEmptyInventorySlots() {
  return Array.from({ length: INVENTORY_SLOTS }, () => null);
}

function createEmptyEquipmentSlots() {
  return EQUIPMENT_SLOT_DEFS.map((slot) => ({ ...slot, item: null }));
}

function defaultFriendshipState() {
  return {
    activeCharacter: {
      activeNpcId: 'girl-1-east',
      starterNpcId: 'girl-1-east',
      unlockedNpcIds: ['girl-1-east'],
      completedNpcIds: [],
      pendingUnlockNpcId: null,
      lastAdvancedAt: null,
    },
    friendRoster: [],
    lastFriendUnlock: null,
    postBattleReturnContext: null,
  };
}

const progressionState = {
  playerCombat: {
    ...BASE_PLAYER_COMBAT,
    hp: BASE_PLAYER_COMBAT.maxHp,
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
  friendship: defaultFriendshipState(),
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function saveProgressionState() {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progressionState));
  } catch {
    // Best-effort persistence only.
  }
}

function loadPersistedState() {
  if (!canUseStorage()) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      Object.assign(progressionState, parsed);
    }
  } catch {
    // Ignore malformed saved data.
  }
}

loadPersistedState();

function getProgressionLevel() {
  return Math.max(1, progressionState.totals.dungeonClears + 1);
}

function getLevelCombatFloor(level = getProgressionLevel()) {
  const levelOffset = Math.max(0, level - 1);

  return {
    maxHp: BASE_PLAYER_COMBAT.maxHp + (levelOffset * 4),
    attack: BASE_PLAYER_COMBAT.attack + Math.floor(levelOffset * 1.4),
    defendReduction: BASE_PLAYER_COMBAT.defendReduction + Math.floor(levelOffset * 0.8),
  };
}

function normalizeFriendshipState() {
  if (!progressionState.friendship || typeof progressionState.friendship !== 'object') {
    progressionState.friendship = defaultFriendshipState();
  }

  const defaults = defaultFriendshipState();
  progressionState.friendship.activeCharacter = {
    ...defaults.activeCharacter,
    ...(progressionState.friendship.activeCharacter ?? {}),
  };

  if (!Array.isArray(progressionState.friendship.activeCharacter.unlockedNpcIds)) {
    progressionState.friendship.activeCharacter.unlockedNpcIds = ['girl-1-east'];
  }
  if (!Array.isArray(progressionState.friendship.activeCharacter.completedNpcIds)) {
    progressionState.friendship.activeCharacter.completedNpcIds = [];
  }
  if (!Array.isArray(progressionState.friendship.friendRoster)) {
    progressionState.friendship.friendRoster = [];
  }
}

function normalizeInventoryState() {
  normalizeFriendshipState();

  if (!progressionState.playerCombat || typeof progressionState.playerCombat !== 'object') {
    progressionState.playerCombat = {
      ...BASE_PLAYER_COMBAT,
      hp: BASE_PLAYER_COMBAT.maxHp,
    };
  }

  const levelFloor = getLevelCombatFloor();
  progressionState.playerCombat.maxHp = Math.max(progressionState.playerCombat.maxHp ?? levelFloor.maxHp, levelFloor.maxHp);
  progressionState.playerCombat.attack = Math.max(progressionState.playerCombat.attack ?? levelFloor.attack, levelFloor.attack);
  progressionState.playerCombat.defendReduction = Math.max(
    progressionState.playerCombat.defendReduction ?? levelFloor.defendReduction,
    levelFloor.defendReduction,
  );
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
  return {
    ...progressionState.playerCombat,
    level: getProgressionLevel(),
  };
}

export function getPlaytestLevel() {
  normalizeInventoryState();
  return getProgressionLevel();
}

export function getPlaytestProgressionSummary() {
  normalizeInventoryState();
  return {
    level: getProgressionLevel(),
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
    saveProgressionState();
    return;
  }

  const emptySlotIndex = findFirstEmptySlotIndex();
  if (emptySlotIndex === -1) {
    return;
  }

  progressionState.inventory.items[emptySlotIndex] = createInventoryEntry(itemDef, quantity);
  saveProgressionState();
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
    saveProgressionState();
    return true;
  }

  return false;
}

export function setPlaytestPlayerHp(hp) {
  normalizeInventoryState();
  progressionState.playerCombat.hp = Math.max(0, Math.min(hp, progressionState.playerCombat.maxHp));
  saveProgressionState();
  return progressionState.playerCombat.hp;
}

export function resetPlaytestPlayerHp() {
  normalizeInventoryState();
  progressionState.playerCombat.hp = progressionState.playerCombat.maxHp;
  saveProgressionState();
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
  saveProgressionState();

  return {
    granted: true,
    rewards,
    summaryText: progressionState.lastReward.summaryText,
  };
}

export function recordDungeonClear(layoutState) {
  const allChestsOpened = (layoutState?.chests ?? []).every((chest) => chest.opened === true);
  if (!layoutState?.encounterCompleted || !allChestsOpened || layoutState.clearRecorded) {
    return false;
  }

  layoutState.clearRecorded = true;
  progressionState.totals.dungeonClears += 1;
  normalizeInventoryState();
  progressionState.playerCombat.hp = progressionState.playerCombat.maxHp;
  saveProgressionState();
  return true;
}

// ─── Quest Run State ──────────────────────────────────────────────────────────

export function getQuestRunState() {
  return progressionState.questRunState;
}

export function setQuestRunState(state) {
  progressionState.questRunState = state;
  saveProgressionState();
}

export function clearQuestRunState() {
  progressionState.questRunState = null;
  saveProgressionState();
}

export function isQuestRunActive() {
  return progressionState.questRunState !== null && progressionState.questRunState.isActive === true;
}

export function advanceQuestRunFloor() {
  const state = progressionState.questRunState;
  if (!state) return false;
  if (state.currentFloorIndex >= 2) return false;
  state.currentFloorIndex += 1;
  saveProgressionState();
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
  saveProgressionState();
}

export function recordQuestFloorChestOpened() {
  const state = progressionState.questRunState;
  if (!state) return;
  if (!state.floorStats) state.floorStats = {};
  const key = `floor${state.currentFloorIndex}`;
  if (!state.floorStats[key]) state.floorStats[key] = { enemiesDefeated: 0, chestsOpened: 0 };
  state.floorStats[key].chestsOpened += 1;
  state.totalChestsOpened = (state.totalChestsOpened ?? 0) + 1;
  saveProgressionState();
}

// ─── Friendship Progression ───────────────────────────────────────────────────

export function getFriendshipProgressionState() {
  normalizeInventoryState();
  return progressionState.friendship;
}

export function getActiveCharacterState() {
  normalizeInventoryState();
  return progressionState.friendship.activeCharacter;
}

export function setActiveCharacterState(activeCharacter) {
  normalizeInventoryState();
  progressionState.friendship.activeCharacter = {
    ...progressionState.friendship.activeCharacter,
    ...(activeCharacter ?? {}),
  };
  saveProgressionState();
  return progressionState.friendship.activeCharacter;
}

export function getFriendRoster() {
  normalizeInventoryState();
  return progressionState.friendship.friendRoster;
}

export function setFriendRoster(friends) {
  normalizeInventoryState();
  progressionState.friendship.friendRoster = Array.isArray(friends) ? friends : [];
  saveProgressionState();
  return progressionState.friendship.friendRoster;
}

export function getLastFriendUnlock() {
  normalizeInventoryState();
  return progressionState.friendship.lastFriendUnlock;
}

export function setPostBattleReturnContext(context) {
  normalizeInventoryState();
  progressionState.friendship.postBattleReturnContext = context ?? null;
  saveProgressionState();
}

export function getPostBattleReturnContext() {
  normalizeInventoryState();
  return progressionState.friendship.postBattleReturnContext ?? null;
}

export function clearPostBattleReturnContext() {
  normalizeInventoryState();
  progressionState.friendship.postBattleReturnContext = null;
  saveProgressionState();
}

export function applyFriendshipRewards(rewardResults = []) {
  normalizeInventoryState();
  const granted = [];

  for (const reward of rewardResults) {
    if (!reward?.granted) continue;
    const itemDef = inventoryItemDefsById.get(reward.itemId);
    if (!itemDef) continue;
    addInventoryQuantity(itemDef, reward.quantity ?? 1);
    granted.push({
      id: itemDef.id,
      name: itemDef.name,
      quantity: reward.quantity ?? 1,
    });
  }

  if (granted.length > 0) {
    progressionState.totals.rewardsEarned += granted.reduce((sum, reward) => sum + reward.quantity, 0);
    progressionState.lastReward = {
      dungeonId: 'friendship',
      rewards: granted,
      summaryText: granted.map((reward) => `+${reward.quantity} ${reward.name}`).join(', '),
    };
  }

  saveProgressionState();
  return granted;
}

export function applyFriendshipUpdate(update) {
  normalizeInventoryState();
  if (!update) return null;

  const active = progressionState.friendship.activeCharacter;
  if (!active.completedNpcIds.includes(update.npcId)) {
    active.completedNpcIds.push(update.npcId);
  }
  if (!active.unlockedNpcIds.includes(update.npcId)) {
    active.unlockedNpcIds.push(update.npcId);
  }
  if (update.newlyUnlockedNpcId) {
    if (!active.unlockedNpcIds.includes(update.newlyUnlockedNpcId)) {
      active.unlockedNpcIds.push(update.newlyUnlockedNpcId);
    }
    active.pendingUnlockNpcId = update.newlyUnlockedNpcId;
    active.activeNpcId = update.newlyUnlockedNpcId;
  } else {
    active.pendingUnlockNpcId = null;
    active.activeNpcId = update.npcId;
  }
  active.lastAdvancedAt = new Date().toISOString();

  applyFriendshipRewards(update.rewardResults ?? []);
  progressionState.friendship.lastFriendUnlock = {
    ...update,
    appliedAt: new Date().toISOString(),
  };
  saveProgressionState();
  return progressionState.friendship.lastFriendUnlock;
}
