# Quickstart: HTTP API Conversation Service

**Feature**: 001-http-api-conversations  
**Date**: 2026-04-23

---

## Prerequisites

- Node.js 20+
- LM Studio running at `http://localhost:1234`
- AI project dependencies installed in `/home/zak/school/s26/iproj/final/ai`

---

## Start the AI Service

From `/home/zak/school/s26/iproj/final/ai`:

```bash
npm run dev
```

Service should expose conversation endpoints on configured localhost port.

---

## 1) Start a Conversation

```bash
curl -s -X POST http://localhost:3001/conversation/start \
  -H 'Content-Type: application/json' \
  -d '{
    "conversationId":"ovw-npc-58-11-player1",
    "character":"enabler",
    "playerId":"player1",
    "metadata":{"scene":"overworld"}
  }' | jq
```

Expected: active conversation state for that ID.

---

## 2) Send a Message

```bash
curl -s -X POST http://localhost:3001/conversation/message \
  -H 'Content-Type: application/json' \
  -d '{
    "conversationId":"ovw-npc-58-11-player1",
    "text":"okay, what do you need me to get?",
    "idempotencyKey":"msg-0001"
  }' | jq
```

Expected: one NPC reply, updated phase, quest/termination metadata.

---

## 3) Verify Message Idempotency

Repeat the exact same request (same `idempotencyKey`) and verify response body is identical and no duplicate side effects occur.

---

## 4) Get Conversation State

```bash
curl -s http://localhost:3001/conversation/state/ovw-npc-58-11-player1 | jq
```

Expected: current state including phase, status, and last update timestamp.

---

## 5) End Conversation

```bash
curl -s -X POST http://localhost:3001/conversation/end \
  -H 'Content-Type: application/json' \
  -d '{
    "conversationId":"ovw-npc-58-11-player1",
    "reason":"exit",
    "idempotencyKey":"end-001"
  }' | jq
```

Expected: terminated state with `phase = TERMINATION`.

---

## 6) Verify End Idempotency

Repeat the same end request with the same idempotency key. Response must replay identically.

---

## 7) Timeout Cleanup Check

- Start a new conversation and leave it inactive.
- After 10+ minutes, query state and verify session is terminated/cleaned according to contract.

---

## 8) Outbound Notification Retry Behavior

- Trigger acceptance termination path.
- If downstream game endpoint is unavailable, verify payload is stored in pending notification queue and retried on subsequent startup.

---

## Troubleshooting

| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| `500 internal_error` on message | LLM service unavailable | Ensure LM Studio is running on localhost |
| `422 unsupported_character` | Invalid character key | Use a supported character identifier |
| Duplicate side effects | New idempotency key used for retries | Reuse original idempotency key |
| `404 conversation_not_found` | Start was never called or session expired | Call `/conversation/start` again |
