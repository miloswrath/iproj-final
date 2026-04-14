# Game Mechanics Constitution
---
Project focus is gameplay systems only. Story and narrative are out of scope for this document.

## Core Pillars
---
- Turn-based combat is the primary gameplay system.
- Exploration is split between overworld and dungeons.
- Puzzles or quick-time events are used as secondary gameplay to vary pacing.
- Player progression is driven by combat rewards, loot, and quest completion.

## Gameplay Loop
---
1. Explore overworld.
2. Talk to NPCs and accept quests.
3. Enter dungeons tied to quests or progression.
4. Fight enemies in turn-based encounters.
5. Solve puzzle/QTE gates when required.
6. Collect loot and return to NPCs.
7. Upgrade loadout and repeat with harder content.

## Combat System (Turn-Based)
---
- Battles are fully turn-based.
- Each unit acts by initiative or speed order.
- Player turn options:
  - Basic attack
  - Skill/ability
  - Use item
  - Defend
  - Flee (when allowed)
- Resource management is required (HP, stamina/mana, cooldowns, consumables).
- Enemy types should force tactical choice (tank, glass cannon, support, status inflictor).
- Win condition: all enemies defeated.
- Lose condition: player party defeated.

## Overworld Mechanics
---
- Overworld is for:
  - NPC interaction
  - Quest pickup/turn-in
  - Puzzle spaces
  - Route planning to dungeon entrances
- NPCs provide quests that reward loot, currency, or upgrades.
- Optional interactions can reveal shortcuts, hints, or bonus rewards.

## Dungeon Mechanics
---
- Dungeons are for:
  - High-frequency combat encounters
  - Loot acquisition
  - Progression gates (keys, switches, puzzle/QTE checks)
  - Mini-boss or boss fights
- Risk/reward increases with dungeon depth.
- Dungeon completion must produce clear progression value.

## Puzzle and QTE Mechanics
---
- Include at least one of the following in progression-critical content:
  - Environmental puzzles
  - Timing-based quick-time event sequences
- Purpose:
  - Break up combat pacing
  - Gate loot rooms or traversal paths
  - Add mechanical variety without replacing combat as the core loop
- Failure states should cost time/resources, not hard-stop the run unless intended for major encounters.

## Quests and Rewards
---
- NPC quests must have clear objective types:
  - Defeat target enemy
  - Retrieve dungeon item
  - Clear dungeon floor/room
  - Solve puzzle objective
- Rewards can include:
  - Equipment
  - Consumables
  - Currency
  - Upgrade materials
  - Unlock access (new area/dungeon tier)

## Map Generation Decision
---
Chosen structure:
- Set overworld map (handcrafted)
- Random dungeon layout generation

Rationale:
- Handcrafted overworld improves navigation clarity and progression pacing.
- Random dungeons increase replay value and combat variety.

## Scope Boundaries
---
In scope:
- Turn-based combat systems
- NPC interaction and quest flow
- Overworld exploration systems
- Dungeon generation and encounter flow
- Loot and progression systems
- Puzzle/QTE integration

Out of scope:
- Story writing
- Dialogue quality/content
- Narrative cutscene systems
- Lore/worldbuilding beyond mechanics needs

## Success Criteria
---
- Player can reliably loop: overworld -> dungeon -> reward -> upgrade.
- Combat choices are meaningful and not solved by one dominant strategy.
- Dungeons feel variable between runs.
- NPC quests consistently feed the combat/progression loop.
- Puzzle/QTE moments add variety without disrupting core pacing.

## Dungeon Runs
---
Each companion has a rating on 1-5, 5 being the best.
Companions send the main character to dungeons to retrive basic items, their level determines how hard the dungeons are.

## Companion Leveling
---
Based on companion rating, the user must complete x many quests equivalent to their rating from 1-5 
    e.g. a level 5 character requires 5 dungeon runs to completely level
When a companion is completely leveled they provide a unique and powerful item (with utility equivalent to their rating) to the user.
Companions can then provide "contracts" for the user to go to more dungeons to receive more loot

## AI Companion System (Dialogue Specification)
---
**Purpose:**  
Define companion dialogue strictly as a gameplay system. Dialogue exists to support mechanics, not narrative.

### Core Function
- Deliver dungeon contracts
- Provide progression feedback
- Signal rewards, risks, and difficulty
- Reinforce gameplay loop (not story)

### Dialogue System Rules
- Dialogue is **state-driven**, not scripted.
- Trigger conditions include:
  - Companion rating (1–5)
  - Contract state (available, active, completed)
  - Dungeon outcome (success, failure)
  - Progress milestones (level-up, completion)
- Dialogue must be:
  - Short
  - Repeatable
  - Modular (no long conversations)

### Dialogue Categories
- **Contract Assignment**
  - Provides objective and difficulty
  - Implies reward value

- **Progress Updates**
  - Triggered during or after partial progress
  - Reinforces remaining objectives

- **Completion Feedback**
  - Triggered after dungeon completion
  - Scales with performance

- **Level-Up / Milestone**
  - Triggered when companion levels or is completed
  - Signals reward unlock

- **Idle Dialogue**
  - Triggered when no active contract
  - Reinforces tone/personality only

### Personality as Mechanics
- Personality affects:
  - Tone (supportive, neutral, manipulative)
  - Frequency of contracts
  - Risk/reward framing
- No narrative arcs or story dependency

### Player Interaction Model
- Dialogue delivered via simple UI (text box/overlay)
- Player options:
  - Accept contract
  - Decline contract
  - Request new contract (optional)
- No complex branching trees required

### Scaling with Companion Rating
- Rating 1–2:
  - Lower difficulty contracts
  - Clear guidance
  - Lower rewards

- Rating 3–5:
  - Higher difficulty contracts
  - Less guidance
  - Higher rewards
  - More demanding tone

### Nonnegotiable Constraint
- Include one companion with:
  - **Goth baddie archetype**
    - Manipulative, exploitative tone
    - Encourages risky contracts
    - Frames rewards as leverage over the player

### System Constraints
- Dialogue must:
  - Be reusable across runs
  - Not rely on story progression
  - Not block gameplay flow