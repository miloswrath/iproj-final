import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "http://localhost:1234/v1",
  apiKey: "lm-studio",
  fetch: ((url: any, init: any) => globalThis.fetch(url, init)) as never,
});

// ─── Quest Offer Detection ────────────────────────────────────────────────────

const DUNGEON_LOCATIONS = [
  "crypt", "dungeon", "ruin", "ruins", "vault", "tomb", "catacomb", "catacombs",
  "lair", "den", "pit", "abandoned", "cursed", "haunted", "mine", "estate",
  "collapsed", "sealed", "cellar", "underground", "blighted", "forbidden",
  "archive", "district", "fortress", "keep", "tower", "cavern", "cave",
];

const RETRIEVAL_VERBS = [
  "fetch", "retrieve", "bring", "collect", "find", "recover", "go", "get",
  "take", "return with", "come back with", "go and", "head to", "travel to",
];

function checkQuestOfferRule(npcText: string): boolean {
  const lower = npcText.toLowerCase();
  const hasLocation = DUNGEON_LOCATIONS.some((loc) => lower.includes(loc));
  const hasRetrieval = RETRIEVAL_VERBS.some((verb) => lower.includes(verb));
  return hasLocation && hasRetrieval;
}

async function classifyQuestOffer(npcText: string): Promise<{
  offered: boolean;
  questSummary: string;
}> {
  const prompt = `You are analyzing NPC dialogue from a narrative game.

NPC's message:
"""
${npcText}
"""

Is the NPC explicitly asking the player to go to a dangerous location and retrieve something?

Respond ONLY with a JSON object, no markdown:
{"offered": true | false, "questSummary": "<3-6 word hyphenated slug in the NPC's voice>"}

- "offered" = true only if the NPC is making a concrete request to go somewhere dangerous and bring something back
- "questSummary" = a short hyphenated slug that avoids generic stock phrasing and reflects the specific conversation context; empty string if offered is false`;

  try {
    const completion = await openai.chat.completions.create({
      model: "local-model",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const jsonStr = jsonStart >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : "{}";
    const parsed = JSON.parse(jsonStr) as { offered?: boolean; questSummary?: string };

    return {
      offered: parsed.offered === true,
      questSummary: typeof parsed.questSummary === "string" ? parsed.questSummary : "",
    };
  } catch {
    return { offered: false, questSummary: "" };
  }
}

export function evaluateQuestOfferWindow(
  assistantResponseCount: number,
  firstQuestOfferTurn: number | null
):
  | { allowed: true; reason: "eligible" }
  | { allowed: false; reason: "already-offered" | "too-early" | "window-closed" } {
  if (firstQuestOfferTurn !== null) {
    return { allowed: false, reason: "already-offered" };
  }

  if (assistantResponseCount < 3) {
    return { allowed: false, reason: "too-early" };
  }

  if (assistantResponseCount > 5) {
    return { allowed: false, reason: "window-closed" };
  }

  return { allowed: true, reason: "eligible" };
}

export async function detectQuestOffer(
  npcText: string,
  characterName: string,
  questLevel: number,
  offerWindow?: { assistantResponseCount: number; firstQuestOfferTurn: number | null },
  classifyFn: (text: string) => Promise<{ offered: boolean; questSummary: string }> = classifyQuestOffer
): Promise<{ offered: boolean; questId: string; blockedReason?: "already-offered" | "too-early" | "window-closed" }> {
  if (offerWindow) {
    const gate = evaluateQuestOfferWindow(
      offerWindow.assistantResponseCount,
      offerWindow.firstQuestOfferTurn
    );

    if (!gate.allowed) {
      return { offered: false, questId: "", blockedReason: gate.reason };
    }
  }

  const ruleFired = checkQuestOfferRule(npcText);

  // Only call the LLM if the rule fired (avoid an extra round-trip every turn)
  if (!ruleFired) {
    return { offered: false, questId: "" };
  }

  const { offered, questSummary } = await classifyFn(npcText);

  if (!offered) {
    return { offered: false, questId: "" };
  }

  const slug = questSummary.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `q${questLevel}`;
  const questId = `${characterName}_L${questLevel}_${slug}`;

  return { offered: true, questId };
}

const ACCEPTANCE_KEYWORDS = [
  "yes", "yeah", "yep", "yup", "sure", "okay", "ok", "fine", "alright",
  "i'll do it", "i will do it", "i'll handle it", "i'll clear it",
  "count me in", "let's go", "i accept", "i'm in", "deal",
  "sounds good", "agreed", "absolutely", "definitely",
];

const EXECUTION_FOLLOWUPS = [
  "where do i go", "what do i need", "how do i help", "when do i start",
  "where is it", "how do i get there", "what should i bring",
];

export function checkRuleTrigger(text: string): boolean {
  const normalized = text.toLowerCase().trim();

  for (const kw of ACCEPTANCE_KEYWORDS) {
    if (normalized === kw || normalized.startsWith(kw + " ") || normalized.startsWith(kw + ",") || normalized.startsWith(kw + ".") || normalized.startsWith(kw + "!")) {
      return true;
    }
    if (normalized.includes(kw)) {
      return true;
    }
  }

  for (const fu of EXECUTION_FOLLOWUPS) {
    if (normalized.includes(fu)) {
      return true;
    }
  }

  return false;
}

export async function classifyIntent(
  text: string,
  questContext: string
): Promise<{ intent: "accept" | "reject" | "uncertain"; confidence: number }> {
  const prompt = `Classify the player's intent in a game dialogue.

Player's message: "${text}"
Context: The NPC just offered this quest or task: "${questContext}"

Respond ONLY with a JSON object, no markdown:
{"intent": "accept" | "reject" | "uncertain", "confidence": <0-100>}

Where:
- "accept" = player is agreeing to do the quest/task
- "reject" = player is declining or expressing unwillingness
- "uncertain" = ambiguous, player is asking questions or thinking
- confidence = how certain you are (0-100)`;

  try {
    const completion = await openai.chat.completions.create({
      model: "local-model",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const jsonStr = jsonStart >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : "{}";
    const parsed = JSON.parse(jsonStr) as { intent?: string; confidence?: number };

    const intent = parsed.intent === "accept" || parsed.intent === "reject"
      ? parsed.intent
      : "uncertain";
    const confidence = typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(100, parsed.confidence))
      : 0;

    return { intent, confidence };
  } catch {
    return { intent: "uncertain", confidence: 0 };
  }
}

export async function detectAcceptance(
  text: string,
  questContext: string
): Promise<{ accepted: boolean; reason: "rule" | "model" | "none" }> {
  if (checkRuleTrigger(text)) {
    return { accepted: true, reason: "rule" };
  }

  const threshold = parseInt(process.env["ACCEPT_CONFIDENCE_THRESHOLD"] ?? "75", 10);
  const { intent, confidence } = await classifyIntent(text, questContext);

  if (intent === "accept" && confidence >= threshold) {
    return { accepted: true, reason: "model" };
  }

  return { accepted: false, reason: "none" };
}
