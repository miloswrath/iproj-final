import type { PlayerProfile, PlayerSummary, Session } from "../types.js";

export interface ConversationSession {
  sessionId: string;
  session: Session;
  playerProfile: PlayerProfile;
  playerSummary: PlayerSummary;
  createdAt: Date;
  lastActivityAt: Date;
  terminated: boolean;
}

const DEFAULT_TTL_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

const sessions = new Map<string, ConversationSession>();
let sweeperHandle: NodeJS.Timeout | null = null;

function ttlMs(): number {
  const raw = process.env["SESSION_TTL_MS"];
  if (!raw) return DEFAULT_TTL_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_MS;
}

function ensureSweeper(): void {
  if (sweeperHandle) return;
  sweeperHandle = setInterval(() => {
    const cutoff = Date.now() - ttlMs();
    for (const [id, entry] of sessions) {
      if (entry.lastActivityAt.getTime() < cutoff) {
        sessions.delete(id);
      }
    }
  }, SWEEP_INTERVAL_MS);
  // Don't keep the process alive for the sweeper.
  if (typeof sweeperHandle.unref === "function") sweeperHandle.unref();
}

export function create(
  sessionId: string,
  session: Session,
  playerProfile: PlayerProfile,
  playerSummary: PlayerSummary
): ConversationSession {
  ensureSweeper();
  const now = new Date();
  const entry: ConversationSession = {
    sessionId,
    session,
    playerProfile,
    playerSummary,
    createdAt: now,
    lastActivityAt: now,
    terminated: false,
  };
  sessions.set(sessionId, entry);
  return entry;
}

export function get(sessionId: string): ConversationSession | undefined {
  return sessions.get(sessionId);
}

export function touch(sessionId: string): void {
  const entry = sessions.get(sessionId);
  if (entry) entry.lastActivityAt = new Date();
}

export function remove(sessionId: string): void {
  sessions.delete(sessionId);
}

export function size(): number {
  return sessions.size;
}

export function _resetForTests(): void {
  sessions.clear();
  if (sweeperHandle) {
    clearInterval(sweeperHandle);
    sweeperHandle = null;
  }
}
