import type {
  ActiveCharacterState,
  FriendRosterResponse,
  FriendshipRewardResult,
  FriendshipUpdate,
  NpcProgressionRecord,
  RewardPoolEntry,
} from "../types.js";
import {
  loadFriendshipState,
  loadQuestRecords,
  saveFriendshipState,
} from "./store.js";

const FRIENDSHIP_COMPLETION_TARGET = 3;

interface NpcConfig {
  id: string;
  characterName: string;
  displayName: string;
  archetype: string;
  questSetId: string;
  homePlacementId: string;
  rewardPool: RewardPoolEntry[];
  unlocksNpcId: string | null;
}

const NPC_CONFIGS: NpcConfig[] = [
  {
    id: "girl-1-east",
    characterName: "parasite",
    displayName: "Ember Voss",
    archetype: "parasite",
    questSetId: "starter-field-quests",
    homePlacementId: "town-square-east",
    rewardPool: [
      { itemId: "parasite-needle", quantity: 1, grantMode: "guaranteed" },
      { itemId: "sun-coins", quantity: 16, grantMode: "guaranteed" },
      { itemId: "echo-thread", quantity: 1, grantMode: "guaranteed" },
      { itemId: "whisper-nail", quantity: 1, grantMode: "chance", chance: 0.4 },
      { itemId: "dusk-lace", quantity: 1, grantMode: "chance", chance: 0.2 },
    ],
    unlocksNpcId: "mirror-1-north",
  },
  {
    id: "mirror-1-north",
    characterName: "mirror",
    displayName: "Lyra Mirror",
    archetype: "mirror",
    questSetId: "mirror-grove-quests",
    homePlacementId: "town-square-west",
    rewardPool: [
      { itemId: "mirror-sigil", quantity: 1, grantMode: "guaranteed" },
      { itemId: "rift-spindle", quantity: 1, grantMode: "guaranteed" },
      { itemId: "crystal-shard", quantity: 2, grantMode: "guaranteed" },
      { itemId: "pact-ink", quantity: 1, grantMode: "chance", chance: 0.35 },
      { itemId: "violet-lens", quantity: 1, grantMode: "chance", chance: 0.22 },
    ],
    unlocksNpcId: "enabler-1-west",
  },
  {
    id: "enabler-1-west",
    characterName: "enabler",
    displayName: "Marcus Vale",
    archetype: "enabler",
    questSetId: "enabler-workshop-quests",
    homePlacementId: "town-square-north",
    rewardPool: [
      { itemId: "enabling-ribbon", quantity: 1, grantMode: "guaranteed" },
      { itemId: "hearth-badge", quantity: 1, grantMode: "guaranteed" },
      { itemId: "echo-thread", quantity: 2, grantMode: "guaranteed" },
      { itemId: "sun-coins", quantity: 20, grantMode: "guaranteed" },
      { itemId: "tempered-bloom", quantity: 1, grantMode: "chance", chance: 0.35 },
    ],
    unlocksNpcId: "honest-1-south",
  },
  {
    id: "honest-1-south",
    characterName: "honest",
    displayName: "Iona Reed",
    archetype: "honest",
    questSetId: "honest-crossroads-quests",
    homePlacementId: "town-square-west",
    rewardPool: [
      { itemId: "honest-whetstone", quantity: 1, grantMode: "guaranteed" },
      { itemId: "iron-ore", quantity: 1, grantMode: "guaranteed" },
      { itemId: "steel-button", quantity: 2, grantMode: "guaranteed" },
      { itemId: "ash-glass", quantity: 1, grantMode: "chance", chance: 0.34 },
      { itemId: "moon-pearl", quantity: 1, grantMode: "chance", chance: 0.15 },
    ],
    unlocksNpcId: "opportunist-1-pond",
  },
  {
    id: "opportunist-1-pond",
    characterName: "opportunist",
    displayName: "Kade Flint",
    archetype: "opportunist",
    questSetId: "opportunist-pond-quests",
    homePlacementId: "town-square-east",
    rewardPool: [
      { itemId: "opportunist-token", quantity: 1, grantMode: "guaranteed" },
      { itemId: "sun-coins", quantity: 24, grantMode: "guaranteed" },
      { itemId: "cracked-fang", quantity: 2, grantMode: "guaranteed" },
      { itemId: "bone-charm", quantity: 1, grantMode: "chance", chance: 0.35 },
      { itemId: "pact-ink", quantity: 1, grantMode: "chance", chance: 0.28 },
    ],
    unlocksNpcId: null,
  },
];

