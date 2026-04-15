# CLI Command Contract

**Feature**: `specs/001-local-llm-chat-api` | **Date**: 2026-04-14

The terminal UI accepts input at a `> ` prompt. Any line not starting with `/` is treated as a chat message to the active character.

---

## Startup Sequence

```
AI Companions - Terminal Chat
Available characters: enabler, general, honest, mirror, opportunist, parasite
Starting character (default: general): _
```

- User types a character name and presses Enter, or presses Enter to accept `general`
- Unknown name at startup: re-prompt once, then default to `general`

---

## Commands

### Free text (chat message)

**Input**: any line not beginning with `/`  
**Effect**: sends the text to the active character via the LLM API  
**Output**:
```
> <characterName>: <response text>
```
Response text is printed in green. User input is printed in cyan at the prompt.

**Error (model unreachable)**:
```
> error: LM Studio is not running at localhost:1234. Start LM Studio and load a model, then try again.
```

---

### `/switch <name>`

**Effect**: changes the active character; the new system prompt takes effect on the next message  
**Output** (success):
```
--- switched from <from> to <to> ---
```
Printed in yellow. Appended to history as a `kind: "switch"` entry.

**Output** (missing argument):
```
Usage: /switch <character-name>
```

**Output** (unknown name):
```
Unknown character: <name>. Use /list to see available characters.
```

---

### `/list`

**Effect**: prints all available characters derived from `docs/prompts/`  
**Output**:
```
Available characters:
  • enabler
  • general
  • honest
  • mirror
  • opportunist
  • parasite
```

---

### `/history`

**Effect**: replays the full session log from the beginning  
**Output**: each entry rendered in order —
- `kind: "message"` → same format as live messages
- `kind: "switch"` → yellow switch divider

```
> you: hello
> enabler: Hey, I'm so glad you came to me...
--- switched from enabler to mirror ---
> you: what do you think?
> mirror: What do *you* think?
```

---

### `/help`

**Effect**: prints a command reference  
**Output**:
```
Commands:
  /switch <name>  — change the active character
  /list           — show available characters
  /history        — replay full session log
  /help           — show this help
  /quit           — exit
  Ctrl+C          — exit
  <anything else> — send as a chat message
```

---

### `/quit`

**Effect**: exits the process cleanly  
**Output**:
```
Goodbye.
```
Then `process.exit(0)`.

---

### `Ctrl+C` (SIGINT)

**Effect**: same as `/quit`  
**Output**: same as `/quit`

---

## Rendering Rules

| Context | Color |
|---------|-------|
| Prompt `> ` | cyan |
| User message label `> you:` | cyan |
| Assistant message label `> <character>:` | green |
| Switch divider | yellow |
| Error message | red |
| System text (startup, lists, help) | default |
