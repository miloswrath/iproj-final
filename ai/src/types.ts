export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Character {
  name: string;
  promptPath: string;
  systemPrompt: string;
}

export type HistoryEntry =
  | {
      kind: "message";
      role: "user" | "assistant";
      characterName: string;
      content: string;
      timestamp: Date;
    }
  | {
      kind: "switch";
      from: string;
      to: string;
      timestamp: Date;
    };

export interface Session {
  activeCharacter: Character;
  history: HistoryEntry[];
}
