import test from "node:test";
import assert from "node:assert/strict";
import { runQuestCompletionPipeline } from "../../src/lifecycle/pipeline.js";
import { createSession } from "../../src/session.js";
import { defaultCharacterMemory, loadAllMemory } from "../../src/memory/store.js";
import { buildQuestCompletion } from "../helpers/outcome-builders.js";
import { withMemoryIsolation } from "../helpers/runtime-harness.js";

const character = {
  name: "enabler",
  promptPath: "",
  systemPrompt: "",
};

test("quest completion payload rejects missing questId", async () => {
  const session = createSession(character, defaultCharacterMemory());
  const result = await runQuestCompletionPipeline(
    session,
    buildQuestCompletion({ questId: "" })
  );

  assert.equal(result.applied, false);
  assert.equal(result.reason, "invalid");
});

test("quest completion payload rejects invalid outcome", async () => {
  const session = createSession(character, defaultCharacterMemory());
  const result = await runQuestCompletionPipeline(
    session,
    {
      ...buildQuestCompletion(),
      outcome: "weird" as never,
    }
  );

  assert.equal(result.applied, false);
  assert.equal(result.reason, "invalid");
});

test("quest completion payload accepts success outcome and applies level-aware profile updates", async () => {
  await withMemoryIsolation(async () => {
    const session = createSession(character, defaultCharacterMemory());
    const before = await loadAllMemory(character.name);

    const result = await runQuestCompletionPipeline(
      session,
      buildQuestCompletion({ outcome: "success", eventTimestamp: "contract-success" })
    );

    const after = await loadAllMemory(character.name);

    assert.equal(result.applied, true);
    assert.equal(
      after.playerProfile.globalCharacterLevel,
      before.playerProfile.globalCharacterLevel + 1
    );
  });
});
