# Fix Specification -> No variety in quest content
---

## Problem 
---
Currently, almost every quest is fetching a relic from a crypt.
There are multiple references of the word "relic" in this repository and other specific objects as well, given the small model size I am using this ultimately ends up with every quest being "fetch a relic from a crypt".

## Solution
---
Remove specific references of quest content and enforce more liberal creative freedom from the model to choose its own quest content, as long as it aligns with the story line. 
Make sure the model gets positive feedback if its content aligns with anything brought up in the conversation or previous conversations.
    e.g. if the character talks about bananas maybe they fetch a banana?
Make sure there are no specific references to objects
