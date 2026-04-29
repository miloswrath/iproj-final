import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type {
  CharacterMemory,
  PlayerProfile,
  PlayerSummary,
  QuestRecord,
} from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MEMORY_DIR = path.resolve(__dirname, "../../memory");
const CHARACTERS_DIR = path.join(MEMORY_DIR, "characters");
const PROCESSED_COMPLETIONS_PATH = path.join(MEMORY_DIR, "processed-completions.json");
const QUESTS_PATH = path.join(MEMORY_DIR, "quests.json");

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
    traits: {
      trustsQuickly: 0.5,
      seeksValidation: 0.5,
      skepticism: 0.5,
      riskTolerance: 0.5,
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
    keyMemories: [],
    lastTerminationReason: null,
  };
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
    playerProfile: playerProfile ?? defaultPlayerProfile(),
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
