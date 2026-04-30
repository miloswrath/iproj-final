import chalk from "chalk";
import type { PlayerProfile, QuestCompletionPayload, Session } from "../types.js";
import { extractFeatures } from "../features/extractor.js";
import {
  completionEventKey,
  persistMemory,
  loadAllMemory,
  markCompletionProcessed,
  wasCompletionProcessed,
} from "../memory/store.js";
import {
  applyQuestOutcomeToCharacterMemory,
  applyQuestOutcomeToPlayerProfile,
  updateCharacterMemory,
  updatePlayerProfile,
} from "../memory/updater.js";
import { generateSummaries } from "../memory/summarizer.js";
import { notifyQuestStart } from "../notify/game-api.js";

export async function runPostConversationPipeline(session: Session): Promise<void> {
  const characterName = session.activeCharacter.name;

  process.stdout.write(chalk.dim("\nUpdating memory..."));

  // 1. Extract behavioral features from conversation history
  const features = extractFeatures(session.history);
  process.stdout.write(chalk.dim(" features extracted"));

  // 2. Load current persisted profile (may differ from session start if reloaded)
  const { playerProfile: currentProfile } = await loadAllMemory(characterName);

  // 3. Update relationship metrics
  const updatedMemory = updateCharacterMemory(session.activeMemory, features, currentProfile);
  const updatedProfile: PlayerProfile = updatePlayerProfile(currentProfile, features);
  process.stdout.write(chalk.dim(", metrics updated"));

  // 4. Tag termination reason
  const memoryWithReason = {
    ...updatedMemory,
    lastTerminationReason: session.conversationState.terminationReason,
  };

  // 5. Generate LLM summaries
  const { playerSummary, updatedMemory: memoryWithSummary } = await generateSummaries(
    characterName,
    memoryWithReason,
    updatedProfile
  );
  process.stdout.write(chalk.dim(", summaries generated"));

  // 6. Persist atomically
  await persistMemory(characterName, memoryWithSummary, updatedProfile, playerSummary);

  // Update in-memory session reference
  session.activeMemory = memoryWithSummary;

  process.stdout.write(chalk.dim(", saved.\n"));
}

export async function runWithNotification(
  session: Session,
  questId: string
): Promise<void> {
  await runPostConversationPipeline(session);

  const { relationship } = session.activeMemory;
  const playerLevel = session.authoritativeState?.player.level ?? 1;
  await notifyQuestStart({
    character: session.activeCharacter.name,
    questId,
    playerState: { level: playerLevel },
    relationshipSnapshot: {
      trust: relationship.trust,
      dependency: relationship.dependency,
      bond: relationship.bond,
      wariness: relationship.wariness,
    },
    terminationReason: session.conversationState.terminationReason ?? "rule",
  });
}

function validateQuestCompletionPayload(payload: QuestCompletionPayload): boolean {
  const hasCoreText = payload.character.trim().length > 0 && payload.questId.trim().length > 0;
  const validOutcome = payload.outcome === "success" || payload.outcome === "failure" || payload.outcome === "abandoned";
  return hasCoreText && validOutcome;
}

export async function runQuestCompletionPipeline(
  session: Session,
  payload: QuestCompletionPayload
): Promise<{ applied: boolean; reason: "applied" | "duplicate" | "invalid" }> {
  if (!validateQuestCompletionPayload(payload)) {
    return { applied: false, reason: "invalid" };
  }

  const eventKey = completionEventKey(payload);
  if (await wasCompletionProcessed(eventKey)) {
    return { applied: false, reason: "duplicate" };
  }

  const { characterMemory, playerProfile, playerSummary } = await loadAllMemory(payload.character);

  const updatedCharacter = applyQuestOutcomeToCharacterMemory(characterMemory, payload);
  const updatedProfile = applyQuestOutcomeToPlayerProfile(playerProfile, payload.outcome);

  await persistMemory(payload.character, updatedCharacter, updatedProfile, playerSummary);
  await markCompletionProcessed(eventKey);

  if (session.activeCharacter.name === payload.character) {
    session.activeMemory = updatedCharacter;
  }

  return { applied: true, reason: "applied" };
}
