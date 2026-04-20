import type { ConversationFeatures, HistoryEntry } from "../types.js";

const AFFIRMATIVES = /\b(yes|yeah|yep|sure|okay|ok|fine|alright|absolutely|definitely|of course|i will|i'll|count me in|let's go|i accept|i'll do it|i'll handle it|i'll clear it)\b/gi;
const HEDGES = /\b(maybe|perhaps|possibly|probably|think|kind of|sort of|i guess|i suppose|might|could)\b/gi;
const VALIDATION = /(do you think|is that okay|make sense|right\?|does that sound|am i doing)/gi;
const SELF_DISCLOSURE = /\b(feel|felt|fear|afraid|scared|lonely|tired|overwhelmed|struggling|hope|dream|remember when|back when|used to|always wanted|never told)\b/gi;
const CONTRADICTION = /\b(but|however|actually|wait|no,|that's not|i didn't mean|i meant)\b/gi;

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

export function extractFeatures(history: HistoryEntry[]): ConversationFeatures {
  const playerMessages = history.filter(
    (e): e is Extract<HistoryEntry, { kind: "message" }> & { role: "user" } =>
      e.kind === "message" && e.role === "user"
  );

  if (playerMessages.length === 0) {
    return {
      agreementRatio: 0,
      questionCount: 0,
      hedgingFrequency: 0,
      validationSeeking: 0,
      selfDisclosureDepth: 0,
      contradictionCount: 0,
      engagementLength: 0,
    };
  }

  const totalTurns = playerMessages.length;
  let agreementCount = 0;
  let questionCount = 0;
  let hedgingFrequency = 0;
  let validationSeeking = 0;
  let selfDisclosureDepth = 0;
  let contradictionCount = 0;
  let totalWords = 0;

  for (const msg of playerMessages) {
    const text = msg.content;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    totalWords += wordCount;

    if (AFFIRMATIVES.test(text)) agreementCount++;
    AFFIRMATIVES.lastIndex = 0;

    if (text.includes("?")) questionCount++;

    hedgingFrequency += countMatches(text, HEDGES);
    HEDGES.lastIndex = 0;

    validationSeeking += countMatches(text, VALIDATION);
    VALIDATION.lastIndex = 0;

    selfDisclosureDepth += countMatches(text, SELF_DISCLOSURE);
    SELF_DISCLOSURE.lastIndex = 0;

    contradictionCount += countMatches(text, CONTRADICTION);
    CONTRADICTION.lastIndex = 0;
  }

  return {
    agreementRatio: agreementCount / totalTurns,
    questionCount,
    hedgingFrequency,
    validationSeeking,
    selfDisclosureDepth,
    contradictionCount,
    engagementLength: totalWords / totalTurns,
  };
}
