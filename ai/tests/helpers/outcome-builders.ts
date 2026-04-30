import { defaultPlayerProfile } from "../../src/memory/store.js";
import type { PlayerProfile, QuestCompletionPayload } from "../../src/types.js";

export function buildQuestCompletion(
  overrides: Partial<QuestCompletionPayload> = {}
): QuestCompletionPayload {
  return {
    character: "enabler",
    questId: "enabler_L1_small-errand",
    outcome: "success",
    playerState: { level: 2 },
    relationshipSnapshot: {
      trust: 70,
      dependency: 45,
      bond: 62,
      wariness: 15,
    },
    rewardReceived: true,
    eventTimestamp: "2026-04-22T12:00:00.000Z",
    ...overrides,
  };
}

export function buildPlayerProfile(
  overrides: Partial<PlayerProfile> = {}
): PlayerProfile {
  return {
    ...defaultPlayerProfile(),
    ...overrides,
    traits: {
      ...defaultPlayerProfile().traits,
      ...overrides.traits,
    },
  };
}
