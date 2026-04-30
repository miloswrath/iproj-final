import type { Server, IncomingMessage, ServerResponse } from "node:http";
import type { CodexResponse, LoreCodexEntry, QuestRecord } from "../../types.js";
import { loadQuestRecords, findActiveQuest } from "../../memory/store.js";
import { sendJson } from "../http.js";

function recordToEntry(record: QuestRecord): LoreCodexEntry {
  const summaryParts: string[] = [];
  if (record.completionOutcome === "success") summaryParts.push("Quest completed successfully.");
  else if (record.completionOutcome === "failure") summaryParts.push("Quest ended in failure.");
  else if (record.completionOutcome === "abandoned") summaryParts.push("Quest was abandoned.");
  else summaryParts.push("Quest is active.");

  if (record.runSummary) {
    summaryParts.push(
      `${record.runSummary.floorsCleared} floors cleared, ${record.runSummary.totalEnemiesDefeated} enemies defeated, ${record.runSummary.totalChestsOpened} chests opened.`
    );
  }

  return {
    questId: record.questId,
    title: record.title,
    character: record.character,
    status: record.status,
    acceptedAt: record.acceptedAt,
    completedAt: record.completedAt,
    lore: record.lore,
    summary: record.lore ?? summaryParts.join(" "),
  };
}

function sortHistory(records: QuestRecord[]): QuestRecord[] {
  return [...records].sort((a, b) => {
    const aTime = a.completedAt ?? a.acceptedAt;
    const bTime = b.completedAt ?? b.acceptedAt;
    return bTime.localeCompare(aTime);
  });
}

async function handleGetActive(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const active = await findActiveQuest();
  const quest = active ? {
    questId: active.questId,
    title: active.title,
    character: active.character,
    status: active.status,
    acceptedAt: active.acceptedAt,
    lore: active.lore,
  } : null;
  sendJson(res, 200, { quest });
}

async function handleGetHistory(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://internal");
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Math.max(1, parseInt(limitParam ?? "20", 10) || 20), 100);
  const includeActive = url.searchParams.get("includeActive") !== "false";

  const allRecords = await loadQuestRecords();
  const terminal = allRecords.filter((r) =>
    r.status === "completed" || r.status === "failed" || r.status === "abandoned"
  );
  const active = allRecords.find((r) => r.status === "active");

  const sorted = sortHistory(terminal).slice(0, limit);
  const entries: LoreCodexEntry[] = sorted.map(recordToEntry);

  if (includeActive && active) {
    entries.unshift(recordToEntry(active));
  }

  sendJson(res, 200, { entries });
}

async function handleCodexFull(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const allRecords = await loadQuestRecords();
  const activeRecord = allRecords.find((r) => r.status === "active") ?? null;
  const terminal = allRecords.filter((r) =>
    r.status === "completed" || r.status === "failed" || r.status === "abandoned"
  );

  const body: CodexResponse = {
    activeQuest: activeRecord ? recordToEntry(activeRecord) : null,
    history: sortHistory(terminal).map(recordToEntry),
    generatedAt: new Date().toISOString(),
  };
  sendJson(res, 200, body);
}

export function register(server: Server): void {
  server.addRoute("GET", "/api/v1/quests/active", handleGetActive);
  server.addRoute("GET", "/api/v1/quests/history", handleGetHistory);
  server.addRoute("GET", "/api/v1/quests/codex", handleCodexFull);
}
