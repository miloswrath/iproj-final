import readline from "readline";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { loadCharacters, findCharacter } from "./characters.js";
import {
  createSession,
  appendSwitch,
  clearSession,
  freezeSession,
  setQuestOffered,
} from "./session.js";
import { sendMessage } from "./client.js";
import {
  renderMessage,
  renderSwitch,
  renderHistory,
  renderCharacterList,
  renderError,
  renderHelp,
  renderState,
  renderCharacterMemory,
  renderConversationFeatures,
} from "./ui.js";
import { ensureMemoryDirs, loadAllMemory, MEMORY_DIR, getFileTimestamp } from "./memory/store.js";
import { buildEnrichedSystemPrompt } from "./memory/context.js";
import { runPostConversationPipeline, runWithNotification } from "./lifecycle/pipeline.js";
import { detectAcceptance, detectQuestOffer } from "./lifecycle/detector.js";
import { extractFeatures } from "./features/extractor.js";
import { retrySavedNotifications } from "./notify/game-api.js";
import type { PlayerSummary, Session } from "./types.js";
import path2 from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(__dirname, "../docs/prompts");

async function main(): Promise<void> {
  // Ensure memory directory exists
  await ensureMemoryDirs();

  // Retry any notifications that failed in prior sessions
  await retrySavedNotifications();

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

  // Load memory for the starting character
  const { playerProfile, playerSummary, characterMemory } = await loadAllMemory(
    startChar.name
  );

  // Build enriched prompt with memory context
  const enrichedPrompt = buildEnrichedSystemPrompt(
    startChar.systemPrompt,
    characterMemory,
    playerSummary
  );
  const enrichedChar = { ...startChar, systemPrompt: enrichedPrompt };

  console.log(chalk.dim(`Starting session with ${startChar.name}. Type /help for commands.\n`));

  const session: Session = createSession(enrichedChar, characterMemory);

  // Keep a mutable reference to player summary for /state display
  let activePlayerSummary: PlayerSummary = playerSummary;

  // Main readline loop
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan("> "),
  });

  async function handleExit(runPipeline = true): Promise<void> {
    if (runPipeline) {
      if (!session.conversationState.terminationReason) {
        freezeSession(session, "exit");
      }
      await runPostConversationPipeline(session);
    }
    console.log("\nGoodbye.");
    rl.close();
    process.exit(0);
  }

  rl.on("SIGINT", () => void handleExit());

  rl.prompt();

  rl.on("line", (line) => {
    void (async () => {
      // Don't accept input if conversation is frozen
      if (session.conversationState.frozen) {
        rl.prompt();
        return;
      }

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
            await handleExit(true);
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
                // Load memory for new character
                const { characterMemory: newMem, playerSummary: newSummary } =
                  await loadAllMemory(char.name);
                activePlayerSummary = newSummary;
                const newEnriched = buildEnrichedSystemPrompt(
                  char.systemPrompt,
                  newMem,
                  newSummary
                );
                const newChar = { ...char, systemPrompt: newEnriched };
                appendSwitch(session, newChar);
                session.activeMemory = newMem;
                const switchEntry = session.history[session.history.length - 1];
                if (switchEntry.kind === "switch") {
                  renderSwitch(switchEntry);
                }
              }
            }
            break;
          }

          // Mark quest as offered — transitions to ESCALATION phase
          case "/quest": {
            const questId = args[0];
            if (!questId) {
              console.log(chalk.red("Usage: /quest <quest-id>"));
            } else {
              setQuestOffered(session, questId);
              console.log(chalk.dim(`[Quest "${questId}" offered — phase: ESCALATION]`));
            }
            break;
          }

          // Debug: show all memory layers
          case "/state":
            renderState(
              playerProfile,
              activePlayerSummary,
              session.activeMemory,
              session.conversationState,
              session.activeCharacter.name
            );
            break;

          // Debug: inspect a specific character's memory
          case "/char": {
            const charName = args[0];
            if (!charName) {
              console.log(chalk.red("Usage: /char <character-name>"));
            } else {
              const { characterMemory: targetMem } = await loadAllMemory(charName);
              renderCharacterMemory(charName, targetMem);
            }
            break;
          }

          // Debug: show current feature scores
          case "/features": {
            const features = extractFeatures(session.history);
            renderConversationFeatures(features, session.conversationState);
            break;
          }

          // Debug: reload memory from disk
          case "/reload": {
            const { characterMemory: reloadedMem, playerSummary: reloadedSummary } =
              await loadAllMemory(session.activeCharacter.name);
            session.activeMemory = reloadedMem;
            activePlayerSummary = reloadedSummary;
            const newEnriched = buildEnrichedSystemPrompt(
              startChar!.systemPrompt,
              reloadedMem,
              reloadedSummary
            );
            session.activeCharacter = { ...session.activeCharacter, systemPrompt: newEnriched };
            const charFile = path2.join(MEMORY_DIR, "characters", `${session.activeCharacter.name}.json`);
            console.log(chalk.dim("Memory reloaded."));
            console.log(chalk.dim(`  player-profile.json  — ${await getFileTimestamp(path2.join(MEMORY_DIR, "player-profile.json"))}`));
            console.log(chalk.dim(`  player-summary.json  — ${await getFileTimestamp(path2.join(MEMORY_DIR, "player-summary.json"))}`));
            console.log(chalk.dim(`  ${session.activeCharacter.name}.json — ${await getFileTimestamp(charFile)}`));
            break;
          }

          // Debug: force termination and run full pipeline
          case "/simulate_accept": {
            console.log(chalk.dim("[SIMULATED] Triggering quest acceptance..."));
            freezeSession(session, "simulate");
            const questId = session.conversationState.questOffered ?? "simulated_quest";
            // Generate a final NPC response
            rl.pause();
            const reply = await sendMessage(session, "[simulate: player accepted quest]");
            if (reply !== "__CONNECTION_ERROR__") {
              const lastEntry = session.history[session.history.length - 1];
              if (lastEntry.kind === "message") {
                process.stdout.write(chalk.dim("[SIMULATED] "));
                renderMessage(lastEntry);
              }
            }
            await runWithNotification(session, questId);
            await handleExit(false);
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

        // Auto-detect quest offer in NPC response when conversation is still ACTIVE
        const phase = session.conversationState.phase;
        if (phase === "ACTIVE") {
          const { offered, questId } = await detectQuestOffer(
            reply,
            session.activeCharacter.name,
            session.activeMemory.progression.questLevel
          );
          if (offered) {
            setQuestOffered(session, questId);
            console.log(chalk.dim(`[Quest detected: "${questId}" — phase: ESCALATION]`));
          }
        }

        // Check for quest acceptance if in ESCALATION or DECISION phase
        if (phase === "ESCALATION" || phase === "DECISION") {
          const questContext = session.conversationState.questOffered ?? "the task";
          const { accepted, reason } = await detectAcceptance(input, questContext);

          if (accepted) {
            freezeSession(session, reason === "none" ? null : reason);
            console.log(chalk.dim(`\n[Quest accepted via ${reason} trigger — ending conversation]`));

            // Generate final NPC confirmation response
            const confirmReply = await sendMessage(
              session,
              "[system: player accepted the quest. Give a brief, in-character confirmation.]"
            );
            if (confirmReply !== "__CONNECTION_ERROR__") {
              const confirmEntry = session.history[session.history.length - 1];
              if (confirmEntry.kind === "message") {
                renderMessage(confirmEntry);
              }
            }

            const questId = session.conversationState.questOffered ?? "unknown_quest";
            await runWithNotification(session, questId);
            await handleExit(false);
            return;
          }

          // Transition to DECISION if NPC has spoken and player responded
          if (phase === "ESCALATION") {
            session.conversationState.phase = "DECISION";
          }
        }
      }

      rl.resume();
      rl.prompt();
    })();
  });
}

main().catch((err) => {
  console.error(chalk.red("Fatal error:"), err);
  process.exit(1);
});
