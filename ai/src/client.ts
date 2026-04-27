import OpenAI from "openai";
import type { Session } from "./types.js";
import { appendMessage, getHistoryMessages } from "./session.js";

const openai = new OpenAI({
  baseURL: "http://localhost:1234/v1",
  apiKey: "lm-studio",
  fetch: ((url: any, init: any) => globalThis.fetch(url, init)) as never,
});

export async function sendMessage(
  session: Session,
  userText: string
): Promise<string> {
  appendMessage(session, "user", userText);

  const runtimeState = {
    conversationState: {
      phase: session.conversationState.phase,
      assistantResponseCount: session.conversationState.assistantResponseCount,
      firstQuestOfferTurn: session.conversationState.firstQuestOfferTurn,
      questOffered: session.conversationState.questOffered,
    },
    recentFlags: session.activeMemory.flags,
    recentKeyMemories: session.activeMemory.keyMemories.slice(-3),
  };

  const runtimeInstruction = [
    "Runtime state JSON is authoritative.",
    "If the recent flags or key memories indicate a just-completed quest, do not offer a new quest in assistant turns 1-2.",
    "Use the first post-completion turns for relationship follow-through and a player-facing question.",
    "Only offer a new quest from assistant turn 3 onward.",
  ].join(" ");

  const messages = [
    { role: "system" as const, content: session.activeCharacter.systemPrompt },
    {
      role: "system" as const,
      content: `${runtimeInstruction}\n\n\`\`\`json\n${JSON.stringify(runtimeState, null, 2)}\n\`\`\``,
    },
    ...getHistoryMessages(session),
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "local-model",
      messages,
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    appendMessage(session, "assistant", reply);
    return reply;
  } catch (err: unknown) {
    // Remove the user message we already appended so history stays clean
    session.history.pop();

    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed") || msg.includes("connect")) {
      return "__CONNECTION_ERROR__";
    }
    throw err;
  }
}
