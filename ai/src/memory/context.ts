import type { CharacterMemory, PlayerSummary } from "../types.js";

export function buildEnrichedSystemPrompt(
  basePrompt: string,
  characterMemory: CharacterMemory,
  playerSummary: PlayerSummary
): string {
  const { promptSummary, relationship, archetype, flags, progression, keyMemories } = characterMemory;

  const relationshipBlock = `
## Your Memory of This Player

- Bond: ${relationship.bond}/100 | Trust: ${relationship.trust}/100 | Wariness: ${relationship.wariness}/100
- Dependency: ${relationship.dependency}/100 | Instrumental Interest: ${relationship.instrumentalInterest}/100
- Your read of them: "${promptSummary.npcView}"
- Your current approach: "${promptSummary.currentTactic}"
- Active tension: "${promptSummary.tension}"
- Your archetype: ${archetype}`;

  const playerBlock = `
## What You Know About The Player

- Overall pattern: "${playerSummary.playerGlobal}"
- Recent arc: "${playerSummary.recentArc}"`;

  const memoryJsonBlock = `
## Runtime Memory JSON (Source of Truth)

Treat this JSON as authoritative state, not flavor text:

\`\`\`json
${JSON.stringify(
  {
    progression,
    flags,
    keyMemories: keyMemories.slice(-3),
    relationship,
    playerSummary,
  },
  null,
  2
)}
\`\`\``;

  return `${basePrompt}\n${relationshipBlock}\n${playerBlock}\n${memoryJsonBlock}`;
}
