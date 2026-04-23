import OpenAI from "openai";
import type { CharacterMemory, PlayerProfile, PlayerSummary } from "../types.js";

const openai = new OpenAI({
  baseURL: "http://localhost:1234/v1",
  apiKey: "lm-studio",
});

export async function generateSummaries(
  characterName: string,
  memory: CharacterMemory,
  profile: PlayerProfile
): Promise<{ playerSummary: PlayerSummary; updatedMemory: CharacterMemory }> {
  const fallbackPlayerSummary: PlayerSummary = {
    playerGlobal: `Player trend: hope ${profile.hope.toFixed(0)}, burnout ${profile.burnout.toFixed(0)}, isolation ${profile.isolation.toFixed(0)}.`,
    recentArc: `Recent interaction with ${characterName} updated relationship dynamics.`,
  };

  const fallbackMemory: CharacterMemory = {
    ...memory,
    promptSummary: {
      npcView: `Player appears ${profile.traits.seeksValidation > 0.55 ? "validation-seeking" : "self-directed"}.`,
      currentTactic: memory.archetype === "parasite" ? "Push higher-risk framing for better leverage." : "Keep guidance concise and gameplay-focused.",
      tension: memory.relationship.wariness > 65 ? "Player caution is rising." : "No major tension spike.",
    },
  };

  const prompt = `Create concise gameplay-only memory summaries as JSON.
Return exactly this schema:
{
  "playerGlobal": "...",
  "recentArc": "...",
  "npcView": "...",
  "currentTactic": "...",
  "tension": "..."
}
Character: ${characterName}
Archetype: ${memory.archetype}
Relationship: ${JSON.stringify(memory.relationship)}
PlayerProfile: ${JSON.stringify(profile)}
`; 

  try {
    const completion = await openai.chat.completions.create({
      model: "local-model",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const parsed = JSON.parse(start >= 0 ? raw.slice(start, end + 1) : "{}") as Record<string, string>;

    const playerSummary: PlayerSummary = {
      playerGlobal: parsed.playerGlobal?.trim() || fallbackPlayerSummary.playerGlobal,
      recentArc: parsed.recentArc?.trim() || fallbackPlayerSummary.recentArc,
    };

    const updatedMemory: CharacterMemory = {
      ...memory,
      promptSummary: {
        npcView: parsed.npcView?.trim() || fallbackMemory.promptSummary.npcView,
        currentTactic: parsed.currentTactic?.trim() || fallbackMemory.promptSummary.currentTactic,
        tension: parsed.tension?.trim() || fallbackMemory.promptSummary.tension,
      },
    };

    return { playerSummary, updatedMemory };
  } catch {
    return { playerSummary: fallbackPlayerSummary, updatedMemory: fallbackMemory };
  }
}
