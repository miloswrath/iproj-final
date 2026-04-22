import { readJson, writeJsonAtomic, MEMORY_DIR } from "../memory/store.js";
import path from "path";
import type {
  PendingNotificationRecord,
  QuestCompletionPayload,
  QuestStartPayload,
} from "../types.js";

const PENDING_PATH = path.join(MEMORY_DIR, "pending-notifications.json");

interface RequestResult {
  retryable: boolean;
  ok: boolean;
}

async function postNotification(
  url: string,
  payload: QuestStartPayload | QuestCompletionPayload
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.status >= 400 && response.status < 500) {
      return { ok: false, retryable: false };
    }

    if (response.status >= 500) {
      return { ok: false, retryable: true };
    }

    return { ok: true, retryable: false };
  } catch {
    return { ok: false, retryable: true };
  }
}

function notificationUrl(type: PendingNotificationRecord["type"]): string {
  if (type === "quest_complete") {
    return process.env["GAME_API_URL_COMPLETE"] ?? "http://localhost:3000/quest/complete";
  }

  return process.env["GAME_API_URL"] ?? "http://localhost:3000/quest/start";
}

function toRecord(
  type: PendingNotificationRecord["type"],
  payload: QuestStartPayload | QuestCompletionPayload,
  previous?: PendingNotificationRecord
): PendingNotificationRecord {
  return {
    type,
    payload,
    attemptCount: (previous?.attemptCount ?? 0) + 1,
    lastAttemptAt: new Date().toISOString(),
  };
}

async function readPendingNotifications(): Promise<PendingNotificationRecord[]> {
  const raw = await readJson<Array<PendingNotificationRecord | QuestStartPayload>>(PENDING_PATH);
  if (!raw) return [];

  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return [];
    }

    if ("type" in entry && "payload" in entry) {
      return [entry as PendingNotificationRecord];
    }

    // Backward-compatible migration path for legacy quest_start payloads
    return [
      {
        type: "quest_start",
        payload: entry as QuestStartPayload,
        attemptCount: 0,
      } satisfies PendingNotificationRecord,
    ];
  });
}

async function savePendingNotification(record: PendingNotificationRecord): Promise<void> {
  const existing = await readPendingNotifications();
  existing.push(record);
  await writeJsonAtomic(PENDING_PATH, existing);
}

export async function notifyQuestStart(payload: QuestStartPayload): Promise<void> {
  const result = await postNotification(notificationUrl("quest_start"), payload);

  if (result.ok) return;

  if (!result.retryable) {
    console.error("[notify] Quest start rejected by game API (4xx) — payload dropped.");
    return;
  }

  await savePendingNotification(toRecord("quest_start", payload));
}

export async function notifyQuestComplete(payload: QuestCompletionPayload): Promise<void> {
  const result = await postNotification(notificationUrl("quest_complete"), payload);

  if (result.ok) return;

  if (!result.retryable) {
    console.error("[notify] Quest complete rejected by game API (4xx) — payload dropped.");
    return;
  }

  await savePendingNotification(toRecord("quest_complete", payload));
}

export async function retrySavedNotifications(): Promise<void> {
  const pending = await readPendingNotifications();
  if (pending.length === 0) return;

  const stillPending: PendingNotificationRecord[] = [];

  for (const record of pending) {
    const result = await postNotification(notificationUrl(record.type), record.payload);

    if (!result.ok && result.retryable) {
      stillPending.push(toRecord(record.type, record.payload, record));
    }
  }

  await writeJsonAtomic(PENDING_PATH, stillPending);
}
