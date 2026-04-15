import readline from "readline";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { loadCharacters, findCharacter } from "./characters.js";
import { createSession, appendSwitch, clearSession } from "./session.js";
import { sendMessage } from "./client.js";
import {
  renderMessage,
  renderSwitch,
  renderHistory,
  renderCharacterList,
  renderError,
  renderHelp,
} from "./ui.js";
import type { Session } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(__dirname, "../docs/prompts");

async function main(): Promise<void> {
  const characters = loadCharacters(PROMPTS_DIR);

  console.log(chalk.bold("\nAI Companions - Terminal Chat"));
  renderCharacterList(characters);

  // Prompt for starting character
  const startRl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const startingName = await new Promise<string>((resolve) => {
    startRl.question("Starting character (default: general): ", (answer) => {
      startRl.close();
      resolve(answer.trim());
    });
  });

  let startChar = findCharacter(characters, startingName || "general");
  if (!startChar && startingName) {
    console.log(chalk.yellow(`Unknown character "${startingName}", defaulting to general.`));
    startChar = findCharacter(characters, "general");
  }
  if (!startChar) {
    startChar = characters[0];
  }

  console.log(chalk.dim(`Starting session with ${startChar.name}. Type /help for commands.\n`));

  const session: Session = createSession(startChar);

  // Main readline loop
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan("> "),
  });

  function handleExit(): void {
    console.log("\nGoodbye.");
    rl.close();
    process.exit(0);
  }

  rl.on("SIGINT", handleExit);

  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    // Command dispatch
    if (input.startsWith("/")) {
      const [cmd, ...args] = input.split(/\s+/);

      switch (cmd) {
        case "/quit":
          handleExit();
          break;

        case "/list":
          renderCharacterList(characters);
          break;

        case "/help":
          renderHelp();
          break;

        case "/history":
          renderHistory(session);
          break;

        case "/clear":
          clearSession(session);
          console.log(chalk.dim("(session cleared)"));
          break;

        case "/switch": {
          const name = args[0];
          if (!name) {
            console.log(chalk.red("Usage: /switch <character-name>"));
          } else {
            const char = findCharacter(characters, name);
            if (!char) {
              console.log(
                chalk.red(`Unknown character: ${name}. Use /list to see available characters.`)
              );
            } else {
              appendSwitch(session, char);
              const switchEntry = session.history[session.history.length - 1];
              if (switchEntry.kind === "switch") {
                renderSwitch(switchEntry);
              }
            }
          }
          break;
        }

        default:
          console.log(chalk.red(`Unknown command: ${cmd}. Type /help for commands.`));
      }

      rl.prompt();
      return;
    }

    // Chat message
    rl.pause();
    const reply = await sendMessage(session, input);

    if (reply === "__CONNECTION_ERROR__") {
      renderError(
        "LM Studio is not running at localhost:1234. Start LM Studio and load a model, then try again."
      );
    } else {
      const lastEntry = session.history[session.history.length - 1];
      if (lastEntry.kind === "message") {
        renderMessage(lastEntry);
      }
    }

    rl.resume();
    rl.prompt();
  });
}

main().catch((err) => {
  console.error(chalk.red("Fatal error:"), err);
  process.exit(1);
});
