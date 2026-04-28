import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const APP_URL = process.env.GAME_URL ?? 'http://127.0.0.1:5173';
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'diagnostics');

function summariseDamages(values) {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      unique: [],
    };
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    unique: [...new Set(values)].sort((a, b) => a - b),
  };
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  await ensureDir(SCREENSHOT_DIR);

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });

  const browserErrors = [];
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      browserErrors.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    browserErrors.push({ type: 'pageerror', text: err.message });
  });

  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => {
    const runtime = window.__gameRuntime ?? window.__playtestGame;
    const overworld = runtime?.scene?.keys?.overworld;
    return Boolean(overworld?.player && overworld?.inventoryOverlay?.inventoryState);
  }, null, { timeout: 15000 });

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'overworld.png') });

  const overworldState = await page.evaluate(() => {
    const runtime = window.__gameRuntime ?? window.__playtestGame;
    const overworld = runtime.scene.keys.overworld;
    return {
      hasPlayer: Boolean(overworld.player),
      hasInventory: Boolean(overworld.inventoryOverlay?.inventoryState),
      rewardLabel: overworld.rewardLabel?.text ?? '',
      progressionLabel: overworld.progressionLabel?.text ?? '',
    };
  });

  const dungeonState = await page.evaluate(() => {
    const runtime = window.__gameRuntime ?? window.__playtestGame;
    runtime.scene.start('dungeon', {
      returnX: 170,
      returnY: 170,
    });

    const dungeon = runtime.scene.keys.dungeon;
    return {
      chestDistances: (dungeon.layoutState.chests ?? []).map((chest) => {
        const dx = chest.x - dungeon.layoutState.spawnCell.x;
        const dy = chest.y - dungeon.layoutState.spawnCell.y;
        return Math.round(Math.sqrt((dx * dx) + (dy * dy)) * 100) / 100;
      }),
      chestCount: dungeon.layoutState.chests?.length ?? 0,
      activeLayout: dungeon.layoutState.name,
    };
  });

  await page.waitForFunction(() => {
    const runtime = window.__gameRuntime ?? window.__playtestGame;
    const dungeon = runtime?.scene?.keys?.dungeon;
    return Boolean(dungeon?.player && dungeon?.layoutState);
  }, null, { timeout: 10000 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dungeon.png') });

  const combatState = await page.evaluate(() => {
    const runtime = window.__gameRuntime ?? window.__playtestGame;
    const inventory = runtime.scene.keys.overworld.inventoryOverlay.inventoryState;
    inventory.items[0] = {
      id: 'field-tonic',
      name: 'Field Tonic',
      type: 'Consumable',
      quantity: 2,
      description: 'Restore a chunk of HP during combat to stabilize a risky run.',
      iconFrame: 78,
      combat: { usable: true, effect: { kind: 'heal', amount: 12 } },
    };

    runtime.scene.start('combat', {
      playerStats: { maxHp: 30, hp: 18, attack: 8, defendReduction: 4 },
      enemyStats: { name: 'Cave Vampire', maxHp: 32, attack: 8, spriteKey: 'vampire1-idle' },
      returnContext: {
        returnX: 170,
        returnY: 170,
        layoutState: { defeatedEnemyIds: [], enemyCount: 1 },
        dungeonSpawnX: 200,
        dungeonSpawnY: 200,
      },
    });

    return true;
  });

  await page.waitForFunction(() => {
    const runtime = window.__gameRuntime ?? window.__playtestGame;
    return Boolean(runtime?.scene?.keys?.combat?.playerSprite);
  }, null, { timeout: 10000 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'combat.png') });

  const combatReport = await page.evaluate(async () => {
    const runtime = window.__gameRuntime ?? window.__playtestGame;
    const combat = runtime.scene.keys.combat;
    const inventory = runtime.scene.keys.overworld.inventoryOverlay.inventoryState;

    const item = combat.getCombatItems()[0];
    combat.useCombatItem(item);

    const itemImmediate = {
      hp: combat.playerStats.hp,
      qty: inventory.items[0] ? inventory.items[0].quantity : 0,
      actionLog: [...combat.actionLog],
    };

    await new Promise((resolve) => setTimeout(resolve, 900));

    const itemAfterEnemy = {
      hp: combat.playerStats.hp,
      qty: inventory.items[0] ? inventory.items[0].quantity : 0,
      playerTurn: combat.playerTurn,
      actionLocked: combat.actionLocked,
      actionLog: [...combat.actionLog],
    };

    combat.playerTurn = true;
    combat.actionLocked = false;
    combat.result = null;
    const enemyHpBefore = combat.enemyStats.hp;
    combat.handleAction('attack');

    const attackImmediate = {
      enemyHpBefore,
      animKey: combat.playerSprite.anims.currentAnim ? combat.playerSprite.anims.currentAnim.key : null,
      actionLocked: combat.actionLocked,
    };

    await new Promise((resolve) => setTimeout(resolve, 450));

    const attackMid = {
      enemyHp: combat.enemyStats.hp,
      actionLog: [...combat.actionLog],
      animKey: combat.playerSprite.anims.currentAnim ? combat.playerSprite.anims.currentAnim.key : null,
    };

    const damageValues = Array.from({ length: 25 }, () => combat.rollAttack(8, {
      accuracy: 0.91,
      critChance: 0.17,
      variance: 0.26,
    }))
      .filter((roll) => roll.hit)
      .map((roll) => roll.damage);

    return {
      itemImmediate,
      itemAfterEnemy,
      attackImmediate,
      attackMid,
      damageValues,
      hasPlayerSprite: Boolean(combat.playerSprite),
      hasEnemySprite: Boolean(combat.enemySprite),
      helpText: combat.helpText?.text ?? '',
    };
  });

  const report = {
    appUrl: APP_URL,
    overworldState,
    dungeonState,
    combatState,
    combatReport: {
      ...combatReport,
      damageSummary: summariseDamages(combatReport.damageValues),
    },
    browserErrors,
    screenshots: {
      overworld: path.join(SCREENSHOT_DIR, 'overworld.png'),
      dungeon: path.join(SCREENSHOT_DIR, 'dungeon.png'),
      combat: path.join(SCREENSHOT_DIR, 'combat.png'),
    },
  };

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
