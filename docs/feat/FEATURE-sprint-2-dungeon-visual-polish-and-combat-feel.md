# Feature -> Sprint 2 Dungeon Visual Polish And Combat Feel

## Required Context Files

Read these before writing or revising requirements:

- [docs/feat/CONSTITUTION.md](docs/feat/CONSTITUTION.md)
- [MECHANICS-CONSTITUTION.txt](MECHANICS-CONSTITUTION.txt)
- [docs/game-design/game-functionality.md](docs/game-design/game-functionality.md)

## Requirements

- Improve dungeon presentation so layouts read as intentional rooms and spaces, not noisy tile scatter.
- Add clear room identity types (for example: storage, ritual, flooded, and corridor utility) with distinct prop rules per type.
- Improve combat visual feedback for attack and defend actions using readable UI cues and animation timing.
- Keep the same core battle mechanics from Sprint 1 (Attack/Defend only, deterministic enemy behavior).
- Maintain current overworld <-> dungeon <-> combat loop without adding story or progression systems.

## Out Of Scope

- New combat mechanics (status effects, abilities, initiative systems, multi-enemy parties).
- Economy, loot, inventory, or progression systems.
- Narrative dialogue and quest integration.
- Final content balancing.

## Clarification Step (Required)

Before implementation planning:

1. Confirm target art direction for dungeon room motifs and contrast/readability goals.
2. Confirm combat feel priorities order: responsiveness, readability, animation style, UI density.
3. Confirm technical limits for this sprint (FPS target, maximum draw complexity, and acceptable asset memory growth).
4. Rewrite requirements with resolved details and no vague language.
5. Re-check against all three context files above to ensure alignment.

## Implementation Plan

Use short checkpoints that can be completed and committed independently.

### ***Checkpoint 1: Dungeon Visual Identity Pass***

- [ ] Introduce room-type tagging during generation (storage, ritual, flooded, corridor utility).
- [ ] Apply room-specific prop placement rules with spacing constraints to avoid clutter.
- [ ] Improve floor/wall selection logic so room boundaries are visually readable.
- [ ] Add depth layering and HUD visibility safeguards to avoid overlap artifacts.
- **Test**: Generate 10 layouts and verify each contains recognizable room identity zones and readable movement paths.

### ***Checkpoint 2: Combat Feel Pass***

- [ ] Add player and enemy hit feedback (flash, shake, or pop animation) tied to attack resolution.
- [ ] Add defend feedback state (temporary guard visual and clear damage reduction cue).
- [ ] Add HP bar visualization and clearer turn-state messaging.
- [ ] Tune turn timing delays so actions feel responsive while staying readable.
- **Test**: Complete 5 combats and confirm every action has immediate visual feedback and understandable result state.

### ***Checkpoint 3: Readability And Playtest Hardening***

- [ ] Add a short visual settings/readability checklist for dungeon and combat scenes.
- [ ] Validate sprint and traversal readability across large sandbox maps.
- [ ] Update README playtest steps for Sprint 2 checks.
- [ ] Run end-to-end loop verification (overworld -> dungeon -> encounter -> combat -> return).
- **Test**: Execute full loop 3 times with no blocked transitions and no unreadable HUD or visual overlap issues.

## Success Criteria

- At least 80% of generated layouts show clearly distinguishable room identities in quick visual review.
- Combat actions are visually understood in under 1 second by tester feedback.
- End-to-end loop remains stable with no transition regressions introduced by visual changes.
- HUD remains readable over all tested dungeon room backgrounds.

## Scope Guardrails

- Checkpoints should be small enough to be separate commits.
- Each checkpoint must include a test/validation step.
- Keep architecture and file structure consistent with the current project.
- Avoid adding narrative/story dependencies unless the feature explicitly requires them.
