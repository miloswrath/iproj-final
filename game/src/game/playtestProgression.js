import { INVENTORY_ITEM_DEFS, createInventoryEntry } from './ui/inventoryData';

const INVENTORY_SLOTS = 24;
const STORAGE_KEY = 'final.playtest.progression.v2';
const EQUIPMENT_SLOT_DEFS = [
  { key: 'weapon', label: 'Weapon' },
  { key: 'armor', label: 'Armor' },
  { key: 'trinket', label: 'Trinket' },
  { key: 'boots', label: 'Boots' },
];

const BASE_PLAYER_COMBAT = {
  maxHp: 36,
  attack: 6,
  defendReduction: 6,
};

const SHOP_STOCK = [
  {
    itemId: 'field-tonic',
    quantity: 1,
    cost: [{ itemId: 'sun-coins', quantity: 6 }],
  },
  {
    itemId: 'ember-tonic',
    quantity: 1,
    cost: [
      { itemId: 'sun-coins', quantity: 10 },
      { itemId: 'slime-jelly', quantity: 1 },
    ],
  },
  {
    itemId: 'iron-ore',
    quantity: 1,
    cost: [
      { itemId: 'sun-coins', quantity: 12 },
      { itemId: 'cracked-fang', quantity: 1 },
    ],
  },
];

