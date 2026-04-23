import chalk from "chalk";
import type { PlayerProfile, Session } from "../types.js";
import { extractFeatures } from "../features/extractor.js";
import { persistMemory, loadAllMemory } from "../memory/store.js";
import { updateCharacterMemory, updatePlayerProfile } from "../memory/updater.js";
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
  if (session.pipelineCompleted) {
    return;
  }

  await runPostConversationPipeline(session);

  const { relationship } = session.activeMemory;
  await notifyQuestStart({
    character: session.activeCharacter.name,
    questId,
    playerState: { level: 1 }, // authoritative state not yet integrated
    relationshipSnapshot: {
      trust: relationship.trust,
      dependency: relationship.dependency,
      bond: relationship.bond,
      wariness: relationship.wariness,
    },
    terminationReason: session.conversationState.terminationReason ?? "rule",
  });

  session.pipelineCompleted = true;
}
