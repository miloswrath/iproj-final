# Contract: Pending Notification Queue

## Storage Location

- `memory/pending-notifications.json`

## Record Schema

```json
{
  "type": "quest_start | quest_complete",
  "payload": {},
  "attemptCount": 0,
  "lastAttemptAt": "2026-04-22T12:00:00.000Z"
}
```

## Contract Rules

1. `type` is mandatory and determines replay route.
2. `payload` must match schema for the declared `type`.
3. Retry handler must route as follows:
   - `quest_start` -> `/quest/start`
   - `quest_complete` -> `/quest/complete`
4. On successful replay, record is removed from queue.
5. On transient failure, record remains with updated retry metadata.
6. On permanent client error (`4xx`), record is dropped after logging.

## Backward Compatibility Rule

Legacy untyped records (if present) should be handled defensively (logged and dropped, or migrated once) to avoid misrouting.
