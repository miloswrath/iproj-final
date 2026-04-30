export const INVENTORY_ITEM_DEFS = {
  fieldTonic: {
    id: 'field-tonic',
    name: 'Field Tonic',
    type: 'Consumable',
    description: 'Restore a chunk of HP during combat to stabilize a risky run.',
    iconTexture: 'ui-field-tonic-icon',
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
    iconTexture: 'ui-slime-jelly-icon',
  },
  ironOre: {
    id: 'iron-ore',
    name: 'Iron Ore',
    type: 'Upgrade Material',
    description: 'Raw metal stock for future weapon and armor upgrades.',
    iconFrame: 94,
  },
  crystalShard: {
    id: 'crystal-shard',
    name: 'Crystal Shard',
    type: 'Upgrade Material',
    description: 'Dungeon reward material reserved for upgrades, contracts, or unlock costs.',
    iconTexture: 'ui-crystal-shard-icon',
  },
};

export function createInventoryEntry(itemDef, quantity) {
  return {
    id: itemDef.id,
    name: itemDef.name,
    type: itemDef.type,
    quantity,
    description: itemDef.description,
    iconFrame: itemDef.iconFrame ?? 0,
    iconTexture: itemDef.iconTexture ?? 'ui-inventory-icons',
    combat: itemDef.combat ?? null,
  };
}
