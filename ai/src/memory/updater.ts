import type {
  CharacterMemory,
  ConversationFeatures,
  PlayerProfile,
  QuestCompletionPayload,
  QuestOutcome,
} from "../types.js";

const PERSISTENCE = 0.80;

type MetricKey = keyof CharacterMemory["relationship"];
type TraitKey = keyof PlayerProfile["traits"];

interface ArchetypeWeights {
  bond: number;
  trust: number;
  wariness: number;
  dependency: number;
  instrumentalInterest: number;
}

const ARCHETYPE_MODIFIERS: Record<CharacterMemory["archetype"], ArchetypeWeights> = {
  enabler:     { bond: 1.2, trust: 1.2, wariness: 0.9, dependency: 1.0, instrumentalInterest: 0.9 },
  opportunist: { bond: 1.0, trust: 0.9, wariness: 1.0, dependency: 1.3, instrumentalInterest: 1.3 },
  honest_one:  { bond: 1.0, trust: 1.1, wariness: 0.8, dependency: 0.9, instrumentalInterest: 0.8 },
  parasite:    { bond: 0.9, trust: 0.8, wariness: 1.1, dependency: 1.2, instrumentalInterest: 1.5 },
  mirror:      { bond: 1.0, trust: 1.0, wariness: 1.0, dependency: 1.0, instrumentalInterest: 1.0 },
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function featureDelta(features: ConversationFeatures): Record<MetricKey, number> {
  const { agreementRatio, validationSeeking, engagementLength, hedgingFrequency, selfDisclosureDepth, contradictionCount } = features;

  return {
    bond:                 2.5 * agreementRatio + 1.5 * selfDisclosureDepth + 1.0 * engagementLength * 0.1,
    trust:                3.0 * agreementRatio + 1.0 * validationSeeking * 0.5,
    wariness:            -1.5 * agreementRatio + 2.0 * contradictionCount * 0.3,
    dependency:           2.0 * validationSeeking * 0.5 + 1.5 * agreementRatio,
    instrumentalInterest: 1.5 * agreementRatio + 1.0 * engagementLength * 0.1,
  };
}

function getMirrorModifiers(profile: PlayerProfile): ArchetypeWeights {
  const dominant = (() => {
    const { trustsQuickly, seeksValidation, skepticism, riskTolerance } = profile.traits;
    const entries: [string, number][] = [
      ["trustsQuickly", trustsQuickly],
      ["seeksValidation", seeksValidation],
      ["skepticism", skepticism],
      ["riskTolerance", riskTolerance],
    ];
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  })();

  switch (dominant) {
    case "seeksValidation": return { bond: 1.3, trust: 1.1, wariness: 0.8, dependency: 1.4, instrumentalInterest: 1.0 };
    case "skepticism":      return { bond: 0.8, trust: 0.9, wariness: 1.3, dependency: 0.8, instrumentalInterest: 1.2 };
    case "riskTolerance":   return { bond: 1.1, trust: 1.2, wariness: 0.9, dependency: 0.9, instrumentalInterest: 1.1 };
    default:                return { bond: 1.1, trust: 1.2, wariness: 0.9, dependency: 1.0, instrumentalInterest: 1.0 };
  }
}

export function updateCharacterMemory(
  memory: CharacterMemory,
  features: ConversationFeatures,
  playerProfile: PlayerProfile
): CharacterMemory {
  const mods = memory.archetype === "mirror"
    ? getMirrorModifiers(playerProfile)
    : ARCHETYPE_MODIFIERS[memory.archetype];

  const deltas = featureDelta(features);
  const rel = memory.relationship;

  const newRel: CharacterMemory["relationship"] = {
    bond:                 clamp(rel.bond * PERSISTENCE                + mods.bond * deltas.bond),
    trust:                clamp(rel.trust * PERSISTENCE               + mods.trust * deltas.trust),
    wariness:             clamp(rel.wariness * PERSISTENCE            + mods.wariness * deltas.wariness),
    dependency:           clamp(rel.dependency * PERSISTENCE          + mods.dependency * deltas.dependency),
    instrumentalInterest: clamp(rel.instrumentalInterest * PERSISTENCE + mods.instrumentalInterest * deltas.instrumentalInterest),
  };

  return { ...memory, relationship: newRel };
}

export function updatePlayerProfile(
  profile: PlayerProfile,
  features: ConversationFeatures
): PlayerProfile {
  const { agreementRatio, hedgingFrequency, validationSeeking, selfDisclosureDepth, contradictionCount } = features;

  return {
    isolation: clamp(profile.isolation * PERSISTENCE - 5 * agreementRatio),
    hope:      clamp(profile.hope * PERSISTENCE + 3 * agreementRatio - 2 * hedgingFrequency * 0.2),
    burnout:   clamp(profile.burnout * PERSISTENCE + 2 * hedgingFrequency * 0.2),
    traits: {
      trustsQuickly:    clamp01(profile.traits.trustsQuickly * 0.9    + 0.1 * agreementRatio),
      seeksValidation:  clamp01(profile.traits.seeksValidation * 0.9  + 0.1 * Math.min(validationSeeking / 3, 1)),
      skepticism:       clamp01(profile.traits.skepticism * 0.9       + 0.1 * Math.min(contradictionCount / 3, 1)),
      riskTolerance:    clamp01(profile.traits.riskTolerance * 0.9    + 0.1 * agreementRatio),
    },
  };
}

export function computeDerivedMetrics(memory: CharacterMemory): {
  manipulationPressure: number;
  favorability: number;
} {
  const { bond, trust, wariness, dependency, instrumentalInterest } = memory.relationship;
  return {
    manipulationPressure: Math.round((dependency * instrumentalInterest) / 100),
    favorability: Math.round((bond + trust - wariness) / 2),
  };
}

export function applyQuestOutcomeToCharacterMemory(
  memory: CharacterMemory,
  payload: QuestCompletionPayload
): CharacterMemory {
  const { outcome, rewardReceived, questId } = payload;

  const flags = {
    ...memory.flags,
    recentSuccess: outcome === "success",
    recentFailure: outcome === "failure",
    playerNoticedRewardMismatch: outcome === "success" && rewardReceived === false,
  };

  const progression = {
    ...memory.progression,
    questLevel:
      outcome === "success"
        ? memory.progression.questLevel + 1
        : memory.progression.questLevel,
  };

  const outcomeText: Record<QuestOutcome, string> = {
    success: "succeeded",
    failure: "failed",
    abandoned: "was abandoned",
  };

  const summary = `Quest ${questId} ${outcomeText[outcome]}.`;
  const keyMemories = [...memory.keyMemories, summary].slice(-5);

  return {
    ...memory,
    flags,
    progression,
    keyMemories,
  };
}

export function applyQuestOutcomeToPlayerProfile(
  profile: PlayerProfile,
  outcome: QuestOutcome
): PlayerProfile {
  const burnoutDelta = outcome === "success" ? -2 : outcome === "failure" ? 4 : 3;
  const hopeDelta = outcome === "success" ? 4 : -3;
  const riskDelta = outcome === "success" ? 0.02 : outcome === "failure" ? -0.02 : 0;

  return {
    ...profile,
    burnout: clamp(profile.burnout + burnoutDelta),
    hope: clamp(profile.hope + hopeDelta),
    traits: {
      ...profile.traits,
      riskTolerance: clamp01(profile.traits.riskTolerance + riskDelta),
    },
  };
}
