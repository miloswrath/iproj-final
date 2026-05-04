import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type {
  CharacterMemory,
  FriendshipStateStore,
  FriendSummary,
  NpcProgressionRecord,
  PlayerProfile,
  PlayerSummary,
  QuestRecord,
} from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MEMORY_DIR = path.resolve(__dirname, "../../memory");
const CHARACTERS_DIR = path.join(MEMORY_DIR, "characters");
const PROCESSED_COMPLETIONS_PATH = path.join(MEMORY_DIR, "processed-completions.json");
export const QUESTS_PATH = path.join(MEMORY_DIR, "quests.json");
export const FRIENDSHIP_STATE_PATH = path.join(MEMORY_DIR, "friendship-state.json");

export async function ensureMemoryDirs(): Promise<void> {
  await fs.mkdir(CHARACTERS_DIR, { recursive: true });
}

export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const tmp = `${filePath}.tmp`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

export function defaultPlayerProfile(): PlayerProfile {
  return {
    isolation: 50,
    hope: 50,
    burnout: 30,
    globalCharacterLevel: 1,
    traits: {
      trustsQuickly: 0.5,
      seeksValidation: 0.5,
      skepticism: 0.5,
      riskTolerance: 0.5,
    },
  };
}

function normalizeGlobalCharacterLevel(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    return 1;
  }

  return value;
}

export function normalizePlayerProfile(profile: Partial<PlayerProfile> | null | undefined): PlayerProfile {
  const defaults = defaultPlayerProfile();

  return {
    isolation: typeof profile?.isolation === "number" ? profile.isolation : defaults.isolation,
    hope: typeof profile?.hope === "number" ? profile.hope : defaults.hope,
    burnout: typeof profile?.burnout === "number" ? profile.burnout : defaults.burnout,
    globalCharacterLevel: normalizeGlobalCharacterLevel(profile?.globalCharacterLevel),
    traits: {
      trustsQuickly:
        typeof profile?.traits?.trustsQuickly === "number"
          ? profile.traits.trustsQuickly
          : defaults.traits.trustsQuickly,
      seeksValidation:
        typeof profile?.traits?.seeksValidation === "number"
          ? profile.traits.seeksValidation
          : defaults.traits.seeksValidation,
      skepticism:
        typeof profile?.traits?.skepticism === "number"
          ? profile.traits.skepticism
          : defaults.traits.skepticism,
      riskTolerance:
        typeof profile?.traits?.riskTolerance === "number"
          ? profile.traits.riskTolerance
          : defaults.traits.riskTolerance,
    },
  };
}

export function defaultPlayerSummary(): PlayerSummary {
  return {
    playerGlobal: "No prior interactions recorded.",
    recentArc: "This is the first session.",
  };
}

const ARCHETYPE_MAP: Record<string, CharacterMemory["archetype"]> = {
  enabler: "enabler",
  opportunist: "opportunist",
  honest: "honest_one",
  parasite: "parasite",
  mirror: "mirror",
};

function inferArchetype(characterName: string): CharacterMemory["archetype"] {
  return ARCHETYPE_MAP[characterName.toLowerCase()] ?? "enabler";
}

export function defaultCharacterMemory(
  archetype: CharacterMemory["archetype"] = "enabler"
): CharacterMemory {
  return {
    archetype,
    progression: { questLevel: 1 },
    relationship: {
      bond: 30,
      trust: 30,
      wariness: 20,
      dependency: 20,
      instrumentalInterest: 40,
    },
    flags: {
      playerNoticedRewardMismatch: false,
      recentFailure: false,
      recentSuccess: false,
    },
    promptSummary: {
      npcView: "Unknown — no prior interaction.",
      currentTactic: "Establish initial rapport.",
      tension: "None yet.",
    },
    friendship: {
      npcId: null,
      state: "locked",
      unlockedAt: null,
    },
    keyMemories: [],
    lastTerminationReason: null,
  };
}

export function defaultFriendshipState(): FriendshipStateStore {
  return {
    activeCharacter: {
      activeNpcId: "girl-1-east",
      starterNpcId: "girl-1-east",
      unlockedNpcIds: ["girl-1-east"],
      completedNpcIds: [],
      pendingUnlockNpcId: null,
      lastAdvancedAt: null,
    },
    npcProgressions: {},
    friendSummaries: {},
  };
}

