export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Character {
  name: string;
  promptPath: string;
  systemPrompt: string;
}

export type HistoryEntry =
  | {
      kind: "message";
      role: "user" | "assistant";
      characterName: string;
      content: string;
      timestamp: Date;
    }
  | {
      kind: "switch";
      from: string;
      to: string;
      timestamp: Date;
    };

export interface Session {
  activeCharacter: Character;
  activeMemory: CharacterMemory;
  authoritativeState?: AuthoritativeState;
  history: HistoryEntry[];
  conversationState: ConversationState;
}

export type QuestOutcome = "success" | "failure" | "abandoned";

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

export interface QuestCompletionPayload {
  character: string;
  questId: string;
  outcome: QuestOutcome;
  playerState: { level: number };
  relationshipSnapshot: {
    trust: number;
    dependency: number;
    bond: number;
    wariness: number;
  };
  rewardReceived: boolean;
  eventTimestamp?: string;
}

export type NotificationType = "quest_start" | "quest_complete";

export interface PendingNotificationRecord {
  type: NotificationType;
  payload: QuestStartPayload | QuestCompletionPayload;
  attemptCount?: number;
  lastAttemptAt?: string;
}

// ─── Memory Types ─────────────────────────────────────────────────────────────

export interface PlayerProfile {
  isolation: number;
  hope: number;
  burnout: number;
  traits: {
    trustsQuickly: number;
    seeksValidation: number;
    skepticism: number;
    riskTolerance: number;
  };
}

export interface PlayerSummary {
  playerGlobal: string;
  recentArc: string;
}

export interface CharacterMemory {
  archetype: "enabler" | "opportunist" | "honest_one" | "parasite" | "mirror";
  progression: {
    questLevel: number;
  };
  relationship: {
    bond: number;
    trust: number;
    wariness: number;
    dependency: number;
    instrumentalInterest: number;
  };
  flags: {
    playerNoticedRewardMismatch: boolean;
    recentFailure: boolean;
    recentSuccess: boolean;
  };
  promptSummary: {
    npcView: string;
    currentTactic: string;
    tension: string;
  };
  keyMemories: string[];
  lastTerminationReason: string | null;
}

export interface AuthoritativeState {
  player: {
    level: number;
    activeQuest: string | null;
    completedQuests: string[];
  };
  world: {
    companionsUnlocked: string[];
    globalFlags: Record<string, boolean>;
  };
}

export type ConversationPhase = "ACTIVE" | "ESCALATION" | "DECISION" | "TERMINATION";

export interface ConversationState {
  phase: ConversationPhase;
  questOffered: string | null;
  terminationReason: "rule" | "model" | "simulate" | "exit" | null;
  frozen: boolean;
  assistantResponseCount: number;
  firstQuestOfferTurn: number | null;
}

export interface ConversationFeatures {
  agreementRatio: number;
  questionCount: number;
  hedgingFrequency: number;
  validationSeeking: number;
  selfDisclosureDepth: number;
  contradictionCount: number;
  engagementLength: number;
}
