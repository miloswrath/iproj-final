import { fetchFriendRoster } from '../services/questRunClient.js';

const OVERLAY_DEPTH = 20600;

const PALETTE = {
  backdrop: 0x081017,
  parchment: 0xe8d1a2,
  outerStroke: 0x55361f,
  headerBand: 0x8c6c45,
  headerStroke: 0x4d341d,
  textHeader: '#fff6e1',
  textPrimary: '#2a2418',
  textSecondary: '#5c503a',
};

const PANEL_WIDTH = 620;
const PANEL_HEIGHT = 440;

export class FriendRosterOverlay {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.elements = [];
    this._build();
    this._setVisible(false);
  }

  _build() {
    const { width, height } = this.scene.scale;
    const cx = width / 2;
    const cy = height / 2;
    const left = cx - PANEL_WIDTH / 2;
    const top = cy - PANEL_HEIGHT / 2;

    this.backdrop = this.scene.add.rectangle(cx, cy, width, height, PALETTE.backdrop, 0.68);
    this.panel = this.scene.add.rectangle(cx, cy, PANEL_WIDTH, PANEL_HEIGHT, PALETTE.parchment, 0.98)
      .setStrokeStyle(4, PALETTE.outerStroke, 0.92);
    this.header = this.scene.add.rectangle(cx, top + 24, PANEL_WIDTH - 32, 34, PALETTE.headerBand, 1)
      .setStrokeStyle(3, PALETTE.headerStroke, 0.95);
    this.title = this.scene.add.text(left + 24, top + 12, 'Friend Roster', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: PALETTE.textHeader,
    });
    this.subtitle = this.scene.add.text(left + 24, top + PANEL_HEIGHT - 22, 'F / Esc to close', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: PALETTE.textSecondary,
    });
    this.loading = this.scene.add.text(cx, cy, 'Loading...', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: PALETTE.textSecondary,
    }).setOrigin(0.5);

    const html = `<div style="
      width:${PANEL_WIDTH - 48}px;
      height:${PANEL_HEIGHT - 96}px;
      overflow-y:auto;
      font-family:monospace;
      font-size:13px;
      padding:8px 4px;
      box-sizing:border-box;
    "><div data-friends style="display:flex;flex-direction:column;gap:10px;"></div></div>`;
    this.scrollDom = this.scene.add.dom(cx, top + 58 + (PANEL_HEIGHT - 96) / 2).createFromHTML(html);
    this.scrollNode = this.scrollDom.node;
    this.entriesNode = this.scrollNode?.querySelector?.('[data-friends]') ?? null;

    this.elements.push(this.backdrop, this.panel, this.header, this.title, this.subtitle, this.loading, this.scrollDom);
    for (const element of this.elements) {
      element.setScrollFactor(0);
      element.setDepth(OVERLAY_DEPTH);
    }
  }

  _setVisible(visible) {
    for (const element of this.elements) {
      element.setVisible(visible);
    }
  }

  async open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this._setVisible(true);
    this.loading.setVisible(true);
    if (this.entriesNode) this.entriesNode.replaceChildren();
    try {
      const roster = await fetchFriendRoster();
      if (!this.isOpen) return;
      this._render(roster?.friends ?? []);
    } catch {
      if (this.entriesNode) {
        this.entriesNode.textContent = 'Failed to load friend roster.';
      }
    } finally {
      this.loading.setVisible(false);
    }
  }

  _render(friends) {
    if (!this.entriesNode) return;
    this.entriesNode.replaceChildren();

    if (!Array.isArray(friends) || friends.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No friends yet. Finish an NPC arc to unlock this roster.';
      empty.style.color = PALETTE.textSecondary;
      empty.style.fontStyle = 'italic';
      this.entriesNode.appendChild(empty);
      return;
    }

    for (const friend of friends) {
      const card = document.createElement('div');
      card.style.border = '2px solid #7f5b34';
      card.style.background = '#f4e5bb';
      card.style.padding = '8px 10px';
      card.style.borderRadius = '4px';

      const title = document.createElement('div');
      title.textContent = `${friend.displayName} (${friend.archetype})`;
      title.style.fontWeight = 'bold';
      title.style.color = PALETTE.textPrimary;
      title.style.marginBottom = '4px';

      const summary = document.createElement('div');
      summary.textContent = friend.summaryText;
      summary.style.color = '#3d2f1a';
      summary.style.marginBottom = '6px';

      const highlights = document.createElement('div');
      const list = Array.isArray(friend.questHighlights) && friend.questHighlights.length > 0
        ? friend.questHighlights.slice(0, 3).join(' • ')
        : 'No quest highlights recorded yet.';
      highlights.textContent = list;
      highlights.style.color = PALETTE.textSecondary;
      highlights.style.fontSize = '12px';

      card.append(title, summary, highlights);
      this.entriesNode.appendChild(card);
    }
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._setVisible(false);
  }

  destroy() {
    this.close();
    for (const element of this.elements) {
      try { element.destroy(); } catch { /* ignore */ }
    }
    this.elements = [];
  }
}
