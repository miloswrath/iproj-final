# Feature -> sprint-2-overworld-environment-lockin

## Required Context Files

Read these before writing or revising requirements:

- [docs/feat/CONSTITUTION.md](docs/feat/CONSTITUTION.md)
- [MECHANICS-CONSTITUTION.txt](MECHANICS-CONSTITUTION.txt)
- [docs/game-design/game-functionality.md](docs/game-design/game-functionality.md)

## Requirements

- Visual direction lock-in: hybrid transition zone where the cat starts in an open field/outskirts area and follows a readable route toward the city entry as the primary objective.
- Sprint 2 target area size: hero zone plus one micro extension branch for optional exploration/readability contrast.
- Build one polished handcrafted overworld zone that will be reused as the reference baseline for future overworld tile rules, layer stack usage, readability checks, and environment QA.
- Keep overworld non-random and consistent across runs; no procedural overworld generation is allowed in this feature.
- Improve tile placement quality with deterministic rules for edges, corners, transitions, and path readability.
- Implement strict layer separation (ground, transitions, collision, decor, foreground) so visual and gameplay logic do not conflict.
- Add environment life cues using a strict whitelist: foliage sway, water animation, torch/fx loops, and critter loops; disallow any ambient element outside this list for Sprint 2.
- If required ambient assets are missing, use placeholders in this sprint and keep hook points ready for final asset swap.
- Enforce route readability rules: minimum critical-route width of 2 tiles (never 1), path-to-adjacent-ground contrast target of +15%, landmark spacing every 16-20 tiles, and collision marking via readable edge tiles with no hidden blockers on main routes.
- Enforce performance guardrails: maintain at least 60 FPS in playtest traversal, and keep concurrently visible animated ambient tiles/objects at or below 35.
- Ensure dungeon entry marker and major traversal routes are immediately readable on first look.
- Out of scope for this feature: inventory, items, dungeons generation, towns, shops, economy systems, narrative dialogue systems, and combat mechanics changes.

## Clarifications

### Session 2026-04-19

- Q: What is the exact visual direction for this overworld zone? → A: Hybrid transition where the cat wakes up outside town (field/outskirts) and travels toward the city to begin social progression.
- Q: Which ambient life elements are allowed for this sprint? → A: Use foliage sway, water animation, torch/fx loops, and critter loops; use placeholders when assets are missing.
- Q: What route readability rules are required? → A: Use Option B thresholds (2-tile minimum critical paths, +15% path contrast, 16-20 tile landmark spacing, readable edge collision marking with no hidden blockers).
- Q: What is the Sprint 2 target area size? → A: Option B, hero zone plus one micro extension.
- Q: What are the Sprint 2 performance guardrails? → A: Option A, target 60 FPS minimum with up to 35 simultaneously visible animated ambient tiles/objects.

## Clarification Step (Required)

Before implementation planning:

1. Confirm the exact visual direction for this overworld zone (cozy village, wild route, or hybrid transition) and lock a reference board.
2. Confirm allowed ambient life elements for this sprint (for example: foliage sway, water animation, torch/fx loops, critter loops) and ban anything outside that list.
3. Confirm route readability rules (minimum path width, contrast expectations, landmark spacing, and collision marking standards).
4. Confirm the target area size for this sprint (single hero zone only vs hero zone + one micro extension).
5. Confirm performance guardrails (target FPS and acceptable draw complexity).
6. Rewrite requirements with resolved details and no vague language.
7. Re-check against all three context files above to ensure alignment.

## Implementation Plan

Use short checkpoints that can be completed and committed independently.

### ***Checkpoint 1: Tile Workflow Lock-In***

- [x] Create and document overworld tile placement rules for seams, corners, border transitions, and path continuity.
- [x] Enforce fixed tile layer stack in scene setup and ensure collision data is isolated from visual layers.
- [x] Apply tile workflow pass across the full target overworld zone.
- **Test**: Traverse all map boundaries and main routes; verify zero visible seam defects and no visual/collision mismatch.

### ***Checkpoint 2: Living World Pass***

- [x] Add structured prop placement pass with clustering rules and no random clutter hotspots.
- [x] Add approved ambient life cues and depth layering for foreground/background separation.
- [x] Ensure dungeon gate, interactables, and route landmarks remain clear after decoration.
- **Test**: Run 5 visual readability checks from different camera positions and confirm route + objective clarity in under 10 seconds each.

### ***Checkpoint 3: Hardening And Baseline Packaging***

- [x] Perform collision and traversal audit for normal movement and sprint movement.
- [x] Create a reusable overworld environment QA checklist for future zones.
- [x] Update README with Sprint 2 overworld validation steps and acceptance criteria.
- **Test**: Complete 3 full overworld traversal loops with no stuck points, no ambiguous pathing, and no HUD readability failures.

## Scope Guardrails

- Checkpoints should be small enough to be separate commits.
- Each checkpoint must include a test/validation step.
- Keep architecture and file structure consistent with the current project.
- Avoid adding narrative/story dependencies unless the feature explicitly requires them.
