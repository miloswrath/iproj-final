import test from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { runQuestCompletionPipeline } from "../../src/lifecycle/pipeline.js";
import { createSession } from "../../src/session.js";
import { defaultCharacterMemory, MEMORY_DIR, readJson } from "../../src/memory/store.js";
import { withMemoryIsolation } from "../helpers/runtime-harness.js";
import { buildQuestCompletion } from "../helpers/outcome-builders.js";
import type { CharacterMemory, PlayerProfile } from "../../src/types.js";

const character = {
  name: "enabler",
  promptPath: "",
  systemPrompt: "",
};

function charPath(name: string): string {
  return path.join(MEMORY_DIR, "characters", `${name}.json`);
}

test("success/failure/abandoned outcomes mutate memory as expected", async () => {
  await withMemoryIsolation(async () => {
    const session = createSession(character, defaultCharacterMemory());

    const baselineMemory =
      (await readJson<CharacterMemory>(charPath("enabler"))) ?? defaultCharacterMemory();

    const baselineProfile =
      (await readJson<PlayerProfile>(path.join(MEMORY_DIR, "player-profile.json"))) ?? {
        isolation: 50,
        hope: 50,
        burnout: 30,
        traits: {
          trustsQuickly: 0.5,
          seeksValidation: 0.5,
          skepticism: 0.5,
          riskTolerance: 0.5,
        },
      };

    const success = await runQuestCompletionPipeline(
      session,
      buildQuestCompletion({ outcome: "success", rewardReceived: false, eventTimestamp: "1" })
    );
    assert.equal(success.applied, true);

    let memory = await readJson<CharacterMemory>(charPath("enabler"));
    let profile = await readJson<PlayerProfile>(path.join(MEMORY_DIR, "player-profile.json"));
    assert.ok(memory);
    assert.ok(profile);
    assert.equal(memory.progression.questLevel, baselineMemory.progression.questLevel + 1);
    assert.equal(memory.flags.recentSuccess, true);
    assert.equal(memory.flags.playerNoticedRewardMismatch, true);
    assert.ok(memory.keyMemories.at(-1)?.includes("succeeded"));
    assert.equal(profile.hope > baselineProfile.hope, true);

    const failure = await runQuestCompletionPipeline(
      session,
      buildQuestCompletion({ outcome: "failure", rewardReceived: true, eventTimestamp: "2" })
    );
    assert.equal(failure.applied, true);

    memory = await readJson<CharacterMemory>(charPath("enabler"));
    profile = await readJson<PlayerProfile>(path.join(MEMORY_DIR, "player-profile.json"));
    assert.ok(memory);
    assert.ok(profile);
    assert.equal(memory.progression.questLevel, baselineMemory.progression.questLevel + 1);
    assert.equal(memory.flags.recentFailure, true);
    assert.equal(profile.burnout >= baselineProfile.burnout, true);

    const abandoned = await runQuestCompletionPipeline(
      session,
      buildQuestCompletion({ outcome: "abandoned", eventTimestamp: "3" })
    );
    assert.equal(abandoned.applied, true);
    memory = await readJson<CharacterMemory>(charPath("enabler"));
    assert.ok(memory);
    assert.equal(memory.progression.questLevel, baselineMemory.progression.questLevel + 1);
  });
});