const LEGACY_NPC_ID_ALIASES: Record<string, string> = {
  enabler: "enabler-1-west",
};

function findNpcById(npcId: string | undefined | null): NpcConfig | null {
  if (!npcId) return null;
  const resolvedId = LEGACY_NPC_ID_ALIASES[npcId] ?? npcId;
  return NPC_CONFIGS.find((npc) => npc.id === resolvedId) ?? null;
}

function findNpcByCharacter(characterName: string): NpcConfig | null {
  const normalized = characterName.trim().toLowerCase();
  if (normalized === "general") {
    return NPC_CONFIGS[0];
  }
  return NPC_CONFIGS.find((npc) => npc.characterName === normalized || npc.archetype === normalized) ?? null;
}

function ensureProgressionRecord(config: NpcConfig, existing?: NpcProgressionRecord): NpcProgressionRecord {
  return {
    npcId: config.id,
    characterName: config.characterName,
    displayName: config.displayName,
    archetype: config.archetype,
    questCompletionCount: existing?.questCompletionCount ?? 0,
    friendshipState: existing?.friendshipState ?? "locked",
    friendshipUnlockedAt: existing?.friendshipUnlockedAt ?? null,
    friendshipRewardGranted: existing?.friendshipRewardGranted ?? false,
    activeQuestSetId: config.questSetId,
    homePlacementId: existing?.homePlacementId ?? config.homePlacementId,
    friendSummaryId: existing?.friendSummaryId ?? null,
  };
}

function rollRewardPool(pool: RewardPoolEntry[]): FriendshipRewardResult[] {
  return pool.map((reward) => ({
    itemId: reward.itemId,
    quantity: reward.quantity,
    granted: reward.grantMode === "guaranteed" || Math.random() <= (reward.chance ?? 0),
  }));
}

function summarizeRewards(results: FriendshipRewardResult[]): string {
  const granted = results.filter((reward) => reward.granted);
  return granted.length > 0
    ? granted.map((reward) => `+${reward.quantity} ${reward.itemId}`).join(", ")
    : "No bonus rewards";
}

export async function recordNpcQuestCompletion(input: {
  characterName: string;
  questId: string;
  outcome: string;
  npcId?: string;
}): Promise<{ friendshipEligible: boolean; record: NpcProgressionRecord | null }> {
  const config = findNpcById(input.npcId) ?? findNpcByCharacter(input.characterName);
  if (!config || input.outcome !== "success") {
    return { friendshipEligible: false, record: null };
  }

  const state = await loadFriendshipState();
  const record = ensureProgressionRecord(config, state.npcProgressions[config.id]);
  if (record.friendshipState !== "unlocked") {
    record.questCompletionCount += 1;
    if (record.questCompletionCount >= FRIENDSHIP_COMPLETION_TARGET) {
      record.friendshipState = "eligible";
    }
  }

  state.npcProgressions[config.id] = record;
  if (!state.activeCharacter.unlockedNpcIds.includes(config.id)) {
    state.activeCharacter.unlockedNpcIds.push(config.id);
  }
  await saveFriendshipState(state);

  return {
    friendshipEligible: record.friendshipState === "eligible",
    record,
  };
}