const UPGRADE_DEFS = {
  claws: {
    id: 'claws',
    label: 'Claws',
    stat: 'attack',
    maxRank: 5,
    amountPerRank: 2,
    baseCost: [
      { itemId: 'iron-ore', quantity: 1 },
      { itemId: 'ash-glass', quantity: 1 },
    ],
  },
  ward: {
    id: 'ward',
    label: 'Ward',
    stat: 'maxHp',
    maxRank: 5,
    amountPerRank: 5,
    baseCost: [
      { itemId: 'crystal-shard', quantity: 1 },
      { itemId: 'tempered-bloom', quantity: 1 },
    ],
  },
  guard: {
    id: 'guard',
    label: 'Guard',
    stat: 'defendReduction',
    maxRank: 4,
    amountPerRank: 1,
    baseCost: [
      { itemId: 'iron-ore', quantity: 1 },
      { itemId: 'echo-thread', quantity: 1 },
    ],
  },
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

function createDefaultProgressionState() {
  return {
    playerCombat: {
      ...BASE_PLAYER_COMBAT,
      hp: BASE_PLAYER_COMBAT.maxHp,
    },
    inventory: {
      slots: INVENTORY_SLOTS,
      items: createEmptyInventorySlots(),
      equipmentSlots: createEmptyEquipmentSlots(),
    },
    upgrades: {
      claws: 0,
      ward: 0,
      guard: 0,
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
}

const progressionState = createDefaultProgressionState();

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

function defaultUpgradeState() {
  return {
    claws: 0,
    ward: 0,
    guard: 0,
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
  if (!progressionState.upgrades || typeof progressionState.upgrades !== 'object') {
    progressionState.upgrades = defaultUpgradeState();
  }

  for (const upgrade of Object.values(UPGRADE_DEFS)) {
    const rank = progressionState.upgrades[upgrade.id];
    progressionState.upgrades[upgrade.id] = Number.isFinite(rank)
      ? PhaserSafeClamp(Math.floor(rank), 0, upgrade.maxRank)
      : 0;
  }

  const upgradeBonus = getUpgradeCombatBonus();
  progressionState.playerCombat.maxHp = Math.max(progressionState.playerCombat.maxHp ?? levelFloor.maxHp, levelFloor.maxHp + upgradeBonus.maxHp);
  progressionState.playerCombat.attack = Math.max(progressionState.playerCombat.attack ?? levelFloor.attack, levelFloor.attack + upgradeBonus.attack);
  progressionState.playerCombat.defendReduction = Math.max(
    progressionState.playerCombat.defendReduction ?? levelFloor.defendReduction,
    levelFloor.defendReduction + upgradeBonus.defendReduction,
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
  progressionState.inventory.slots = INVENTORY_SLOTS;

  if (progressionState.inventory.items.length !== INVENTORY_SLOTS) {
    progressionState.inventory.items = Array.from({ length: INVENTORY_SLOTS }, (_, index) => (
      progressionState.inventory.items[index] ?? null
    ));
  }

  progressionState.inventory.items = progressionState.inventory.items.map((item) => {
    if (!item?.id) {
      return item;
    }
    const itemDef = inventoryItemDefsById.get(item.id);
    if (!itemDef) {
      return item;
    }
    return {
      ...item,
      name: itemDef.name,
      type: itemDef.type,
      description: itemDef.description,
      iconFrame: itemDef.iconFrame ?? 0,
      iconTexture: itemDef.iconTexture ?? 'ui-inventory-icons',
      combat: itemDef.combat ?? null,
    };
  });

  if (!Array.isArray(progressionState.inventory.equipmentSlots) || progressionState.inventory.equipmentSlots.length !== EQUIPMENT_SLOT_DEFS.length) {
    progressionState.inventory.equipmentSlots = createEmptyEquipmentSlots();
  }
}

function PhaserSafeClamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getUpgradeCombatBonus() {
  const upgrades = progressionState.upgrades ?? defaultUpgradeState();
  return {
    attack: (upgrades.claws ?? 0) * UPGRADE_DEFS.claws.amountPerRank,
    maxHp: (upgrades.ward ?? 0) * UPGRADE_DEFS.ward.amountPerRank,
    defendReduction: (upgrades.guard ?? 0) * UPGRADE_DEFS.guard.amountPerRank,
  };
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
    upgrades: { ...progressionState.upgrades },
    combat: { ...progressionState.playerCombat },
  };
}

export function resetPlaytestProgressionState() {
  const freshState = createDefaultProgressionState();
  for (const key of Object.keys(progressionState)) {
    delete progressionState[key];
  }
  Object.assign(progressionState, freshState);
  saveProgressionState();
  return getPlaytestProgressionSummary();
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

function getInventoryQuantity(itemId) {
  normalizeInventoryState();
  return progressionState.inventory.items.reduce((sum, item) => (
    item?.id === itemId ? sum + item.quantity : sum
  ), 0);
}

export function getInventoryItemQuantity(itemId) {
  return getInventoryQuantity(itemId);
}

function hasCost(cost = []) {
  return cost.every((entry) => getInventoryQuantity(entry.itemId) >= entry.quantity);
}

function consumeCost(cost = []) {
  if (!hasCost(cost)) {
    return false;
  }

  for (const entry of cost) {
    consumeInventoryItem(entry.itemId, entry.quantity);
  }

  return true;
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

export function grantInventoryItem(itemId, quantity = 1) {
  normalizeInventoryState();
  const itemDef = inventoryItemDefsById.get(itemId);
  if (!itemDef || quantity <= 0) {
    return false;
  }

  addInventoryQuantity(itemDef, quantity);
  return true;
}

export function getVillageShopState() {
  normalizeInventoryState();
  return SHOP_STOCK.map((stock) => {
    const itemDef = inventoryItemDefsById.get(stock.itemId);
    return {
      ...stock,
      name: itemDef?.name ?? stock.itemId,
      canBuy: hasCost(stock.cost),
    };
  });
}

export function buyVillageShopItem(stockIndex = 0) {
  normalizeInventoryState();
  const stock = SHOP_STOCK[stockIndex] ?? SHOP_STOCK[0];
  const itemDef = inventoryItemDefsById.get(stock.itemId);
  if (!itemDef) {
    return { purchased: false, reason: 'unknown-item' };
  }
  if (!consumeCost(stock.cost)) {
    return { purchased: false, reason: 'missing-cost', itemName: itemDef.name };
  }

  addInventoryQuantity(itemDef, stock.quantity);
  return {
    purchased: true,
    itemName: itemDef.name,
    quantity: stock.quantity,
  };
}

function getUpgradeCost(upgrade, nextRank) {
  return upgrade.baseCost.map((entry) => ({
    ...entry,
    quantity: entry.quantity + Math.floor((nextRank - 1) / 2),
  }));
}

export function getUpgradeProgressionState() {
  normalizeInventoryState();
  return Object.values(UPGRADE_DEFS).map((upgrade) => {
    const rank = progressionState.upgrades[upgrade.id] ?? 0;
    const nextRank = rank + 1;
    const maxed = rank >= upgrade.maxRank;
    const cost = maxed ? [] : getUpgradeCost(upgrade, nextRank);
    return {
      id: upgrade.id,
      label: upgrade.label,
      stat: upgrade.stat,
      rank,
      maxRank: upgrade.maxRank,
      amountPerRank: upgrade.amountPerRank,
      cost,
      maxed,
      canBuy: !maxed && hasCost(cost),
    };
  });
}

export function purchaseUpgrade(upgradeId = 'claws') {
  normalizeInventoryState();
  const upgrade = UPGRADE_DEFS[upgradeId] ?? UPGRADE_DEFS.claws;
  const rank = progressionState.upgrades[upgrade.id] ?? 0;
  if (rank >= upgrade.maxRank) {
    return { purchased: false, reason: 'maxed', label: upgrade.label };
  }

  const nextRank = rank + 1;
  const cost = getUpgradeCost(upgrade, nextRank);
  if (!consumeCost(cost)) {
    return { purchased: false, reason: 'missing-cost', label: upgrade.label };
  }

  progressionState.upgrades[upgrade.id] = nextRank;
  const currentHpRatio = progressionState.playerCombat.maxHp > 0
    ? progressionState.playerCombat.hp / progressionState.playerCombat.maxHp
    : 1;
  const levelFloor = getLevelCombatFloor();
  const upgradeBonus = getUpgradeCombatBonus();
  progressionState.playerCombat.maxHp = levelFloor.maxHp + upgradeBonus.maxHp;
  progressionState.playerCombat.attack = levelFloor.attack + upgradeBonus.attack;
  progressionState.playerCombat.defendReduction = levelFloor.defendReduction + upgradeBonus.defendReduction;
  progressionState.playerCombat.hp = Math.max(1, Math.round(progressionState.playerCombat.maxHp * currentHpRatio));
  saveProgressionState();
  return {
    purchased: true,
    label: upgrade.label,
    rank: nextRank,
    stat: upgrade.stat,
  };
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
