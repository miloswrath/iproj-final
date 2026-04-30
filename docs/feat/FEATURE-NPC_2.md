# Feature Spec --> Build Dungeon Workflow
---

## Requirements
---
***Main Goal*** - Build workflow around quests - starting, during, and ending quests
**Specific Features Include**:
- Use AI to name the dungeons based on the conversation
    - optionally also add a little lore around the quest based on the conversation 
    - this should be part of the memory loop when quests are accepted
- build a frontend for lore that shows current and previous quests, sort of like a codex
- keep track of dungeon progress, for each dungeon make the user go through 3 "floors" (3 dungeon maps from the pool)
    - when the user completes these three floors (complete is all chests looted and all enemies killed), a portal opens for either the next floor or an exit to overworld
    - on quest completion, make sure to update memory of the AI, and ensure that the completion of quests is brought up in the next conversation with AI
- Ensure that AI conversations are usually about the same topic, store more conversation context into the memory system and make sure its injected into model context and used in subsequent conversations
- Add toasts for quest completion
- Ensure that the AI character follows the user around after the quest is generated (use a modified version of the follow for enemies but make sure the speed is higher so they are closer at all points)

**Other Info**:
- There is only one quest portal (already exists), the name of this portal is based on the title given from the conversation, which should be unique for every quest


## Current Bugs to Fix
---
- Cannot converse with an AI more than once without needing a restart

