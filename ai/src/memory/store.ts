import { promises as fs } from "fs";
import path from "path";
import type { CharacterMemory, PlayerProfile, PlayerSummary } from "../types.js";

export const MEMORY_DIR = path.resolve(process.cwd(), "memory");
const CHAR_DIR = path.join(MEMORY_DIR, "characters");
const PLAYER_PROFILE_PATH = path.join(MEMORY_DIR, "player-profile.json");
const PLAYER_SUMMARY_PATH = path.join(MEMORY_DIR, "player-summary.json");

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function defaultPlayerProfile(): PlayerProfile {
  return {
    isolation: 50,
    hope: 50,
    burnout: 50,
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
    playerGlobal: "Player behavior is still being learned.",
    recentArc: "No major interaction arc recorded yet.",
  };
}

function inferArchetype(name: string): CharacterMemory["archetype"] {
  const lower = name.toLowerCase();
  if (lower.includes("enabler")) return "enabler";
  if (lower.includes("opportunist")) return "opportunist";
  if (lower.includes("parasite")) return "parasite";
  if (lower.includes("mirror")) return "mirror";
  return "honest_one";
}

export function defaultCharacterMemory(name = "general"): CharacterMemory {
  return {
    archetype: inferArchetype(name),
    progression: { questLevel: 1 },
    relationship: {
      bond: 50,
      trust: 50,
      wariness: 50,
      dependency: 50,
      instrumentalInterest: 50,
    },
    flags: {
      playerNoticedRewardMismatch: false,
      recentFailure: false,
      recentSuccess: false,
    },
    promptSummary: {
      npcView: "No strong opinion yet.",
      currentTactic: "Start neutral and assess player intent.",
      tension: "No active tension.",
    },
    keyMemories: [],
    lastTerminationReason: null,
  };
}

export async function ensureMemoryDirs(): Promise<void> {
  await fs.mkdir(CHAR_DIR, { recursive: true });
}

export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tempPath, filePath);
}

export async function loadAllMemory(characterName: string): Promise<{
  playerProfile: PlayerProfile;
  playerSummary: PlayerSummary;
  characterMemory: CharacterMemory;
}> {
  await ensureMemoryDirs();

  const playerProfile = (await readJson<PlayerProfile>(PLAYER_PROFILE_PATH)) ?? defaultPlayerProfile();
  const playerSummary = (await readJson<PlayerSummary>(PLAYER_SUMMARY_PATH)) ?? defaultPlayerSummary();
  const charPath = path.join(CHAR_DIR, `${characterName}.json`);
  const characterMemory = (await readJson<CharacterMemory>(charPath)) ?? defaultCharacterMemory(characterName);

  return { playerProfile, playerSummary, characterMemory };
}

export async function persistMemory(
  characterName: string,
  characterMemory: CharacterMemory,
  playerProfile: PlayerProfile,
  playerSummary: PlayerSummary
): Promise<void> {
  const clamped = {
    ...characterMemory,
    relationship: {
      bond: clamp(characterMemory.relationship.bond, 0, 100),
      trust: clamp(characterMemory.relationship.trust, 0, 100),
      wariness: clamp(characterMemory.relationship.wariness, 0, 100),
      dependency: clamp(characterMemory.relationship.dependency, 0, 100),
      instrumentalInterest: clamp(characterMemory.relationship.instrumentalInterest, 0, 100),
    },
    keyMemories: characterMemory.keyMemories.slice(0, 5),
  };

  await writeJsonAtomic(PLAYER_PROFILE_PATH, playerProfile);
  await writeJsonAtomic(PLAYER_SUMMARY_PATH, playerSummary);
  await writeJsonAtomic(path.join(CHAR_DIR, `${characterName}.json`), clamped);
}

export async function getFileTimestamp(filePath: string): Promise<string> {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtime.toISOString();
  } catch {
    return "missing";
  }
}
