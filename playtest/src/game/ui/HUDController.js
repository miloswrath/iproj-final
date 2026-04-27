import { QuestEventStream } from '../services/questEvents.js';
import { spawnQuestToast, clearAllToasts } from './QuestToast.js';

function titleFromQuestId(questId) {
  if (typeof questId !== 'string' || !questId) return 'Quest';
  const parts = questId.split('_');
  const slug = parts.length >= 3 ? parts.slice(2).join('_') : parts[parts.length - 1];
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatBodyLine(payload, kind) {
  const character = typeof payload?.character === 'string' ? payload.character : 'Unknown';
  if (kind === 'quest_complete') {
    const outcome = typeof payload?.outcome === 'string' ? payload.outcome : 'success';
    return `${character} · ${outcome}`;
  }
  return character;
}

export class HUDController {
  constructor(scene) {
    this.scene = scene;
    this.events = new QuestEventStream();

    this.unsubscribeStart = this.events.onQuestStart((payload) => {
      this.handleQuestEvent('quest_start', payload);
    });
    this.unsubscribeComplete = this.events.onQuestComplete((payload) => {
      this.handleQuestEvent('quest_complete', payload);
    });
  }

  handleQuestEvent(kind, payload) {
    if (!this.scene || !this.scene.scene || !this.scene.scene.isActive()) return;
    const title = titleFromQuestId(payload?.questId);
    const bodyLine = formatBodyLine(payload, kind);
    spawnQuestToast(this.scene, { kind, title, bodyLine });
  }

  destroy() {
    if (this.unsubscribeStart) {
      this.unsubscribeStart();
      this.unsubscribeStart = null;
    }
    if (this.unsubscribeComplete) {
      this.unsubscribeComplete();
      this.unsubscribeComplete = null;
    }
    if (this.events) {
      this.events.dispose();
      this.events = null;
    }
    clearAllToasts();
  }
}
