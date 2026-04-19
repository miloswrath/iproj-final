# Feature -> Sprint 2 Core Loop Build Kickoff

## Required Context Files

Read these before writing or revising requirements:

- [docs/feat/CONSTITUTION.md](docs/feat/CONSTITUTION.md)
- [MECHANICS-CONSTITUTION.txt](MECHANICS-CONSTITUTION.txt)
- [docs/game-design/game-functionality.md](docs/game-design/game-functionality.md)

## Requirements

- Start converting the sandbox slice into a reusable game loop foundation.
- Keep turn-based combat as the primary gameplay system.
- Preserve stable overworld -> dungeon -> combat -> return flow while adding one lightweight progression layer.
- Add one small but real reward outcome after dungeon success (for example: currency, material, or contract progress).
- Keep scope implementation-first and avoid narrative or dialogue depth in this sprint.

## Out Of Scope

- Story content and cutscene logic.
- Full quest narrative trees.
- Advanced combat systems beyond current attack and defend mechanics.
- Full inventory UI or deep economy balancing.

## Clarification Step (Required)

Before implementation planning:

1. Select exactly one progression seed for Sprint 2: currency, materials, or contract progress counter.
2. Define expected post-run outcome data and where it is displayed.
3. Confirm whether dungeon run failure also updates progression data (for example, partial reward or none).
4. Rewrite requirements with resolved details and no vague language.
5. Re-check against all three context files above to ensure alignment.

## Places To Start (Recommended Order)

1. Stabilize flow state model:
   Define one shared run result payload so overworld, dungeon, and combat can exchange run outcomes predictably.

2. Implement minimum progression seed:
   Add one reward type only, keep data persistence simple, and show result in overworld HUD.

3. Add dungeon completion bookkeeping:
   Track dungeon run start, success, failure, and returned reward outcome in one place.

4. Improve combat readability only where it affects decisions:
   Keep mechanics unchanged, but ensure turn, damage, and result are unmistakable.

5. Create smoke-playtest checklist:
   Define repeatable tests for 3 full loops to protect future feature additions.

## Implementation Plan

Use short checkpoints that can be completed and committed independently.

### ***Checkpoint 1: Loop State Foundation***

- [ ] Define a shared run state payload for scene transitions.
- [ ] Standardize success/failure outcome fields and return context.
- [ ] Add simple debug-safe logging for scene transition payload integrity.
- **Test**: Run 5 transitions and confirm payload shape remains consistent across overworld, dungeon, and combat.

### ***Checkpoint 2: Minimum Progression Seed***

- [ ] Implement one reward outcome on dungeon success.
- [ ] Add overworld display of current reward total/progress.
- [ ] Ensure failure path behaves by clarified rules (no reward or reduced reward).
- **Test**: Complete 3 success runs and 2 failure runs; verify progression values update correctly each time.

### ***Checkpoint 3: Loop Hardening For Real Build***

- [ ] Add repeatable smoke test checklist for full loop validation.
- [ ] Remove leftover placeholder debug text not needed for regular playtests.
- [ ] Update README with Sprint 2 run validation steps.
- **Test**: Execute 3 end-to-end loops with no transition errors, no missing state, and expected progression outcomes.

## Success Criteria

- Player can complete a full loop and receive a visible progression outcome within 2 minutes.
- Scene transition payloads are stable and consistent in all tested loops.
- Failure and success paths produce deterministic progression behavior.
- Sprint 2 codebase is ready to accept additional systems without refactoring core loop flow.

## Scope Guardrails

- Keep Sprint 2 limited to one progression seed only.
- Keep current combat rules unchanged unless required for clarity.
- Do not add narrative dependencies.
- Each checkpoint must end with a verifiable test step.
