# Feature Spec -> Bug Fixes, New Features

- Fix bugs first then work on new features

## Current Bugs
---
- Codex quest text shows twice in two different fonts
- NPC character spawns at quest spawn point and moves quickly to character each time after a battle is completed - should spawn at the character after a battle is completed

## New Feature Requirements
---
**General Idea**: New characters, testing out each new character and building the progression workflow

**Feature Requirements**:
- First, after finishing 3 quests for an NPC, a new character context is loaded where they are now friendly:
    - Once the user finishes the third quest and they go and chat with the NPC again, the NPC is now:
        - Acknowledges friendship (in their own way - match the character archetype)
        - Offers quests still but more friendly
        - Stays spawning in each character's unique location
        - Gives the user loot (from a predefined pool which is modifiable)
            - Should have types:
                ```TS
                type loot_pool_type: guaranteed | chance
                type loot_pool_item: item_name | loot_pool_type
                ```
                So that some items are guaranteed to be given and some have varying chances of spawning, figure out how to type the chance percentages
- Create a random second character to spawn with new archetype and quests
- Should then rerun the workflow
- After the first character is completed, a new menu (similar to codex) should spawn with the ability to view active friends and have a short summary of quests and conversations with them (this AI summary should run on exit of the conversation after finishing the third quest)

**Other Requirements**:
- After a character is completed, they now spawn in the town (do not spawn characters on top of each other)
- The next character now spawns in a unique location on the map
- Toast instructs user to find the new characters
- General is no longer the blank character, start with a random character:
    - Currently active character is saved in local storage (`ai/memory/*`) so reloads do not change the spawned character
