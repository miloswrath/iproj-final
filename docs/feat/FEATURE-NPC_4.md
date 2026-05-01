# Feature Spec -> Bug Fixes,

## Current Bugs
---
- Once a quest is generated, the chatbox immediately closes for a character. Users may want to read the final message but are not able to at the moment
- NPC does not follow into the dungeon - they should
- No toast on quest completion
- When trying to converse with a character after completing quests - receive this error on console and game freezes:
    ```
    Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'sys')
        at Image.setTexture (phaser.js?v=7bc6fd50:32492:34)
        at ConversationOverlay.open (ConversationOverlay.js:308:19)
        at OverworldScene.update (OverworldScene.js:315:15)
    ```
- Context size exceeds quickly for local models, make sure to clear chats and context after saving summaries