function normalizeNpcProgressionRecord(record: Partial<NpcProgressionRecord> | undefined, npcId: string): NpcProgressionRecord | null {
  if (!record || typeof record.characterName !== "string" || typeof record.displayName !== "string" || typeof record.archetype !== "string") {
    return null;
  }

  return {
    npcId,
    characterName: record.characterName,
    displayName: record.displayName,
    archetype: record.archetype,
    questCompletionCount:
      typeof record.questCompletionCount === "number" && Number.isFinite(record.questCompletionCount)
        ? Math.max(0, Math.floor(record.questCompletionCount))
        : 0,
    friendshipState:
      record.friendshipState === "eligible" || record.friendshipState === "unlocked"
        ? record.friendshipState
        : "locked",
    friendshipUnlockedAt:
      typeof record.friendshipUnlockedAt === "string" && record.friendshipUnlockedAt.length > 0
        ? record.friendshipUnlockedAt
        : null,
    friendshipRewardGranted: record.friendshipRewardGranted === true,
    activeQuestSetId: typeof record.activeQuestSetId === "string" ? record.activeQuestSetId : `${npcId}-quests`,
    homePlacementId: typeof record.homePlacementId === "string" ? record.homePlacementId : `${npcId}-home`,
    friendSummaryId: typeof record.friendSummaryId === "string" && record.friendSummaryId.length > 0 ? record.friendSummaryId : null,
  };
}

function normalizeFriendSummary(summary: Partial<FriendSummary> | undefined): FriendSummary | null {
  if (!summary || typeof summary.summaryId !== "string" || typeof summary.npcId !== "string" || typeof summary.displayName !== "string" || typeof summary.archetype !== "string" || typeof summary.summaryText !== "string") {
    return null;
  }

  return {
    summaryId: summary.summaryId,
    npcId: summary.npcId,
    displayName: summary.displayName,
    archetype: summary.archetype,
    friendshipState: "unlocked",
    summaryText: summary.summaryText || `${summary.displayName} trusts the player.`,
    questHighlights: Array.isArray(summary.questHighlights) ? summary.questHighlights.filter((value): value is string => typeof value === "string") : [],
    lastConversationAt: typeof summary.lastConversationAt === "string" ? summary.lastConversationAt : new Date(0).toISOString(),
    updatedAt: typeof summary.updatedAt === "string" ? summary.updatedAt : new Date(0).toISOString(),
  };
}

function normalizeFriendshipState(raw: Partial<FriendshipStateStore> | null | undefined): FriendshipStateStore {
  const defaults = defaultFriendshipState();
  const npcProgressions: Record<string, NpcProgressionRecord> = {};
  const friendSummaries: Record<string, FriendSummary> = {};

  for (const [npcId, record] of Object.entries(raw?.npcProgressions ?? {})) {
    const normalized = normalizeNpcProgressionRecord(record, npcId);
    if (normalized) {
      npcProgressions[npcId] = normalized;
    }
  }

  for (const [npcId, summary] of Object.entries(raw?.friendSummaries ?? {})) {
    const normalized = normalizeFriendSummary(summary);
    if (normalized) {
      friendSummaries[npcId] = normalized;
    }
  }

  const active = raw?.activeCharacter;

  return {
    activeCharacter: {
      activeNpcId: typeof active?.activeNpcId === "string" && active.activeNpcId.length > 0 ? active.activeNpcId : defaults.activeCharacter.activeNpcId,
      starterNpcId: typeof active?.starterNpcId === "string" && active.starterNpcId.length > 0 ? active.starterNpcId : defaults.activeCharacter.starterNpcId,
      unlockedNpcIds: Array.isArray(active?.unlockedNpcIds) ? active.unlockedNpcIds.filter((value): value is string => typeof value === "string") : defaults.activeCharacter.unlockedNpcIds,
      completedNpcIds: Array.isArray(active?.completedNpcIds) ? active.completedNpcIds.filter((value): value is string => typeof value === "string") : [],
      pendingUnlockNpcId: typeof active?.pendingUnlockNpcId === "string" && active.pendingUnlockNpcId.length > 0 ? active.pendingUnlockNpcId : null,
      lastAdvancedAt: typeof active?.lastAdvancedAt === "string" ? active.lastAdvancedAt : null,
    },
    npcProgressions,
    friendSummaries,
  };
}

