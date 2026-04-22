import test from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { runQuestCompletionPipeline } from "../../src/lifecycle/pipeline.js";
import { createSession } from "../../src/session.js";
import { defaultCharacterMemory, MEMORY_DIR, readJson } from "../../src/memory/store.js";
import { withMemoryIsolation } from "../helpers/runtime-harness.js";
import { buildQuestCompletion } from "../helpers/outcome-builders.js";
import type { CharacterMemory } from "../../src/types.js";

const character = {
  name: "enabler",
  promptPath: "",
  systemPrompt: "",
};

const charFile = path.join(MEMORY_DIR, "characters", "enabler.json");

test("duplicate completion event is ignored", async () => {
  await withMemoryIsolation(async () => {
    const session = createSession(character, defaultCharacterMemory());
    const baselineMemory = (await readJson<CharacterMemory>(charFile)) ?? defaultCharacterMemory();
    const payload = buildQuestCompletion({ eventTimestamp: "same-event" });

    const first = await runQuestCompletionPipeline(session, payload);
    const second = await runQuestCompletionPipeline(session, payload);

    assert.equal(first.applied, true);
    assert.equal(second.applied, false);
    assert.equal(second.reason, "duplicate");

    const memory = await readJson<CharacterMemory>(charFile);
    assert.ok(memory);
    assert.equal(memory.progression.questLevel, baselineMemory.progression.questLevel + 1);
    assert.equal(memory.keyMemories.length, Math.min(baselineMemory.keyMemories.length + 1, 5));
  });
});
