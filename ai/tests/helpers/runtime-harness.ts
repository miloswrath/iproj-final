import fs from "fs/promises";
import path from "path";
import {
  MEMORY_DIR,
  defaultPlayerProfile,
  defaultPlayerSummary,
  writeJsonAtomic,
} from "../../src/memory/store.js";

const PENDING_PATH = path.join(MEMORY_DIR, "pending-notifications.json");
const PROCESSED_PATH = path.join(MEMORY_DIR, "processed-completions.json");
const PLAYER_PROFILE_PATH = path.join(MEMORY_DIR, "player-profile.json");
const PLAYER_SUMMARY_PATH = path.join(MEMORY_DIR, "player-summary.json");
const CHARACTERS_DIR = path.join(MEMORY_DIR, "characters");

async function backupFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function restoreFile(filePath: string, original: string | null): Promise<void> {
  if (original === null) {
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore
    }
    return;
  }
  await fs.writeFile(filePath, original, "utf8");
}

export async function withMemoryIsolation<T>(fn: () => Promise<T>): Promise<T> {
  const characterFiles = await (async () => {
    try {
      return await fs.readdir(CHARACTERS_DIR);
    } catch {
      return [] as string[];
    }
  })();

  const characterSnapshots = await Promise.all(
    characterFiles.map(async (file) => ({
      file,
      content: await backupFile(path.join(CHARACTERS_DIR, file)),
    }))
  );

  const [pendingBefore, processedBefore, profileBefore, summaryBefore] = await Promise.all([
    backupFile(PENDING_PATH),
    backupFile(PROCESSED_PATH),
    backupFile(PLAYER_PROFILE_PATH),
    backupFile(PLAYER_SUMMARY_PATH),
  ]);

  await fs.mkdir(CHARACTERS_DIR, { recursive: true });
  await fs.writeFile(PENDING_PATH, "[]", "utf8");
  await fs.writeFile(PROCESSED_PATH, "[]", "utf8");
  await writeJsonAtomic(PLAYER_PROFILE_PATH, defaultPlayerProfile());
  await writeJsonAtomic(PLAYER_SUMMARY_PATH, defaultPlayerSummary());

  try {
    return await fn();
  } finally {
    await Promise.all([
      restoreFile(PENDING_PATH, pendingBefore),
      restoreFile(PROCESSED_PATH, processedBefore),
      restoreFile(PLAYER_PROFILE_PATH, profileBefore),
      restoreFile(PLAYER_SUMMARY_PATH, summaryBefore),
    ]);

    // Remove any test-created character files and restore prior snapshots
    const afterFiles = await fs.readdir(CHARACTERS_DIR).catch(() => [] as string[]);
    for (const file of afterFiles) {
      if (!characterFiles.includes(file)) {
        await fs.unlink(path.join(CHARACTERS_DIR, file)).catch(() => undefined);
      }
    }

    await Promise.all(
      characterSnapshots.map(({ file, content }) =>
        restoreFile(path.join(CHARACTERS_DIR, file), content)
      )
    );
  }
}

export async function withMockedFetch<T>(
  impl: typeof globalThis.fetch,
  fn: () => Promise<T>
): Promise<T> {
  const previous = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    return await fn();
  } finally {
    globalThis.fetch = previous;
  }
}
