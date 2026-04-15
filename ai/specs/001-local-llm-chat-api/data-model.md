# Data Model: Local LLM Chat API with Terminal UI

**Feature**: `specs/001-local-llm-chat-api` | **Date**: 2026-04-14  
**Source**: `ai/src/types.ts`

---

## Entities

### Message

A single turn sent to or received from the LLM API. Used to build the request payload.

| Field | Type | Description |
|-------|------|-------------|
| `role` | `"system" \| "user" \| "assistant"` | OpenAI-compatible role |
| `content` | `string` | Text content of the message |

**Validation**: `content` must be non-empty before sending. `role: "system"` is only used for the injected character prompt — never stored in `HistoryEntry`.

---

### Character

A loaded companion archetype. Derived from a prompt file in `docs/prompts/`.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Lowercase filename stem (e.g. `"enabler"`) |
| `promptPath` | `string` | Absolute path to the `.md` file |
| `systemPrompt` | `string` | Full file contents, loaded once at startup |

**Derivation**: `name` = `path.basename(file, ".md")`. `systemPrompt` = `fs.readFileSync(promptPath, "utf-8")`.

**Available characters** (from `docs/prompts/`):

| Name | File |
|------|------|
| `enabler` | `enabler.md` |
| `general` | `general.md` |
| `honest` | `honest.md` |
| `mirror` | `mirror.md` |
| `opportunist` | `opportunist.md` |
| `parasite` | `parasite.md` |

---

### HistoryEntry (discriminated union)

An append-only log entry. Can be a chat message or a character switch event.

#### `kind: "message"`

| Field | Type | Description |
|-------|------|-------------|
| `kind` | `"message"` | Discriminant |
| `role` | `"user" \| "assistant"` | Who sent the message |
| `characterName` | `string` | Active character name at the time (for assistant turns) |
| `content` | `string` | Message text |
| `timestamp` | `Date` | Wall-clock time of the event |

#### `kind: "switch"`

| Field | Type | Description |
|-------|------|-------------|
| `kind` | `"switch"` | Discriminant |
| `from` | `string` | Character name before switch |
| `to` | `string` | Character name after switch |
| `timestamp` | `Date` | Wall-clock time of the switch |

---

### Session

Runtime state for one CLI execution. Created at startup, discarded on exit.

| Field | Type | Description |
|-------|------|-------------|
| `activeCharacter` | `Character` | Currently selected character |
| `history` | `HistoryEntry[]` | Ordered log of all messages and switch events |

**Lifecycle**: Created by `createSession(character)`. Mutated by `appendMessage()` and `appendSwitch()`. Destroyed when the process exits (no persistence).

---

## State Transitions

```
startup
  └─ loadCharacters() → Character[]
  └─ user picks character → createSession(character)
        │
        ├─ user sends text → appendMessage(user) → sendMessage() → appendMessage(assistant)
        │
        ├─ /switch <name> → appendSwitch(from, to) + update session.activeCharacter
        │
        └─ /quit or Ctrl+C → process exits
```

---

## API Request Construction

On each `sendMessage` call, the request payload is assembled fresh from session state:

```
[
  { role: "system",    content: session.activeCharacter.systemPrompt },
  { role: "user",      content: <turn 1 user> },
  { role: "assistant", content: <turn 1 assistant> },
  ...
  { role: "user",      content: <new message> }   ← appended last
]
```

`getHistoryMessages()` filters `history` to `kind: "message"` entries only, maps to `{ role, content }`. Switch events are excluded from the API payload — the current `activeCharacter.systemPrompt` at call time reflects any prior switch.
