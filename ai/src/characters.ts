import fs from "fs";
import path from "path";
import type { Character } from "./types.js";

export function loadCharacters(promptsDir: string): Character[] {
  const files = fs
    .readdirSync(promptsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const generalFile = files.find((file) => path.basename(file, ".md") === "general");
  const generalPrompt = generalFile
    ? fs.readFileSync(path.join(promptsDir, generalFile), "utf-8")
    : "";

  return files.map((file) => {
    const promptPath = path.join(promptsDir, file);
    const promptName = path.basename(file, ".md");
    const promptBody = fs.readFileSync(promptPath, "utf-8");

    return {
      name: promptName,
      promptPath,
      systemPrompt:
        promptName === "general" || !generalPrompt
          ? promptBody
          : `${generalPrompt}\n\n${promptBody}`,
    };
  });
}

export function findCharacter(
  characters: Character[],
  name: string
): Character | undefined {
  return characters.find((c) => c.name.toLowerCase() === name.toLowerCase());
}
