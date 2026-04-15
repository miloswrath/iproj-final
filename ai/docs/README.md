# `ai/docs` Readme
---

This directory is used to house prompts and other document artifacts for the AI characters. 

## Layout
---

`prompts/` - Prompts used for characters
`api/` - Docs related to API calling for current logic in `../src`

## Prompt authoring notes
---

Character prompts should assume each companion already has a fixed authored bundle of:
- persona
- non-negotiable goals and values
- malleable goals and values
- personality quirks
- questline themes

Runtime quest generation should pull from those authored traits instead of inventing new
motivations on the fly. Variation should come from game state, player tone, and history,
not from drifting away from the character's persona.
