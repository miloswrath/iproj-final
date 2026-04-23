## Spec: `POST /quest/complete`

### Overview

This endpoint notifies the system that a player has completed an active quest. It mirrors the structure of `POST /quest/start` but additionally triggers memory updates — persisting outcome data to `CharacterMemory` and `PlayerProfile` in a way the existing post-conversation pipeline does not cover (since that pipeline fires on conversation *termination*, not quest *resolution*).

---

### Endpoint

| Property | Value |
|---|---|
| Method | `POST` |
| Default URL | `http://localhost:3000/quest/complete` |
| Env override | `GAME_API_URL_COMPLETE` (or reuse `GAME_API_URL` with path routing) |
| Called by | `notifyQuestComplete()` in `src/notify/game-api.ts` |

---

### Request headers

```http
Content-Type: application/json
```

### Request body schema

```json
{
  "character": "string",
  "questId": "string",
  "outcome": "success" | "failure" | "abandoned",
  "playerState": {
    "level": 1
  },
  "relationshipSnapshot": {
    "trust": 0,
    "dependency": 0,
    "bond": 0,
    "wariness": 0
  },
  "rewardReceived": true | false
}
```

**Field notes:**

- `outcome` — the game system is the source of truth here; the NPC runtime should not infer this itself. It is passed in from the authoritative game state.
- `rewardReceived` — drives the `playerNoticedRewardMismatch` flag update in `CharacterMemory`. If the quest succeeded but `rewardReceived` is false, the flag should be set to `true`.
- `relationshipSnapshot` — same shape as in `/quest/start`; captured at the moment of completion so the game system has both a before (start) and after (complete) snapshot for analytics.

### Example payload

```json
{
  "character": "enabler",
  "questId": "enabler_retrieve-relic-from-crypt",
  "outcome": "success",
  "playerState": { "level": 2 },
  "relationshipSnapshot": {
    "trust": 82,
    "dependency": 63,
    "bond": 70,
    "wariness": 12
  },
  "rewardReceived": false
}
```

---

### Memory side effects

On receiving this notification, the NPC runtime should update the relevant memory files before acknowledging success. These updates follow the same clamping and validation rules defined in the data model.

**`CharacterMemory` updates** (`memory/characters/<character-name>.json`):

| Field | Update logic |
|---|---|
| `flags.recentSuccess` | Set to `true` if `outcome === "success"`, else `false` |
| `flags.recentFailure` | Set to `true` if `outcome === "failure"`, else `false` |
| `flags.playerNoticedRewardMismatch` | Set to `true` if `outcome === "success"` and `rewardReceived === false` |
| `progression.questLevel` | Increment by 1 on `"success"` (monotonically non-decreasing — never decrement) |
| `keyMemories` | Append a one-sentence summary of the quest outcome; drop oldest if count exceeds 5 |

**`PlayerProfile` updates** (`memory/player-profile.json`):

| Field | Update logic |
|---|---|
| `burnout` | Nudge up on `"failure"` or `"abandoned"` (+3–5 points); nudge down slightly on `"success"` (−2) |
| `hope` | Nudge up on `"success"` (+3–5); nudge down on `"failure"` or `"abandoned"` (−3) |
| `traits.riskTolerance` | Slight nudge up on `"success"` (+0.02); nudge down on `"failure"` (−0.02) |

All nudge values should be clamped to their valid ranges after application, per existing validation rules.

---

### Response handling

Mirrors the existing `/quest/start` behavior:

| Status | Meaning | Action |
|---|---|---|
| `2xx` | Success | No retry needed |
| `4xx` | Permanent client error | Drop payload, log warning |
| `5xx` | Transient server error | Persist to retry queue |
| Network failure | Transport error | Persist to retry queue |

Retry queue: `memory/pending-notifications.json` (same file as quest-start retries — payloads should include a `"type": "quest_complete"` field to distinguish them on replay).

---

### Idempotency

Recommend the same idempotency approach as `/quest/start`:

- Key candidate: `character + questId + outcome + timestamp-at-receiver`
- The game system should guard against duplicate completion events for the same `questId`.

---

### Source files to modify

| File | Change |
|---|---|
| `src/notify/game-api.ts` | Add `notifyQuestComplete(payload)` function |
| `src/lifecycle/pipeline.ts` | Add `runQuestCompletionPipeline()` trigger point |
| `memory/characters/<name>.json` | Updated by completion pipeline (existing schema, no new fields needed) |
| `memory/player-profile.json` | Updated by completion pipeline (existing schema) |


A few design decisions worth flagging before implementation:

