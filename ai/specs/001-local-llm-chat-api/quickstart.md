# Quickstart: AI Companions Terminal Chat

**Feature**: `specs/001-local-llm-chat-api`

---

## Prerequisites

1. **LM Studio** installed and running
   - Open LM Studio → **Local Server** tab
   - Load a model (any chat model works)
   - Click **Start Server** — it should bind to `localhost:1234`

2. **Node.js 20+** — available via the project's Nix devenv shell:
   ```bash
   # From the repo root, enter the dev shell
   nix develop
   # or if using direnv:
   cd /home/zak/school/sp26/cs/final
   direnv allow
   ```

3. **pnpm** — included in the devenv shell

---

## Install & Run

```bash
cd ai/
pnpm install
pnpm dev
```

`pnpm dev` runs `tsx src/index.ts` directly — no build step needed during development.

---

## First Session

```
AI Companions - Terminal Chat
Available characters: enabler, general, honest, mirror, opportunist, parasite
Starting character (default: general): enabler

> _
```

Type a message and press Enter. Use `/help` to see all commands.

---

## Compiled Run

```bash
cd ai/
pnpm build         # outputs to ai/dist/
node dist/index.js
```

---

## Common Issues

| Symptom | Fix |
|---------|-----|
| `error: LM Studio is not running at localhost:1234` | Open LM Studio, load a model, start the local server |
| `pnpm: command not found` | Enter the devenv shell first (`nix develop` or `direnv allow`) |
| Response is off-topic or ignores character | Check LM Studio has a **chat** model loaded (not a base/completion model) |
