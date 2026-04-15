# Research: Local LLM Chat API with Terminal UI

**Feature**: `specs/001-local-llm-chat-api` | **Date**: 2026-04-14

---

## LLM Client

**Decision**: `openai` npm SDK (`^4.x`)  
**Rationale**: LM Studio exposes an OpenAI-compatible `/v1/chat/completions` endpoint. The SDK accepts a `baseURL` constructor option, making it a drop-in client with zero adapter code. It provides typed request/response shapes, error handling, and streaming support (unused in first pass but available).  
**Alternatives considered**:
- Raw `fetch` — would replicate a subset of the SDK at the cost of more boilerplate and no type safety
- `axios` — adds a dependency without advantage over the SDK for this use case

**Configuration**:
```ts
new OpenAI({ baseURL: "http://localhost:1234/v1", apiKey: "lm-studio" })
```
LM Studio ignores the API key but the SDK requires a non-empty string.

---

## Terminal UI

**Decision**: `readline` (Node built-in) + `chalk ^5.x`  
**Rationale**: The interaction surface is a single-prompt chat loop. `readline.Interface` handles line input, history (arrow keys), and SIGINT cleanly with zero dependencies. `chalk` provides color differentiation between user input, assistant responses, system events, and errors.  
**Alternatives considered**:
- `ink` (React for terminal) — appropriate for complex TUI layouts; overkill for a chat loop, adds React as a dependency
- `blessed` / `neo-blessed` — full-featured TUI, heavy and poorly maintained
- `inquirer` — form/prompt focused, not suited for a persistent chat loop

---

## Module System

**Decision**: ESM (`"type": "module"`, `module: NodeNext`)  
**Rationale**: `chalk ^5.x` is ESM-only. Node 20 has first-class ESM support. Greenfield project — no legacy CJS constraints.  
**Alternatives considered**:
- CJS with `chalk ^4.x` — works but pins to an older major; inconsistent with Node 20 best practices

---

## Development Runner

**Decision**: `tsx ^4.x`  
**Rationale**: Executes TypeScript directly without a build step in development. Faster startup than `ts-node`, handles ESM correctly, requires no special tsconfig flags.  
**Alternatives considered**:
- `ts-node` — slower, requires `--esm` flag and additional config for NodeNext resolution
- Compile-then-run — adds friction to the dev loop

---

## History Model

**Decision**: Single `HistoryEntry[]` discriminated union (messages + switch events)  
**Rationale**: Keeps events in correct chronological order without a merge step. The `/history` command replays entries in insertion order. Switch events and messages are handled by branching on `entry.kind`. The API request builder filters to `kind: "message"` only.  
**Alternatives considered**:
- Two separate arrays (messages[], switches[]) — requires timestamp-based merge to reconstruct order for `/history`
- Single flat `Message[]` with a synthetic "system" switch entry — conflates LLM-bound messages with UI events

---

## Prompt Loading Strategy

**Decision**: Eager load all prompts at startup via `fs.readFileSync`  
**Rationale**: There are 6 prompt files, each small (<2KB). Loading once at startup simplifies `sendMessage` (no async file I/O in the hot path) and makes the character list immediately available for `/list` and startup display.  
**Alternatives considered**:
- Lazy load on first use — no meaningful benefit given file count and size; adds async complexity to character switching

---

## Path Resolution (ESM)

**Decision**: `fileURLToPath(import.meta.url)` + `path.resolve`  
**Rationale**: `__dirname` is not available in ESM. `import.meta.url` is the ESM equivalent. Both `ai/src/` (tsx dev) and `ai/dist/` (compiled) are one level below `ai/`, so `path.resolve(__dirname, "../docs/prompts")` is correct from both locations.
