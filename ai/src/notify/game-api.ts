import { readJson, writeJsonAtomic, MEMORY_DIR } from "../memory/store.js";
import path from "path";

const PENDING_PATH = path.join(MEMORY_DIR, "pending-notifications.json");

export interface QuestStartPayload {
  character: string;
  questId: string;
  playerState: { level: number };
  relationshipSnapshot: {
    trust: number;
    dependency: number;
    bond: number;
    wariness: number;
  };
  terminationReason: string;
}

async function savePendingNotification(payload: QuestStartPayload): Promise<void> {
  const existing = (await readJson<QuestStartPayload[]>(PENDING_PATH)) ?? [];
  existing.push(payload);
  await writeJsonAtomic(PENDING_PATH, existing);
}

export async function notifyQuestStart(payload: QuestStartPayload): Promise<void> {
  const apiUrl = process.env["GAME_API_URL"] ?? "http://localhost:3000/quest/start";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.status >= 400 && response.status < 500) {
      console.error(`[notify] Quest start rejected by game API (${response.status}) — payload dropped.`);
      return;
    }

    if (response.status >= 500) {
      console.error(`[notify] Game API server error (${response.status}) — saving for retry.`);
      await savePendingNotification(payload);
    }
  } catch {
    // Network error — save for retry on next session start
    await savePendingNotification(payload);
  }
}

export async function retrySavedNotifications(): Promise<void> {
  const pending = await readJson<QuestStartPayload[]>(PENDING_PATH);
  if (!pending || pending.length === 0) return;

  const apiUrl = process.env["GAME_API_URL"] ?? "http://localhost:3000/quest/start";
  const stillPending: QuestStartPayload[] = [];

  for (const payload of pending) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status >= 500 || !response.ok && response.status !== 400 && response.status !== 404) {
        stillPending.push(payload);
      }
    } catch {
      stillPending.push(payload);
    }
  }

  if (stillPending.length < pending.length) {
    if (stillPending.length === 0) {
      // All retried — remove the file by writing empty array
      await writeJsonAtomic(PENDING_PATH, []);
    } else {
      await writeJsonAtomic(PENDING_PATH, stillPending);
    }
  }
}
