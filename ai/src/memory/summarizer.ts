import OpenAI from "openai";
import type { CharacterMemory, PlayerProfile, PlayerSummary } from "../types.js";

const openai = new OpenAI({
  baseURL: "http://localhost:1234/v1",
  apiKey: "lm-studio",
});

interface SummaryResponse {
  playerGlobal: string;
  recentArc: string;
  npcView: string;
  currentTactic: string;
  tension: string;
}

export async function generateSummaries(
  characterName: string,
  memory: CharacterMemory,
  profile: PlayerProfile
): Promise<{ playerSummary: PlayerSummary; updatedMemory: CharacterMemory }> {
  const { relationship, archetype, keyMemories, promptSummary } = memory;

  const prompt = `You are a narrative AI tracking the state of an NPC relationship in a game.

Character: ${characterName} (archetype: ${archetype})
Relationship metrics (0-100):
  bond=${relationship.bond} trust=${relationship.trust} wariness=${relationship.wariness}
  dependency=${relationship.dependency} instrumentalInterest=${relationship.instrumentalInterest}

Player emotional state:
  isolation=${profile.isolation} hope=${profile.hope} burnout=${profile.burnout}
  trustsQuickly=${profile.traits.trustsQuickly.toFixed(2)} seeksValidation=${profile.traits.seeksValidation.toFixed(2)}
  skepticism=${profile.traits.skepticism.toFixed(2)} riskTolerance=${profile.traits.riskTolerance.toFixed(2)}

Previous NPC view: "${promptSummary.npcView}"
Key memories: ${keyMemories.length > 0 ? keyMemories.map((m, i) => `${i + 1}. ${m}`).join("; ") : "none"}

Generate a JSON object with exactly these 5 fields (each a single sentence, max 20 words):
{
  "playerGlobal": "<dominant player behavioral trait for any NPC to know>",
  "recentArc": "<what just happened and why it matters>",
  "npcView": "<how ${characterName} currently reads the player>",
  "currentTactic": "<what ${characterName} will try next>",
  "tension": "<active unresolved dynamic, or 'None.' if none>"
}
Respond ONLY with the JSON object. No markdown, no explanation.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "local-model",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const jsonStr = jsonStart >= 0 && jsonEnd > jsonStart
      ? raw.slice(jsonStart, jsonEnd + 1)
      : "{}";

    const parsed = JSON.parse(jsonStr) as Partial<SummaryResponse>;

    const playerSummary: PlayerSummary = {
      playerGlobal: parsed.playerGlobal ?? "Behavioral pattern unclear.",
      recentArc: parsed.recentArc ?? "Session ended without resolution.",
    };

    const updatedMemory: CharacterMemory = {
      ...memory,
      promptSummary: {
        npcView: parsed.npcView ?? promptSummary.npcView,
        currentTactic: parsed.currentTactic ?? promptSummary.currentTactic,
        tension: parsed.tension ?? promptSummary.tension,
      },
    };

    return { playerSummary, updatedMemory };
  } catch {
    // If LLM is unavailable, preserve existing summaries
    return {
      playerSummary: {
        playerGlobal: "Summary generation failed — LLM unavailable.",
        recentArc: "Session data saved; summary will regenerate next run.",
      },
      updatedMemory: memory,
    };
  }
}
