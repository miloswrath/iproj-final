# Feature -> presentation-demo-readiness-pass

## Required Context Files

Read these before writing or revising requirements:

- [docs/feat/CONSTITUTION.md](docs/feat/CONSTITUTION.md)
- [MECHANICS-CONSTITUTION.txt](MECHANICS-CONSTITUTION.txt)
- [docs/game-design/game-functionality.md](docs/game-design/game-functionality.md)
- [docs/feat/FEATURE-npc-progression-combat-village-fix-pass.md](docs/feat/FEATURE-npc-progression-combat-village-fix-pass.md)
- [game/src/main.js](game/src/main.js)
- [game/src/game/scenes/PreloadScene.js](game/src/game/scenes/PreloadScene.js)
- [game/src/game/scenes/OverworldScene.js](game/src/game/scenes/OverworldScene.js)
- [game/src/game/scenes/DungeonScene.js](game/src/game/scenes/DungeonScene.js)
- [game/src/game/scenes/CombatScene.js](game/src/game/scenes/CombatScene.js)

## Requirements

- Keep `docs/feat/FEATURE-TEMPLATE.md` unchanged as the reusable template.
- Add a filled feature plan for the two-day presentation readiness pass.
- Do not edit the `ai/` package or AI companion implementation files; AI integration remains teammate-owned.
- Add a branded title screen with a unique game name before normal gameplay begins.
- The title screen must provide a single clean start path for the presentation build.
- The start path resets browser-local playtest progression because the presentation build does not expose saves.
- Preserve a direct startup path for automated diagnostics and developer checks.
- Hide developer-mode entry points during normal presentation gameplay; developer mode is opt-in only.
- Make presentation-critical polish changes that support the visible core loop: overworld -> dungeon -> combat -> reward -> shop/upgrade.
- Prioritize build/runtime stability, readable first-screen controls, and low-risk UI polish over new mechanics.
- Validate the title screen, overworld, dungeon, and combat scenes before the demo.

## Out Of Scope

- Any changes inside the `ai/` package.
- Rewriting companion dialogue, prompt logic, or LM Studio integration.
- Replacing the Phaser scene architecture.
- Adding story cutscenes, long narrative setup, or branching dialogue.
- Large balance redesign beyond clearly broken demo-blocking values.
- New art pipelines or asset reorganization unless required to fix a visible demo problem.

## Clarification Step (Required)

Before implementation planning:

1. Confirm whether the unique title can be selected by implementation judgment for the presentation build.
2. Confirm whether "Start" may clear only browser-local playtest progress, leaving code and asset data untouched.
3. Confirm whether diagnostics may bypass the title screen with a URL flag.
4. Rewrite requirements with resolved details and no vague language.
5. Re-check against all required context files above to ensure alignment.

## Clarifications

### Session 2026-05-05

- Implementation assumption: the presentation name can be chosen now so the build has a concrete identity.
- Implementation assumption: the selected game name is `Dungeon Loop`.
- Implementation assumption: "Start" clears only the existing browser-local playtest progression state.
- Implementation assumption: diagnostics and automated runtime checks should use `?skipTitle=1` to keep validation deterministic.
- Implementation assumption: world-builder developer mode should require `?devMode=1` and should not be visible or active during normal presentation play.
- Implementation assumption: AI-owned work means no edits under `ai/` and no changes to AI service behavior in the game unless required by a non-AI demo blocker.

## Implementation Plan

Use short checkpoints that can be completed and committed independently.

### ***Checkpoint 1: Branded Startup Flow***

- [x] Add a Phaser title scene with the game name `Dungeon Loop`.
- [x] Route normal startup from preload into the title scene.
- [x] Add a single Start action.
- [x] Add an Enter/Space keyboard shortcut for fast presentation use.
- [x] Update browser page title to match the game name.
- **Test**: Load the game normally and confirm the title screen appears before overworld; press Enter or Start and confirm overworld starts.
- **Result**: Title screen renders with a single Start action; `Enter`/Start resets local playtest progression and reaches overworld.

### ***Checkpoint 2: Demo Reset And Diagnostic Bypass***

- [x] Add a scoped playtest progression reset function for demo starts.
- [x] Wire title-screen Start to reset local progression and start overworld.
- [x] Preserve a `?skipTitle=1` route that starts overworld directly.
- [x] Update runtime diagnostics to use the bypass route.
- **Test**: Start with `?skipTitle=1` and confirm diagnostics can still reach overworld without manual input.

### ***Checkpoint 3: Presentation Stability Validation***

- [x] Run dungeon data validation.
- [x] Build the game project.
- [x] Run runtime diagnostics and inspect browser errors.
- [x] Capture/verify screenshots for title, overworld, dungeon, and combat.
- [ ] Smoke-test the visible loop: title -> overworld -> dungeon -> combat -> reward -> village shop/upgrade.
- **Test**: `npm.cmd run validate:dungeons`, `npm.cmd run build`, and `npm.cmd run diagnose:runtime` complete without demo-blocking errors.
- **Result**: Dungeon validation and production build pass. Runtime diagnostics capture title, overworld, dungeon, and combat screenshots; browser reports quest/AI endpoint 502s when the AI/event backend is not running, which is tracked as an AI-owned demo environment caveat.

### ***Checkpoint 4: Final Demo Polish Pass***

- [x] Review first-screen UI text for presentation clarity and remove noisy debug-only labels where risky.
- [x] Verify village interaction prompts do not overlap core controls or block navigation.
- [x] Verify combat command labels and logs explain Strike, Heavy, Item, and Defend clearly.
- [x] Note any remaining manual demo caveats in this feature file.
- **Test**: Fresh browser-local run can demonstrate the core loop in under five minutes.
- **Result**: Overworld and dungeon top-left HUD now show only controls. Run, reward, and status labels are lower on screen. World-builder developer mode is hidden and inactive unless `?devMode=1` is set. Overworld traversal/audit counters remain hidden unless `?demoDebug=1` is set. Combat help text explains command intent without overlapping the battle-pack panel. Village prompt verification captured `game/diagnostics/village-prompt.png`.

## Demo Caveats

- If the AI/event backend is not running, the game can still demonstrate the non-AI gameplay loop, but browser diagnostics may show 502 resource errors and quest event reconnect warnings.
- PowerShell may block `npm.ps1`; use `npm.cmd` commands on this Windows setup.
- The remaining unchecked smoke test is a manual controller/keyboard walkthrough of the full title -> overworld -> dungeon -> combat -> reward -> village spend loop.

## Scope Guardrails

- Checkpoints should be small enough to be separate commits.
- Each checkpoint must include a test/validation step.
- Keep architecture and file structure consistent with the current project.
- Avoid adding narrative/story dependencies unless the feature explicitly requires them.
- Keep all implementation changes outside `ai/` unless the user explicitly changes ownership.
- Prefer presentation-safe polish and validation over large new gameplay systems.
- Do not let fresh demo reset delete source files, asset files, or teammate data.
