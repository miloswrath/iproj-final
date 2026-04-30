import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "path";
import { runQuestCompletionPipeline } from "../../src/lifecycle/pipeline.js";
import { createSession } from "../../src/session.js";
import { defaultCharacterMemory, defaultPlayerProfile, MEMORY_DIR, readJson } from "../../src/memory/store.js";
import { withMemoryIsolation } from "../helpers/runtime-harness.js";
import { buildPlayerProfile, buildQuestCompletion } from "../helpers/outcome-builders.js";
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
      (await readJson<PlayerProfile>(path.join(MEMORY_DIR, "player-profile.json"))) ?? defaultPlayerProfile();

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
    assert.equal(profile.globalCharacterLevel, baselineProfile.globalCharacterLevel + 1);

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
    assert.equal(profile.globalCharacterLevel, baselineProfile.globalCharacterLevel + 1);

    const abandoned = await runQuestCompletionPipeline(
      session,
      buildQuestCompletion({ outcome: "abandoned", eventTimestamp: "3" })
    );
    assert.equal(abandoned.applied, true);
    memory = await readJson<CharacterMemory>(charPath("enabler"));
    profile = await readJson<PlayerProfile>(path.join(MEMORY_DIR, "player-profile.json"));
    assert.ok(memory);
    assert.ok(profile);
    assert.equal(memory.progression.questLevel, baselineMemory.progression.questLevel + 1);
    assert.equal(profile.globalCharacterLevel, baselineProfile.globalCharacterLevel + 1);
  });
});

test("legacy profile missing globalCharacterLevel is normalized before success increment", async () => {
  await withMemoryIsolation(async () => {
    const session = createSession(character, defaultCharacterMemory());
    const profilePath = path.join(MEMORY_DIR, "player-profile.json");

    await fs.writeFile(
      profilePath,
      JSON.stringify({
        isolation: 44,
        hope: 61,
        burnout: 21,
        traits: {
          trustsQuickly: 0.4,
          seeksValidation: 0.2,
          skepticism: 0.6,
          riskTolerance: 0.3,
        },
      }, null, 2),
      "utf8"
    );

    const result = await runQuestCompletionPipeline(
      session,
      buildQuestCompletion({ outcome: "success", eventTimestamp: "legacy-success" })
    );

    assert.equal(result.applied, true);

    const profile = await readJson<PlayerProfile>(profilePath);
    assert.ok(profile);
    assert.equal(profile.globalCharacterLevel, 2);
  });
});

test("invalid globalCharacterLevel values are normalized to 1 before persistence updates", async () => {
  await withMemoryIsolation(async () => {
    const session = createSession(character, defaultCharacterMemory());
    const profilePath = path.join(MEMORY_DIR, "player-profile.json");

    await fs.writeFile(
      profilePath,
      JSON.stringify(buildPlayerProfile({ globalCharacterLevel: 0 }), null, 2),
      "utf8"
    );

    const failure = await runQuestCompletionPipeline(
      session,
      buildQuestCompletion({ outcome: "failure", eventTimestamp: "invalid-level-failure" })
    );

    assert.equal(failure.applied, true);

    let profile = await readJson<PlayerProfile>(profilePath);
    assert.ok(profile);
    assert.equal(profile.globalCharacterLevel, 1);

    const success = await runQuestCompletionPipeline(
      session,
      buildQuestCompletion({ outcome: "success", eventTimestamp: "invalid-level-success" })
    );

    assert.equal(success.applied, true);

    profile = await readJson<PlayerProfile>(profilePath);
    assert.ok(profile);
    assert.equal(profile.globalCharacterLevel, 2);
  });
});
