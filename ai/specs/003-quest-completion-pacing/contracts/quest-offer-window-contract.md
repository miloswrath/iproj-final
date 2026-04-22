# Contract: Quest Offer Timing Window

## Scope

Defines when the **first** quest offer may be recognized in a conversation session.

## Timing Rules

1. Assistant response index starts at 1 for the first assistant message in a session.
2. First quest offer is **invalid** on responses 1-2.
3. First quest offer is **valid** only on responses 3-5.
4. If no offer occurs by response 5, the system may continue conversation without forcing an offer.

## Behavioral Guarantees

- Zero accepted first-offer events before response 3.
- Any accepted first-offer event must record offer turn in `{3,4,5}`.
- Offer timing checks are based on assistant-response count, not wall-clock time.

## Validation Signals

- `assistantResponseCount`
- `firstQuestOfferTurn`
- optional debug log: `offer_window_blocked` with blocked turn number
