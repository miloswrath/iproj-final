export const INVENTORY_ITEM_DEFS = {
  fieldTonic: {
    id: 'field-tonic',
    name: 'Field Tonic',
    type: 'Consumable',
    description: 'Restore a chunk of HP during combat to stabilize a risky run.',
    iconFrame: 78,
    combat: {
      usable: true,
      effect: {
        kind: 'heal',
        amount: 12,
      },
    },
  },
  slimeJelly: {
    id: 'slime-jelly',
    name: 'Slime Jelly',
    type: 'Loot',
    description: 'Basic dungeon drop tied to contract turn-ins and early progression loops.',
    iconFrame: 40,
  },
  ironOre: {
    id: 'iron-ore',
    name: 'Iron Ore',
    type: 'Upgrade Material',
    description: 'Raw metal stock for future weapon and armor upgrades.',
    iconFrame: 29,
  },
  crystalShard: {
    id: 'crystal-shard',
    name: 'Crystal Shard',
    type: 'Upgrade Material',
    description: 'Dungeon reward material reserved for upgrades, contracts, or unlock costs.',
    iconFrame: 77,
  },
};

export function createInventoryEntry(itemDef, quantity) {
  return {
    id: itemDef.id,
    name: itemDef.name,
    type: itemDef.type,
    quantity,
    description: itemDef.description,
    iconFrame: itemDef.iconFrame,
    combat: itemDef.combat ?? null,
  };
}
