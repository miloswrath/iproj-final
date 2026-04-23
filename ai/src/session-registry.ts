import type { ConversationPhase, Session } from "./types.js";
import { TERMINATED_TTL_MS } from "./config.js";

interface IdempotencySnapshot {
  requestHash: string;
  response: unknown;
  createdAt: number;
}

interface ActiveRecord {
  conversationId: string;
  playerId: string;
  character: string;
  metadata?: Record<string, unknown>;
  session: Session;
  status: "active";
  lastUpdatedAt: number;
  messageSnapshots: Map<string, IdempotencySnapshot>;
  endSnapshots: Map<string, IdempotencySnapshot>;
}

interface TerminatedRecord {
  conversationId: string;
  character: string;
  phase: "TERMINATION";
  status: "terminated";
  terminationReason: string;
  lastUpdatedAt: number;
  expiresAt: number;
  messageSnapshots: Map<string, IdempotencySnapshot>;
  endSnapshots: Map<string, IdempotencySnapshot>;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

export class ConversationRegistry {
  private active = new Map<string, ActiveRecord>();
  private terminated = new Map<string, TerminatedRecord>();

  pruneExpiredTerminated(now = Date.now()): void {
    for (const [id, record] of this.terminated.entries()) {
      if (record.expiresAt <= now) {
        this.terminated.delete(id);
      }
    }
  }

  hasTerminated(conversationId: string): boolean {
    this.pruneExpiredTerminated();
    return this.terminated.has(conversationId);
  }

  createOrGetActive(params: {
    conversationId: string;
    playerId: string;
    character: string;
    metadata?: Record<string, unknown>;
    session: Session;
  }): { created: boolean; record: ActiveRecord | null } {
    this.pruneExpiredTerminated();

    const existing = this.active.get(params.conversationId);
    if (existing) return { created: false, record: existing };

    if (this.terminated.has(params.conversationId)) {
      return { created: false, record: null };
    }

    const record: ActiveRecord = {
      conversationId: params.conversationId,
      playerId: params.playerId,
      character: params.character,
      metadata: params.metadata,
      session: params.session,
      status: "active",
      lastUpdatedAt: Date.now(),
      messageSnapshots: new Map(),
      endSnapshots: new Map(),
    };

    this.active.set(params.conversationId, record);
    return { created: true, record };
  }

  getActive(conversationId: string): ActiveRecord | undefined {
    this.pruneExpiredTerminated();
    return this.active.get(conversationId);
  }

  getState(conversationId: string):
    | { status: "active"; character: string; phase: ConversationPhase; questOffered: string | null; terminationReason: string | null; lastUpdatedAt: number }
    | { status: "terminated"; character: string; phase: "TERMINATION"; terminationReason: string; lastUpdatedAt: number }
    | null {
    this.pruneExpiredTerminated();
    const active = this.active.get(conversationId);
    if (active) {
      return {
        status: "active",
        character: active.character,
        phase: active.session.conversationState.phase,
        questOffered: active.session.conversationState.questOffered,
        terminationReason: active.session.conversationState.terminationReason,
        lastUpdatedAt: active.lastUpdatedAt,
      };
    }

    const ended = this.terminated.get(conversationId);
    if (!ended) return null;

    return {
      status: "terminated",
      character: ended.character,
      phase: "TERMINATION",
      terminationReason: ended.terminationReason,
      lastUpdatedAt: ended.lastUpdatedAt,
    };
  }

  touch(conversationId: string): void {
    const active = this.active.get(conversationId);
    if (active) active.lastUpdatedAt = Date.now();
  }

  getMessageSnapshot(conversationId: string, idempotencyKey: string, requestBody: unknown): unknown | undefined {
    this.pruneExpiredTerminated();
    const hash = stableStringify(requestBody);

    const active = this.active.get(conversationId);
    const fromActive = active?.messageSnapshots.get(idempotencyKey);
    if (fromActive) {
      if (fromActive.requestHash !== hash) throw new Error("IDEMPOTENCY_MISMATCH");
      return fromActive.response;
    }

    const ended = this.terminated.get(conversationId);
    const fromEnded = ended?.messageSnapshots.get(idempotencyKey);
    if (fromEnded) {
      if (fromEnded.requestHash !== hash) throw new Error("IDEMPOTENCY_MISMATCH");
      return fromEnded.response;
    }

    return undefined;
  }

  saveMessageSnapshot(conversationId: string, idempotencyKey: string, requestBody: unknown, response: unknown): void {
    const active = this.active.get(conversationId);
    if (!active) return;
    active.messageSnapshots.set(idempotencyKey, {
      requestHash: stableStringify(requestBody),
      response,
      createdAt: Date.now(),
    });
  }

  getEndSnapshot(conversationId: string, idempotencyKey: string, requestBody: unknown): unknown | undefined {
    this.pruneExpiredTerminated();
    const hash = stableStringify(requestBody);

    const active = this.active.get(conversationId);
    const fromActive = active?.endSnapshots.get(idempotencyKey);
    if (fromActive) {
      if (fromActive.requestHash !== hash) throw new Error("IDEMPOTENCY_MISMATCH");
      return fromActive.response;
    }

    const ended = this.terminated.get(conversationId);
    const fromEnded = ended?.endSnapshots.get(idempotencyKey);
    if (fromEnded) {
      if (fromEnded.requestHash !== hash) throw new Error("IDEMPOTENCY_MISMATCH");
      return fromEnded.response;
    }

    return undefined;
  }

  saveEndSnapshot(conversationId: string, idempotencyKey: string, requestBody: unknown, response: unknown): void {
    const active = this.active.get(conversationId);
    if (!active) return;
    active.endSnapshots.set(idempotencyKey, {
      requestHash: stableStringify(requestBody),
      response,
      createdAt: Date.now(),
    });
  }

  markTerminated(conversationId: string, terminationReason: string): void {
    const active = this.active.get(conversationId);
    if (!active) return;

    this.active.delete(conversationId);
    this.terminated.set(conversationId, {
      conversationId,
      character: active.character,
      phase: "TERMINATION",
      status: "terminated",
      terminationReason,
      lastUpdatedAt: Date.now(),
      expiresAt: Date.now() + TERMINATED_TTL_MS,
      messageSnapshots: active.messageSnapshots,
      endSnapshots: active.endSnapshots,
    });
  }

  getIdleConversationIds(timeoutMs: number): string[] {
    const now = Date.now();
    return [...this.active.values()]
      .filter((record) => now - record.lastUpdatedAt >= timeoutMs)
      .map((record) => record.conversationId);
  }
}
