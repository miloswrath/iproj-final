# Feature Spec: Local LLM Chat API with Terminal UI

**Feature Directory**: `specs/001-local-llm-chat-api`
**Branch**: `1-finalize-story`
**Created**: 2026-04-14
**Status**: Draft

---

## Overview

A developer-facing interface for interacting with locally running language model characters from the narrative game. The system injects authored character prompts automatically and maintains conversation history, allowing the developer/tester to chat with any character via a terminal UI and switch between characters on the fly.

---

## Problem Statement

Currently there is no unified way to test or interact with the game's AI companion characters outside of the full game runtime. Developers need a lightweight, direct way to converse with each character, verify prompt behavior, and review conversation history — without launching the game.

---

## Goals

- Enable interactive, prompt-injected conversations with each game companion character
- Persist and display chat history per session
- Allow switching between characters without restarting the interface
- Provide a clean terminal experience for testing companion dialogue

---

## Non-Goals

- This is not a production player-facing interface
- No game state simulation (desperation, hope, burnout variables) in the first pass
- No persistent storage across sessions (history is in-memory per session)
- No multiplayer or shared session support

---

## User Scenarios & Testing

### Primary Actor: Developer / Tester

**Scenario 1 — Start a session with a character**
1. Developer launches the terminal UI
2. A list of available characters is displayed
3. Developer selects a character (e.g., "enabler")
4. The system loads the character's prompt from `docs/prompts/`
5. Developer types a message and receives a response in character

**Scenario 2 — Switch characters mid-session**
1. Developer is in conversation with one character
2. Developer invokes the switch command (e.g., `/switch mirror`)
3. The system loads the new character's prompt
4. Conversation continues with the new character; history is preserved but visually distinguished

**Scenario 3 — Review conversation history**
1. Developer scrolls up (or invokes a history command) to review the full chat log
2. Messages are labeled by sender (user / character name)
3. Character switches are marked in the log

**Scenario 4 — Exit gracefully**
1. Developer types `/quit` or presses Ctrl+C
2. Session ends cleanly

---

## Functional Requirements

### API Layer

1. The API must accept a chat message and return a model response from the locally running LLM service at `localhost:1234`
2. On each request, the API must prepend the selected character's system prompt (loaded from `docs/prompts/<character>.md`) to the conversation context
3. The API must maintain a running chat history for the current session and include it in each request for context continuity
4. The API must support selecting which character prompt is active
5. The API must expose a way to list available characters (derived from files present in `docs/prompts/`)
6. All API logic must be implemented in TypeScript

### Terminal UI

7. The terminal UI must display an interactive chat prompt where the developer can type messages
8. The terminal UI must render model responses clearly, distinguishing them from user input
9. The terminal UI must support a `/switch <character>` command to change the active character
10. The terminal UI must support a `/list` command to show available characters
11. The terminal UI must support a `/history` command (or equivalent scroll) to review the current session's chat log
12. The terminal UI must support `/quit` or `Ctrl+C` to exit cleanly
13. Character switch events must be visually indicated in the chat log

---

## Success Criteria

1. A developer can start a conversation with any character within 5 seconds of launching the tool
2. Every model response reflects the selected character's system prompt (verified by prompt-consistent tone)
3. Switching characters takes effect on the next message with no restart required
4. The full conversation history for the session is visible and correctly attributed
5. The tool handles the local model being unavailable with a clear, readable error message
6. A developer unfamiliar with the codebase can navigate all features using in-terminal help text alone

---

## Key Entities

| Entity | Description |
|--------|-------------|
| Character | A named companion with an associated system prompt file in `docs/prompts/` |
| Message | A single turn in the conversation (role: user or assistant) |
| Session | A single run of the terminal UI; holds the active character and full message history |
| ChatHistory | The ordered list of messages in the current session |

---

## Dependencies

- A locally running LLM server compatible with the OpenAI chat completions API format at `localhost:1234`
- Character prompt files present in `docs/prompts/` (currently: enabler, general, honest, mirror, opportunist, parasite)

---

## Assumptions

- The local LLM server exposes an OpenAI-compatible `/v1/chat/completions` endpoint (standard for LM Studio and similar tools)
- Character prompt files are named `<character-name>.md` and contain the full system prompt as plain text
- First pass does not need to inject game state variables into the prompt; static prompt injection is sufficient
- A single active character per session is sufficient (no multi-character simultaneous chat)
- Chat history is in-memory only; no file persistence is required for the first pass