**On `rewardReceived`**: The game system is better positioned to know this than the NPC runtime, so it belongs in the request payload rather than being inferred. This also means the `playerNoticedRewardMismatch` flag reflects the *actual* reward outcome, not just what the NPC said during the conversation.

**On the retry queue**: Using the same `pending-notifications.json` file keeps retry logic centralized, but payloads need a `"type"` discriminator (`"quest_start"` vs `"quest_complete"`) so `retrySavedNotifications()` can route them correctly on replay.

**On `questLevel` incrementing**: The data model says it's monotonically non-decreasing, so only increment on `"success"`. An `"abandoned"` or `"failure"` should leave it unchanged — the NPC hasn't yet earned the right to escalate.

## Things to research and ensure are correctly adapted or written
---
**Retry queue mixes payload types without a discriminator field**
Section 4.1 describes pending-notifications.json as the retry store for quest-start notifications. The spec for /quest/complete (written above) would reuse the same file. But the retry handler retrySavedNotifications() has no documented awareness of payload type — it presumably just replays everything to one URL. With two endpoint types sharing a queue, replaying a quest/complete payload to quest/start (or vice versa) would silently corrupt game state.

Suggested fix: Add a "type" field to all persisted payloads ("quest_start" | "quest_complete"), and document that retrySavedNotifications() must route based on this field. Update the payload schema table in §4.1 to include it.

**ConversationFeatures are extracted but never written anywhere**
The data model defines ConversationFeatures (§ConversationFeatures) and shows them as input to the "metric update formula" in the entity relationship diagram. But there's no documentation of what that formula actually is — how agreementRatio, questionCount, etc. map to changes in PlayerProfile or CharacterMemory. This is a significant gap: a developer implementing the post-conversation pipeline has no spec to work from.

Suggested fix: Add a "Metric Update Formulas" section that documents, for each PlayerProfile and CharacterMemory field that changes after a conversation, which ConversationFeatures inputs drive it and in what direction. Even a simplified table would close this gap.

**PlayerSummary is regenerated but the regeneration prompt isn't specified**
The model says PlayerSummary is "regenerated after each conversation" and contains two LLM-facing string fields. But unlike the quest classifier prompts (which have documented prompt contracts in §3.2 and §3.3 of the API doc), there's no prompt contract for PlayerSummary regeneration. A developer implementing this would have to infer the prompt entirely.

Suggested fix: Add a prompt contract for PlayerSummary regeneration (inputs: PlayerProfile + ConversationFeatures; output: { playerGlobal, recentArc }). Reference it from the data model and from the API doc's source-of-truth table.

**Derived metrics are computed "on read" but no read interface is defined**
manipulationPressure and favorability are noted as "never stored — always computed on read." But there's no documented function, accessor, or module responsible for computing them. A developer reading this could easily write them to disk by accident.

Suggested fix: Add a reference to a utility module (e.g. src/memory/derived.ts) where these computations live, and add a validation note that any persistence layer should assert these keys are absent from the written JSON.

**Quest Naming**
Current approach — and its limits
The current quest ID format is <characterName>_<questSummarySlug> where the slug comes from the LLM's questSummary field in classifyQuestOffer(). In practice this produces generic outputs like enabler_retrieve-relic-from-crypt — functional, but flat. The slug is a single noun phrase that carries no tone, no sense of the NPC's character, and no hint of escalating stakes.
Suggested naming approach
Quest names should do two things the current format doesn't: reflect the NPC's voice and signal quest level. A few patterns worth considering:
Voice-inflected slugs — rather than neutral task descriptions, the LLM classifier prompt should be instructed to generate slugs in the NPC's register. An enabler NPC wouldn't call it retrieve-relic-from-crypt; they'd frame it as a favor: just-a-small-errand or something-only-you-can-do. An opportunist would be transactional: even-trade-no-questions. A mirror NPC would echo the player's own language back. This framing makes the quest ID itself a character artifact.
Level prefix encoding — since questLevel is already tracked on CharacterMemory, incorporate it into the ID: <characterName>_L<questLevel>_<slug>. This makes escalation legible from the ID alone (enabler_L1_small-errand → enabler_L3_last-thing-i-ask), which is useful for both debugging and analytics.
Prompt contract update for classifyQuestOffer() — the current contract asks only for questSummary as a generic slug. It should be updated to:
```json
{
  "offered": true,
  "questSummary": "<3-5 word phrase in the NPC's voice, hyphenated, no generic task verbs>"
}
```
With a few character-specific examples in the prompt to anchor tone. This costs nothing at inference time and makes the output substantially richer.
