# Constitution Specification
---

Web based 2d top-down game with game design and story specified in [./game-design]
companion dialogue and other things are dynamically generated using generative AI

## Constraints
---
- All game functionality and AI companion design must adhere to the specifications must adhere to the specifications in [./game-design]
- Work on AI/Game will be done separately in [/game] and [/ai] and will eventually be connected after MVP of each part
- Only localhost, no other hosting

## AI Constraints
---
- Only hosted on lmstudio server
- Must not have a filter (will use appropriate jailbroken models)


- 
## GAME Constraints
---
- Gameplay-first design; no reliance on story or narrative systems
- All systems must support the core loop (overworld → dungeon → reward → upgrade)
- Dialogue must be functional only (no narrative dependency)
- Turn-based combat is non-negotiable as the primary system
- Dungeons must be repeatable and support procedural variation
- Player progression must be measurable and consistent (no hidden scaling)
- Companion systems must directly contribute to dungeon access or rewards
- No mechanic should hard-stop player progression without clear recovery path
- Puzzle/QTE elements must remain secondary to combat
- Systems must be modular and reusable across multiple runs
- UI interactions must be simple and not interrupt gameplay flow
- Risk/reward must scale clearly with difficulty (especially via companion rating)
- At least one companion must follow the "goth baddie" constraint
