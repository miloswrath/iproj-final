import type { CharacterMemory, ConversationFeatures, PlayerProfile } from "../types.js";

const PERSISTENCE = 0.8;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function archetypeScale(archetype: CharacterMemory["archetype"]): number {
  switch (archetype) {
    case "enabler":
      return 1.1;
    case "opportunist":
      return 1.05;
    case "parasite":
      return 1.15;
    case "mirror":
      return 1.0;
    case "honest_one":
    default:
      return 0.95;
  }
}

export function computeDerivedMetrics(memory: CharacterMemory): {
  manipulationPressure: number;
  favorability: number;
} {
  const { dependency, instrumentalInterest, bond, trust, wariness } = memory.relationship;
  return {
    manipulationPressure: Number(((dependency * instrumentalInterest) / 100).toFixed(1)),
    favorability: Number((((bond + trust - wariness) / 2)).toFixed(1)),
  };
}

export function updateCharacterMemory(
  current: CharacterMemory,
  features: ConversationFeatures,
  _player: PlayerProfile
): CharacterMemory {
  const scale = archetypeScale(current.archetype);

  const trustDelta = ((features.agreementRatio * 12) + (features.validationSeeking * 0.8) - (features.contradictionCount * 1.5)) * scale;
  const bondDelta = ((features.engagementLength / 8) + (features.selfDisclosureDepth * 1.5)) * scale;
  const dependencyDelta = ((features.validationSeeking * 1.2) + (features.questionCount * 0.5)) * scale;
  const warinessDelta = ((features.contradictionCount * 2) + (features.hedgingFrequency * 0.8) - (features.agreementRatio * 4)) * scale;
  const interestDelta = ((features.engagementLength / 10) + (features.questionCount * 0.6)) * scale;

  const relationship = {
    trust: clamp(current.relationship.trust * PERSISTENCE + trustDelta, 0, 100),
    bond: clamp(current.relationship.bond * PERSISTENCE + bondDelta, 0, 100),
    dependency: clamp(current.relationship.dependency * PERSISTENCE + dependencyDelta, 0, 100),
    wariness: clamp(current.relationship.wariness * PERSISTENCE + warinessDelta, 0, 100),
    instrumentalInterest: clamp(current.relationship.instrumentalInterest * PERSISTENCE + interestDelta, 0, 100),
  };

  return {
    ...current,
    relationship,
    keyMemories: current.keyMemories.slice(-4),
  };
}

export function updatePlayerProfile(
  current: PlayerProfile,
  features: ConversationFeatures
): PlayerProfile {
  return {
    isolation: clamp(current.isolation * 0.9 + (features.selfDisclosureDepth > 0 ? -2 : 1), 0, 100),
    hope: clamp(current.hope * 0.9 + (features.agreementRatio * 8), 0, 100),
    burnout: clamp(current.burnout * 0.9 + (features.hedgingFrequency * 1.2), 0, 100),
    traits: {
      trustsQuickly: clamp(current.traits.trustsQuickly * 0.9 + features.agreementRatio * 0.1, 0, 1),
      seeksValidation: clamp(current.traits.seeksValidation * 0.9 + Math.min(features.validationSeeking, 3) * 0.03, 0, 1),
      skepticism: clamp(current.traits.skepticism * 0.9 + Math.min(features.contradictionCount, 3) * 0.03, 0, 1),
      riskTolerance: clamp(current.traits.riskTolerance * 0.9 + (features.questionCount > 0 ? 0.02 : -0.01), 0, 1),
    },
  };
}
