# Contract: Quest Completion Notification

## Endpoint

- **Method**: `POST`
- **Path**: `/quest/complete`
- **Default URL**: `http://localhost:3000/quest/complete`

## Request Headers

- `Content-Type: application/json`

## Request Body

```json
{
  "character": "enabler",
  "questId": "enabler_L2_small-errand",
  "outcome": "success",
  "playerState": { "level": 2 },
  "relationshipSnapshot": {
    "trust": 82,
    "dependency": 63,
    "bond": 70,
    "wariness": 12
  },
  "rewardReceived": false,
  "eventTimestamp": "2026-04-22T12:00:00.000Z"
}
```

## Field Rules

- `character`: required, non-empty string.
- `questId`: required, non-empty string.
- `outcome`: required enum (`success`, `failure`, `abandoned`).
- `playerState.level`: required integer >= 1.
- `relationshipSnapshot`: required object with numeric values in accepted relationship ranges.
- `rewardReceived`: required boolean.
- `eventTimestamp`: optional string timestamp used for idempotency keying.

## Response Handling Contract

- `2xx`: delivery successful, do not enqueue.
- `4xx`: permanent rejection, log and drop.
- `5xx` or network failure: enqueue to pending notifications with `type = "quest_complete"`.

## Idempotency Contract

Receiver should guard duplicate completion processing by stable event identity (`character`, `questId`, `outcome`, and available event timestamp/request id).
