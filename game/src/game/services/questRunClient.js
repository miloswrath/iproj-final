const API_BASE = '/api/v1';

async function getJson(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    console.warn('[questRunClient] fetch failed:', err);
    return null;
  }
  if (!response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function postJson(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  } catch (err) {
    console.warn('[questRunClient] post failed:', err);
    return null;
  }
  if (!response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchActiveQuest() {
  const data = await getJson(`${API_BASE}/quests/active`);
  return data?.quest ?? null;
}

export async function fetchQuestCodex() {
  const data = await getJson(`${API_BASE}/quests/codex`);
  return data ?? { activeQuest: null, history: [], generatedAt: new Date().toISOString() };
}

export async function fetchQuestHistory(limit = 20, includeActive = true) {
  const url = `${API_BASE}/quests/history?limit=${limit}&includeActive=${includeActive}`;
  const data = await getJson(url);
  return data?.entries ?? [];
}

export async function reportQuestComplete({ questId, character, outcome, rewardReceived = true, playerLevel = 1, runSummary }) {
  const body = {
    questId,
    character,
    outcome,
    rewardReceived,
    playerLevel,
    runSummary,
  };
  return await postJson(`${API_BASE}/quest/complete`, body);
}

// ─── Floor Objective Recovery ─────────────────────────────────────────────────

export function recheckFloorObjectives(layoutState) {
  if (!layoutState) return { enemiesRemaining: 0, chestsRemaining: 0, complete: true };
  const totalEnemies = layoutState.enemyCount ?? 0;
  const defeated = (layoutState.defeatedEnemyIds ?? []).length;
  const totalChests = (layoutState.chests ?? []).length;
  const opened = (layoutState.chests ?? []).filter((c) => c.opened).length;
  const enemiesRemaining = Math.max(0, totalEnemies - defeated);
  const chestsRemaining = Math.max(0, totalChests - opened);
  const complete = enemiesRemaining === 0 && chestsRemaining === 0;
  return { enemiesRemaining, chestsRemaining, complete };
}

export function resetBlockedFloorObjective(layoutState) {
  if (!layoutState) return false;

  // Respawn all enemies that haven't been registered as defeated yet
  // (runtime enemy respawn is handled by DungeonScene; this just marks them recoverable)
  const totalEnemies = layoutState.enemyCount ?? 0;
  const defeated = new Set(layoutState.defeatedEnemyIds ?? []);

  // For chests: reopen any chests that have no sprite (lost actors)
  // The scene must re-render to pick this up - this just resets the data layer
  let changed = false;
  if (layoutState.chests) {
    for (const chest of layoutState.chests) {
      if (!chest.opened && !chest._recoverable) {
        chest._recoverable = true;
        changed = true;
      }
    }
  }

  // If all enemies are defeated but some aren't tracked, force them as defeated
  if (defeated.size < totalEnemies && totalEnemies - defeated.size === 1) {
    const missingId = `${layoutState.id ?? 'dungeon'}:enemy-recovery-${Date.now()}`;
    layoutState.defeatedEnemyIds = [...defeated, missingId];
    layoutState.encounterCompleted = layoutState.defeatedEnemyIds.length >= totalEnemies;
    changed = true;
  }

  return changed;
}
