# Contract: Lore Codex Data Schema

**Feature**: 005-quest-dungeon-workflow  
**Consumer**: `game/src/game/ui/LoreCodexOverlay.js` (new)  
**Producer**: `ai/src/server/routes/questCodex.ts` (new)

---

## LoreCodexEntry

```ts
type LoreCodexEntry = {
  questId: string;
  title: string;
  character: string;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
  acceptedAt: string;      // ISO-8601
  completedAt: string|null;
  lore: string|null;
  summary: string;         // required fallback copy
};
```

### Rules

1. `title` MUST be unique in list scope.
2. `summary` MUST be non-empty even when `lore` is null.
3. `acceptedAt` always present.
4. `completedAt` required for terminal statuses.

---

## Endpoint response shape

```ts
type CodexResponse = {
  activeQuest: LoreCodexEntry | null;
  history: LoreCodexEntry[];
  generatedAt: string;
};
```

### Sorting

- `history` sorted newest-first by `completedAt`, then `acceptedAt`.
- `activeQuest` excluded from `history` when `includeActive=false` request option is used.

---

## UI expectations

- UI can render with only `summary` (lore absent is allowed).
- Status badge mapping:
  - `active` -> green
  - `completed` -> gold
  - `failed` -> red
  - `abandoned` -> gray
- Timeline label precedence:
  - terminal quest: `completedAt`
  - active quest: `acceptedAt`

---

## Validation test cases

1. Empty history + active quest null should render an empty-state panel, not crash.
2. Duplicate titles in payload are rejected at bridge layer.
3. Null lore with present summary renders correctly.
4. `completedAt=null` for completed status is rejected as invalid.
