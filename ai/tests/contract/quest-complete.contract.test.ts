import test from "node:test";
import assert from "node:assert/strict";
import { runQuestCompletionPipeline } from "../../src/lifecycle/pipeline.js";
import { createSession } from "../../src/session.js";
import { defaultCharacterMemory } from "../../src/memory/store.js";
import { buildQuestCompletion } from "../helpers/outcome-builders.js";

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
