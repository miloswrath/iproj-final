# Contract: Friend Roster Data Schema

**Feature**: 007-npc-friend-progression  
**Consumer**: `game/src/game/ui/FriendRosterOverlay.js`  
**Producer**: `ai/src/server/routes/friends.ts`

---

## FriendRosterEntry

```ts
type FriendRosterEntry = {
  npcId: string;
  displayName: string;
  archetype: string;
  friendshipState: 'unlocked';
  summaryText: string;
  questHighlights: string[];
  lastConversationAt: string; // ISO-8601
  updatedAt: string;          // ISO-8601
};
```

### Rules

1. `summaryText` MUST be non-empty and concise enough to fit the codex-style overlay without pagination by default.
2. `questHighlights` MAY be empty, but when present each item should be a short standalone phrase.
3. Entries are sorted newest-first by `updatedAt`.
4. Only unlocked friends are included; eligible-but-not-yet-unlocked NPCs are excluded.

---

## FriendRosterResponse

```ts
type FriendRosterResponse = {
  friends: FriendRosterEntry[];
  activeCount: number;
  generatedAt: string;
};
```

### UI expectations

- Empty state should render a clear “no friends yet” message and not crash.
- The overlay may display `displayName`, `archetype`, `summaryText`, and up to three `questHighlights`.
- The overlay should remain usable even if `questHighlights` is empty.

---

## ActiveCharacterResponse

```ts
type ActiveCharacterResponse = {
  activeNpcId: string;
  starterNpcId: string;
  unlockedNpcIds: string[];
  completedNpcIds: string[];
  pendingUnlockNpcId: string | null;
  lastAdvancedAt: string | null;
};
```

### Rules

1. `activeNpcId` is the game startup source of truth once initialized.
2. `pendingUnlockNpcId` indicates that the next character should be discoverable in the world and highlighted by toast/guidance UI.
3. `completedNpcIds` and `unlockedNpcIds` must not contain duplicates.

---

## Validation test cases

1. Empty roster renders safely with `friends=[]` and `activeCount=0`.
2. A single unlocked friend shows a valid summary and optional highlights.
3. Duplicate `npcId` entries are rejected before reaching the UI.
4. Active character payload remains stable across reloads until progression explicitly advances.