export async function unlockNpcFriendship(characterName: string): Promise<FriendshipUpdate | null> {
  const config = findNpcByCharacter(characterName);
  if (!config) return null;

  const state = await loadFriendshipState();
  const record = ensureProgressionRecord(config, state.npcProgressions[config.id]);
  if (record.friendshipState !== "eligible" || record.friendshipRewardGranted) {
    state.npcProgressions[config.id] = record;
    await saveFriendshipState(state);
    return null;
  }

  const rewardResults = rollRewardPool(config.rewardPool);
  record.friendshipState = "unlocked";
  record.friendshipUnlockedAt = new Date().toISOString();
  record.friendshipRewardGranted = true;
  state.npcProgressions[config.id] = record;

  if (!state.activeCharacter.completedNpcIds.includes(config.id)) {
    state.activeCharacter.completedNpcIds.push(config.id);
  }
  if (!state.activeCharacter.unlockedNpcIds.includes(config.id)) {
    state.activeCharacter.unlockedNpcIds.push(config.id);
  }

  const newlyUnlockedNpcId = config.unlocksNpcId;
  if (newlyUnlockedNpcId && !state.activeCharacter.unlockedNpcIds.includes(newlyUnlockedNpcId)) {
    state.activeCharacter.unlockedNpcIds.push(newlyUnlockedNpcId);
    state.activeCharacter.pendingUnlockNpcId = newlyUnlockedNpcId;
    state.activeCharacter.activeNpcId = newlyUnlockedNpcId;
  } else {
    state.activeCharacter.pendingUnlockNpcId = null;
    state.activeCharacter.activeNpcId = config.id;
  }
  state.activeCharacter.lastAdvancedAt = new Date().toISOString();

  await saveFriendshipState(state);

  return {
    npcId: config.id,
    displayName: config.displayName,
    friendshipState: "unlocked",
    rewardResults,
    rewardSummaryText: summarizeRewards(rewardResults),
    newlyUnlockedNpcId,
    friendSummaryPending: true,
  };
}

export async function getActiveCharacterState(): Promise<ActiveCharacterState> {
  const state = await loadFriendshipState();
  return state.activeCharacter;
}

export async function listFriendRoster(): Promise<FriendRosterResponse> {
  const state = await loadFriendshipState();
  const friends = Object.values(state.friendSummaries)
    .filter((summary) => summary.friendshipState === "unlocked")
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

  return {
    friends,
    activeCount: friends.length,
    generatedAt: new Date().toISOString(),
  };
}

export async function refreshFriendSummary(npcId: string): Promise<{ applied: boolean }> {
  const state = await loadFriendshipState();
  const config = findNpcById(npcId);
  const record = config ? ensureProgressionRecord(config, state.npcProgressions[npcId]) : null;
  if (!config || !record || record.friendshipState !== "unlocked") {
    return { applied: false };
  }

  const questRecords = await loadQuestRecords();
  const highlights = questRecords
    .filter((quest) => quest.character === config.characterName || quest.character === "general")
    .filter((quest) => quest.status === "completed")
    .slice(-3)
    .map((quest) => quest.title || quest.questId);
  const now = new Date().toISOString();
  const summaryId = record.friendSummaryId ?? `${npcId}-summary`;

  state.friendSummaries[npcId] = {
    summaryId,
    npcId,
    displayName: config.displayName,
    archetype: config.archetype,
    friendshipState: "unlocked",
    summaryText: `${config.displayName} is now a reliable ${config.archetype} contact for dungeon rewards and upgrade materials.`,
    questHighlights: highlights,
    lastConversationAt: now,
    updatedAt: now,
  };
  record.friendSummaryId = summaryId;
  state.npcProgressions[npcId] = record;
  await saveFriendshipState(state);
  return { applied: true };
}

export async function markPendingUnlockDiscovered(_npcId: string): Promise<void> {
  const state = await loadFriendshipState();
  state.activeCharacter.pendingUnlockNpcId = null;
  await saveFriendshipState(state);
}
