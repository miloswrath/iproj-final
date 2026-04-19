# Feature -> Dungeon Sandbox + First Combat Slice

## Required Context Files

- [docs/feat/CONSTITUTION.md](docs/feat/CONSTITUTION.md)
- [MECHANICS-CONSTITUTION.txt](MECHANICS-CONSTITUTION.txt)
- [docs/game-design/game-functionality.md](docs/game-design/game-functionality.md)

## Requirements

- Build a dungeon sandbox scene intended for repeated mechanics testing.
- Generate dungeon layout randomly on each dungeon entry (or explicit regenerate action).
- Ensure generated layouts always produce a valid playable space and at least one encounter trigger.
- Implement a minimal player turn menu with exactly two actions: Attack and Defend.
- Add one enemy with fixed stats and basic enemy turn behavior.
- Resolve encounter to explicit result states: victory or defeat.
- Return player from combat to dungeon sandbox with encounter marked complete on victory.
- Allow player to return from dungeon to overworld after combat resolution.
- Keep this feature mechanics-only and scoped to sandbox testing plus one playable combat loop.

## Out Of Scope

- Quest/NPC contract system wiring.
- Loot tables, economy balancing, or itemization depth.
- Multiple enemy parties, status systems, abilities, or initiative tuning.
- Narrative dialogue content and cutscene logic.

## Implementation Plan

### ***Checkpoint 1: Dungeon Sandbox Generation Setup***

- [ ] Add a dungeon sandbox scene that supports repeated test runs.
- [ ] Implement basic random layout generation (seeded or unseeded) for walkable area and blockers.
- [ ] Place at least one encounter trigger into valid generated space.
- [ ] Add combat scene entry payload (player/enemy seed stats and return context).
- [ ] Confirm each generated layout is playable and collision-safe.
- **Test**: Player can enter dungeon sandbox multiple times and get valid random layouts with reachable encounter trigger(s).

### ***Checkpoint 2: Turn-Based Combat Core (Attack/Defend)***

- [ ] Build combat scene UI panel showing player HP, enemy HP, and turn state.
- [ ] Implement player actions: Attack (deal fixed damage) and Defend (reduce incoming damage this turn).
- [ ] Implement enemy turn with deterministic attack behavior.
- [ ] Add round resolution and win/lose checks.
- **Test**: Combat proceeds in strict turns, both actions function, and battle ends in deterministic win/lose state.

### ***Checkpoint 3: Post-Combat Return + Slice Validation***

- [ ] Return to dungeon sandbox on victory with encounter disabled and clear completion indicator.
- [ ] Return to overworld from dungeon with a visible completion state marker.
- [ ] Add fail flow for defeat that resets to overworld entry point.
- [ ] Add a sandbox regenerate path (re-enter dungeon or explicit regenerate input/button) for fast iteration.
- [ ] Document run/test steps in README for this slice.
- **Test**: Full loop runs end-to-end: overworld -> random dungeon sandbox -> encounter -> combat -> sandbox/overworld resolution without blocking bugs.

## Success Criteria

- Player can complete at least one full combat loop from overworld to post-combat return in under 2 minutes.
- Combat choices produce different outcomes (Attack vs Defend) in at least one round.
- Dungeon generation produces varied layouts across repeated test runs while staying playable.
- No missing asset or scene-transition errors occur during the loop.
- Feature remains isolated from story systems and advanced progression systems.
