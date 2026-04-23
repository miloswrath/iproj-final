import type { CharacterMemory, PlayerSummary } from "../types.js";

export function buildEnrichedSystemPrompt(
  basePrompt: string,
  memory: CharacterMemory,
  summary: PlayerSummary
): string {
  const { relationship, promptSummary, progression, archetype } = memory;
  const memoryBlock = [
    "[MEMORY CONTEXT - GAMEPLAY ONLY]",
    `Archetype: ${archetype}`,
    `Quest level: ${progression.questLevel}`,
    `Relationship: bond=${relationship.bond.toFixed(1)}, trust=${relationship.trust.toFixed(1)}, wariness=${relationship.wariness.toFixed(1)}, dependency=${relationship.dependency.toFixed(1)}, instrumentalInterest=${relationship.instrumentalInterest.toFixed(1)}`,
    `Player global: ${summary.playerGlobal}`,
    `Recent arc: ${summary.recentArc}`,
    `NPC view: ${promptSummary.npcView}`,
    `Current tactic: ${promptSummary.currentTactic}`,
    `Tension: ${promptSummary.tension}`,
    "Keep replies short, state-driven, and gameplay-functional.",
  ].join("\n");

  return `${basePrompt}\n\n${memoryBlock}`;
}
