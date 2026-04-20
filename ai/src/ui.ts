import chalk from "chalk";
import type {
  Character,
  CharacterMemory,
  ConversationFeatures,
  ConversationState,
  HistoryEntry,
  PlayerProfile,
  PlayerSummary,
  Session,
} from "./types.js";
import { computeDerivedMetrics } from "./memory/updater.js";

export function renderMessage(entry: Extract<HistoryEntry, { kind: "message" }>): void {
  if (entry.role === "user") {
    console.log(chalk.cyan(`> you: ${entry.content}`));
  } else {
    console.log(chalk.green(`> ${entry.characterName}: ${entry.content}`));
  }
}

export function renderSwitch(entry: Extract<HistoryEntry, { kind: "switch" }>): void {
  console.log(chalk.yellow(`--- switched from ${entry.from} to ${entry.to} ---`));
}

export function renderHistory(session: Session): void {
  if (session.history.length === 0) {
    console.log(chalk.dim("(no history yet)"));
    return;
  }
  for (const entry of session.history) {
    if (entry.kind === "message") {
      renderMessage(entry);
    } else {
      renderSwitch(entry);
    }
  }
}

export function renderCharacterList(characters: Character[]): void {
  console.log("Available characters:");
  for (const c of characters) {
    console.log(`  • ${c.name}`);
  }
}

export function renderError(msg: string): void {
  console.log(chalk.red(`> error: ${msg}`));
}

export function renderHelp(): void {
  console.log(`Commands:
  /switch <name>      — change the active character
  /list               — show available characters
  /history            — replay full session log
  /help               — show this help
  /clear              — clear chat history
  /quest <id>         — mark quest as offered (sets ESCALATION phase)
  /state              — show all memory layers
  /char <name>        — inspect a character's stored memory
  /features           — show current conversation feature scores
  /reload             — reload memory from disk
  /simulate_accept    — force quest acceptance and run pipeline
  /quit               — exit
  Ctrl+C              — exit
  <anything else>     — send as a chat message`);
}

// ─── Memory Debug Rendering ───────────────────────────────────────────────────

export function renderState(
  playerProfile: PlayerProfile,
  playerSummary: PlayerSummary,
  characterMemory: CharacterMemory,
  conversationState: ConversationState,
  characterName: string
): void {
  const { relationship, archetype, progression, promptSummary } = characterMemory;
  const derived = computeDerivedMetrics(characterMemory);

  console.log(chalk.bold("\n=== Memory State ==="));

  console.log(chalk.underline("\n[Global Player Profile]"));
  console.log(`  isolation:        ${playerProfile.isolation.toFixed(1)}`);
  console.log(`  hope:             ${playerProfile.hope.toFixed(1)}`);
  console.log(`  burnout:          ${playerProfile.burnout.toFixed(1)}`);
  console.log(`  trustsQuickly:    ${playerProfile.traits.trustsQuickly.toFixed(2)}`);
  console.log(`  seeksValidation:  ${playerProfile.traits.seeksValidation.toFixed(2)}`);
  console.log(`  skepticism:       ${playerProfile.traits.skepticism.toFixed(2)}`);
  console.log(`  riskTolerance:    ${playerProfile.traits.riskTolerance.toFixed(2)}`);

  console.log(chalk.underline(`\n[Active Character: ${characterName}]`));
  console.log(`  archetype:        ${archetype}  questLevel: ${progression.questLevel}`);
  console.log(`  bond: ${relationship.bond.toFixed(1).padStart(5)}  trust: ${relationship.trust.toFixed(1).padStart(5)}  wariness: ${relationship.wariness.toFixed(1).padStart(5)}`);
  console.log(`  dependency: ${relationship.dependency.toFixed(1).padStart(5)}  instrumentalInterest: ${relationship.instrumentalInterest.toFixed(1).padStart(5)}`);
  console.log(`  manipulationPressure: ${derived.manipulationPressure}  favorability: ${derived.favorability}  (derived)`);
  console.log(`  phase:            ${conversationState.phase}`);
  console.log(`  questOffered:     ${conversationState.questOffered ?? "none"}`);

  console.log(chalk.underline("\n[Prompt Summaries]"));
  console.log(`  playerGlobal:    "${playerSummary.playerGlobal}"`);
  console.log(`  recentArc:       "${playerSummary.recentArc}"`);
  console.log(`  npcView:         "${promptSummary.npcView}"`);
  console.log(`  currentTactic:   "${promptSummary.currentTactic}"`);
  console.log(`  tension:         "${promptSummary.tension}"`);
  console.log();
}

export function renderCharacterMemory(name: string, memory: CharacterMemory): void {
  const { relationship, archetype, progression, flags, promptSummary, keyMemories } = memory;
  const derived = computeDerivedMetrics(memory);

  console.log(chalk.bold(`\n=== Character Memory: ${name} ===`));
  console.log(`Archetype: ${archetype}  |  Quest Level: ${progression.questLevel}`);

  console.log(chalk.underline("\nRelationship"));
  console.log(`  bond: ${relationship.bond.toFixed(1)}  trust: ${relationship.trust.toFixed(1)}  wariness: ${relationship.wariness.toFixed(1)}`);
  console.log(`  dependency: ${relationship.dependency.toFixed(1)}  instrumentalInterest: ${relationship.instrumentalInterest.toFixed(1)}`);
  console.log(`  manipulationPressure: ${derived.manipulationPressure}  favorability: ${derived.favorability}  (derived)`);

  console.log(chalk.underline("\nFlags"));
  console.log(`  playerNoticedRewardMismatch: ${flags.playerNoticedRewardMismatch}`);
  console.log(`  recentFailure: ${flags.recentFailure}  recentSuccess: ${flags.recentSuccess}`);

  console.log(chalk.underline("\nKey Memories"));
  if (keyMemories.length === 0) {
    console.log("  (none yet)");
  } else {
    keyMemories.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
  }

  console.log(chalk.underline("\nPrompt Summary"));
  console.log(`  npcView:       "${promptSummary.npcView}"`);
  console.log(`  currentTactic: "${promptSummary.currentTactic}"`);
  console.log(`  tension:       "${promptSummary.tension}"`);
  console.log();
}

export function renderConversationFeatures(
  features: ConversationFeatures,
  state: ConversationState
): void {
  const playerMessages = Math.round(features.agreementRatio > 0 ? 1 / features.agreementRatio : 0);
  console.log(chalk.bold("\n=== Conversation Features (current session) ==="));
  console.log(`  agreementRatio:      ${features.agreementRatio.toFixed(2)}`);
  console.log(`  questionCount:       ${features.questionCount}`);
  console.log(`  hedgingFrequency:    ${features.hedgingFrequency}`);
  console.log(`  validationSeeking:   ${features.validationSeeking}`);
  console.log(`  selfDisclosureDepth: ${features.selfDisclosureDepth}`);
  console.log(`  contradictionCount:  ${features.contradictionCount}`);
  console.log(`  engagementLength:    ${features.engagementLength.toFixed(1)} words/turn (avg)`);
  console.log();
  console.log(`Conversation Phase:    ${state.phase}`);
  console.log(`Quest Offered:         ${state.questOffered ?? "none"}`);
  console.log(`Termination Trigger:   ${state.terminationReason ?? "none yet"}`);
  console.log();
}