export async function loadFriendshipState(): Promise<FriendshipStateStore> {
  const stored = await readJson<FriendshipStateStore>(FRIENDSHIP_STATE_PATH);
  return normalizeFriendshipState(stored);
}

export async function saveFriendshipState(state: FriendshipStateStore): Promise<void> {
  await writeJsonAtomic(FRIENDSHIP_STATE_PATH, state);
}

export async function loadAllMemory(characterName: string): Promise<{
  playerProfile: PlayerProfile;
  playerSummary: PlayerSummary;
  characterMemory: CharacterMemory;
}> {
  const [playerProfile, playerSummary, characterMemory] = await Promise.all([
    readJson<PlayerProfile>(path.join(MEMORY_DIR, "player-profile.json")),
    readJson<PlayerSummary>(path.join(MEMORY_DIR, "player-summary.json")),
    readJson<CharacterMemory>(
      path.join(CHARACTERS_DIR, `${characterName}.json`)
    ),
  ]);

  return {
    playerProfile: normalizePlayerProfile(playerProfile),
    playerSummary: playerSummary ?? defaultPlayerSummary(),
    characterMemory: characterMemory ?? defaultCharacterMemory(inferArchetype(characterName)),
  };
}

export async function persistMemory(
  characterName: string,
  characterMemory: CharacterMemory,
  playerProfile: PlayerProfile,
  playerSummary: PlayerSummary
): Promise<void> {
  await Promise.all([
    writeJsonAtomic(
      path.join(CHARACTERS_DIR, `${characterName}.json`),
      characterMemory
    ),
    writeJsonAtomic(path.join(MEMORY_DIR, "player-profile.json"), playerProfile),
    writeJsonAtomic(path.join(MEMORY_DIR, "player-summary.json"), playerSummary),
  ]);
}

export function characterMemoryPath(characterName: string): string {
  return path.join(CHARACTERS_DIR, `${characterName}.json`);
}

export async function getFileTimestamp(filePath: string): Promise<string> {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtime.toISOString();
  } catch {
    return "not found";
  }
}

export function completionEventKey(input: {
  character: string;
  questId: string;
  outcome: string;
  eventTimestamp?: string;
}): string {
  return [
    input.character.trim().toLowerCase(),
    input.questId.trim().toLowerCase(),
    input.outcome,
    input.eventTimestamp ?? "none",
  ].join("::");
}

export async function wasCompletionProcessed(eventKey: string): Promise<boolean> {
  const processed = (await readJson<string[]>(PROCESSED_COMPLETIONS_PATH)) ?? [];
  return processed.includes(eventKey);
}

export async function markCompletionProcessed(eventKey: string): Promise<void> {
  const processed = (await readJson<string[]>(PROCESSED_COMPLETIONS_PATH)) ?? [];
  if (!processed.includes(eventKey)) {
    processed.push(eventKey);
    await writeJsonAtomic(PROCESSED_COMPLETIONS_PATH, processed);
  }
}

// ─── Quest Record Persistence ─────────────────────────────────────────────────

export async function loadQuestRecords(): Promise<QuestRecord[]> {
  return (await readJson<QuestRecord[]>(QUESTS_PATH)) ?? [];
}

export async function saveQuestRecord(record: QuestRecord): Promise<void> {
  const records = await loadQuestRecords();
  const idx = records.findIndex((r) => r.questId === record.questId);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  await writeJsonAtomic(QUESTS_PATH, records);
}

export async function findQuestRecord(questId: string): Promise<QuestRecord | null> {
  const records = await loadQuestRecords();
  return records.find((r) => r.questId === questId) ?? null;
}

export async function findActiveQuest(): Promise<QuestRecord | null> {
  const records = await loadQuestRecords();
  return records.find((r) => r.status === "active") ?? null;
}

export async function getAllQuestTitles(): Promise<Set<string>> {
  const records = await loadQuestRecords();
  return new Set(records.map((r) => r.title.toLowerCase()));
}

export async function getCompletedQuestIds(characterName: string, limit = 5): Promise<string[]> {
  const records = await loadQuestRecords();
  return records
    .filter((r) => r.character === characterName && (r.status === "completed" || r.status === "failed" || r.status === "abandoned"))
    .sort((a, b) => (b.completedAt ?? b.acceptedAt).localeCompare(a.completedAt ?? a.acceptedAt))
    .slice(0, limit)
    .map((r) => r.questId);
}
