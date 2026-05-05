# Contract: Conversation Debug Trigger (Game ↔ AI Bridge)

**Feature**: 008-fix-npc-asset-behavior  
**Owner**: `ai/src/server/routes/conversation.ts`, `game/src/game/services/aiClient.js`  
**Base**: `http://127.0.0.1:3000/api/v1`

## Scope

Defines required behavior when conversation messages contain one of the two approved debug trigger phrases.

Approved phrases:
- `I will do it`
- `i will do it`

Only these exact strings are valid triggers.

---

## Endpoint reused

### `POST /conversation/{sessionId}/message`

### Request body (existing)

```json
{
  "text": "I will do it"
}
```

### Response 200 extension

```json
{
  "reply": "Acknowledged.",
  "terminated": true,
  "conversationState": {
    "phase": "ESCALATION"
  },
  "questActivation": {
    "triggered": true,
    "source": "debug_phrase",
    "phrase": "I will do it",
    "questId": "general_debug_phrase_20260505123000",
    "questTitle": "general debug quest",
    "bundleReady": true
  }
}
```

`questActivation` may be omitted when no debug trigger phrase is used.

---

## Behavioral requirements

1. Exact-match only: phrases with extra whitespace/punctuation/casing differences are not auto-triggered.
2. On valid trigger phrase, normal dialogue gating is bypassed.
3. Activation still uses standard quest setup ordering; debug mode does not skip required setup.
4. Successful debug activation terminates the current conversation turn and returns `questActivation` metadata in the same response.
5. If setup cannot complete, endpoint returns `quest_activation_failed` and does not claim an active quest.

---

## Error format

```json
{
  "error": "machine_code",
  "message": "human readable"
}
```

Expected error codes:
- `session_not_found`
- `empty_message`
- `quest_activation_failed`
- `lm_studio_unavailable`

---

## Minimum contract tests

1. Posting `I will do it` from any active conversation stage triggers `questActivation.triggered=true`.
2. Posting `i will do it` from any active conversation stage triggers `questActivation.triggered=true`.
3. Posting near-miss text (e.g., `I will do it!`) does not trigger debug activation.
4. Debug-trigger activation failure returns an explicit error and does not create a partial active quest state.
