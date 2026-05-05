# Contract: NPC Archetype Asset Mapping

**Feature**: 008-fix-npc-asset-behavior  
**Owner**: `game/src/game/npc/npcConfig.js`, `game/src/game/scenes/*`  
**Consumers**: Overworld spawn/render, conversation presentation, quest scene character loading

## Scope

Defines canonical archetype-to-character mapping and starter-pool constraints required by this feature.

---

## 1) Starter pool contract

```json
{
  "starterPool": {
    "selection": "random_uniform",
    "excludedArchetypes": ["general"],
    "eligibleArchetypes": ["parasite", "enabler", "honest_one", "mirror", "opportunist"]
  }
}
```

Rules:
1. `general` must never be selected as the initial archetype.
2. Selection must remain random across eligible entries.
3. The active starter NPC must be persisted once chosen so fresh-run selection remains stable within a session.

---

## 2) Required mapping contract

```json
{
  "mappings": {
    "parasite": "Countess_Vampire",
    "enabler": "Converted_Vampire",
    "honest_one": "girl-1",
    "mirror": "girl-2",
    "opportunist": "girl-3"
  }
}
```

Rules:
1. These mappings are mandatory for this feature version.
2. Scene systems must resolve character identity from this canonical map.
3. The game runtime must use one canonical NPC config source for starter selection, conversation portraits, overworld sprites, and dungeon companion loading.

---

## 3) Animation coverage contract

```json
{
  "characterId": "Countess_Vampire",
  "requiredAnimations": ["idle", "walk", "interact"],
  "coverageStatus": "pass"
}
```

Rules:
1. Every mapped character must pass required animation coverage checks.
2. Missing optional animations are acceptable only if required animation set is complete.
3. Validation is enforced through `game/scripts/validateNpcAssets.mjs`.

---

## Minimum validation checks

1. In repeated fresh starts, no run initializes with `general`.
2. Each required archetype resolves to the exact mapped character identity.
3. Required mapped characters load with complete required animation coverage.
4. Mapping source is singular (no conflicting duplicate map in another runtime subsystem).
