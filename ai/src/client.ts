import OpenAI from "openai";
import type { Session } from "./types.js";
import { appendMessage, getHistoryMessages } from "./session.js";

const openai = new OpenAI({
  baseURL: "http://localhost:1234/v1",
  apiKey: "lm-studio",
});

export async function sendMessage(
  session: Session,
  userText: string
): Promise<string> {
  appendMessage(session, "user", userText);

  const messages = [
    { role: "system" as const, content: session.activeCharacter.systemPrompt },
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
