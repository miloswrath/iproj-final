# Contract: Dungeon Debug Controls (Playtest Runtime)

**Feature**: 006-dungeon-debug-leveling  
**Owner**: `game/src/game/scenes/DungeonScene.js`  
**Scope**: Temporary development/playtest controls in dungeon runtime

---

## 1) Supported debug actions

The dungeon scene exposes exactly three temporary debug actions:

1. `kill_all_enemies`
2. `open_all_chests`
3. `skip_to_next_floor`

These actions are local runtime controls and are **not** part of public/player release UX.

Current temporary key mapping in `DungeonScene`:

- `F6` → `kill_all_enemies`
- `F7` → `open_all_chests`
- `F8` → `skip_to_next_floor`

---

## 2) Behavioral requirements

### `kill_all_enemies`
- Applies only to active enemies on the current floor.
- Marks enemies as defeated in the same state pathways used by normal combat resolution where possible.
- Updates quest-run enemy defeat totals only once per enemy.
- Repeated triggering after enemies are already cleared is a safe no-op.

### `open_all_chests`
- Applies only to unopened chests on the current floor.
- Uses existing chest reward logic.
- Already opened chests must not grant rewards again.

### `skip_to_next_floor`
- Is only actionable during an active quest run.
- Uses normal floor completion/transition behavior after force-clearing remaining enemy and chest blockers on the current floor.
- Must run required progression updates normally expected on floor completion.
- On final floor, behavior follows existing quest-run terminal handling.

---

## 3) Invalid-context handling

If invoked when there is no valid active dungeon floor state:
- Action returns/applies as no-op.
- Runtime remains stable (no crashes, no partial state writes).
- Scene-local debug feedback is shown and then cleared automatically.

---

## 4) Safety and removal contract

- Debug controls must be encapsulated to scene-local wiring for easy future removal.
- Non-debug gameplay behavior is unchanged when controls are not invoked.
- No direct writes from debug controls to AI memory files.

---

## 5) Minimum verification

1. Each action succeeds in valid dungeon context.
2. `open_all_chests` never duplicates rewards.
3. `skip_to_next_floor` preserves normal progression invariants.
4. Invalid-context invocation does not corrupt state.
5. Removing/disabling debug keybinds does not affect normal dungeon traversal.
