# Contract: Player Profile Global Character Level

**Feature**: 006-dungeon-debug-leveling  
**Owner**: `ai/src/memory/store.ts`, `ai/src/lifecycle/pipeline.ts`, `ai/src/types.ts`  
**Storage**: `/home/zak/school/sp26/cs/final/ai/memory/player-profile.json`

---

## 1) Profile schema extension

`player-profile.json` includes a new persistent field:

```json
{
  "globalCharacterLevel": 1
}
```

This field coexists with existing profile metrics (`isolation`, `hope`, `burnout`, `traits`).

---

## 2) Validation and normalization

`globalCharacterLevel` rules:
- Type: integer
- Minimum: `1`
- Required at runtime after load normalization

If value is missing, null, non-numeric, non-integer, or `< 1`, the loader normalizes it to `1`.

---

## 3) Increment trigger contract

On newly applied quest completion events with `outcome = success`:
- `globalCharacterLevel` increments by exactly `+1`.
- Increment and profile persistence occur within existing completion processing flow.

No increment occurs for `failure` or `abandoned` outcomes.

---

## 4) Idempotency contract

Duplicate quest completion events must not cause additional increments.

The level increment follows existing quest-completion idempotency checks so a replayed event is treated as already processed.

---

## 5) Compatibility contract

- Existing profiles without `globalCharacterLevel` remain loadable.
- Upgraded profiles retain all pre-existing fields.
- Persistence remains JSON-based in the existing memory directory.

---

## 6) Minimum verification

1. Legacy profile with no field loads as `globalCharacterLevel = 1`.
2. One successful completion increments level by exactly 1.
3. Level persists across process restart.
4. Failure/abandoned completion does not increment level.
5. Duplicate completion payload does not double-increment.
