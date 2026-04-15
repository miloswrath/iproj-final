import chalk from "chalk";
import type { Character, HistoryEntry, Session } from "./types.js";

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
  /switch <name>  — change the active character
  /list           — show available characters
  /history        — replay full session log
  /help           — show this help
  /clear          — clear chat history
  /quit           — exit
  Ctrl+C          — exit
  <anything else> — send as a chat message`);
}
