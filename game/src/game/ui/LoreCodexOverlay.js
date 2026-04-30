import { fetchQuestCodex } from '../services/questRunClient.js';

const OVERLAY_DEPTH = 20500;

const PALETTE = {
  backdrop: 0x081017,
  parchment: 0xe8d1a2,
  parchmentLight: 0xf4e5bb,
  outerStroke: 0x55361f,
  innerStroke: 0x7f5b34,
  headerBand: 0x4a6f8e,
  headerStroke: 0x2a3f54,
  activeBand: 0x59b68a,
  activeStroke: 0x30593f,
  historyBand: 0xd4a85c,
  historyStroke: 0x6c4423,
  textPrimary: '#2a2418',
  textSecondary: '#5c503a',
  textHeader: '#eef4ff',
  textActive: '#173020',
  textHistory: '#3a2a16',
};

const PANEL_WIDTH = 640;
const PANEL_HEIGHT = 480;

export class LoreCodexOverlay {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this._loading = false;
    this.elements = [];
    this._entryElements = [];
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
    this.panelShadow = this.scene.add.rectangle(cx, cy + 8, PANEL_WIDTH + 20, PANEL_HEIGHT + 20, 0x000000, 0.32);
    this.panelFrame = this.scene.add.rectangle(cx, cy, PANEL_WIDTH, PANEL_HEIGHT, PALETTE.parchment, 0.97)
      .setStrokeStyle(4, PALETTE.outerStroke, 0.9);
    this.headerBand = this.scene.add.rectangle(cx, top + 24, PANEL_WIDTH - 32, 34, PALETTE.headerBand, 1)
      .setStrokeStyle(3, PALETTE.headerStroke, 0.95);
    this.titleText = this.scene.add.text(left + 28, top + 12, 'Lore Codex', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: PALETTE.textHeader,
    });
    this.subtitleText = this.scene.add.text(left + 24, top + PANEL_HEIGHT - 22, 'C / Esc to close', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#5c503a',
    });

    this.loadingText = this.scene.add.text(cx, cy, 'Loading...', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: PALETTE.textSecondary,
    }).setOrigin(0.5);

    const scrollHtml = `<div style="
      width: ${PANEL_WIDTH - 48}px;
      height: ${PANEL_HEIGHT - 96}px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 13px;
      padding: 8px 4px;
      box-sizing: border-box;
      background: transparent;
    "><div data-codex-entries style="display:flex;flex-direction:column;gap:10px;"></div></div>`;
    this.scrollDom = this.scene.add.dom(cx, top + 58 + (PANEL_HEIGHT - 96) / 2).createFromHTML(scrollHtml);
    this.scrollEl = this.scrollDom.node;
    this.entriesEl = this.scrollEl?.querySelector?.('[data-codex-entries]') ?? null;

    this.elements.push(
      this.backdrop,
      this.panelShadow,
      this.panelFrame,
      this.headerBand,
      this.titleText,
      this.subtitleText,
      this.loadingText,
      this.scrollDom,
    );

    for (const el of this.elements) {
      el.setScrollFactor(0);
      el.setDepth(OVERLAY_DEPTH);
    }
  }

  _setVisible(visible) {
    for (const el of this.elements) {
      el.setVisible(visible);
    }
  }

  async open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this._loading = true;
    this.loadingText.setVisible(true);
    if (this.entriesEl) this.entriesEl.replaceChildren();
    this._setVisible(true);

    try {
      const codex = await fetchQuestCodex();
      if (!this.isOpen) return;
      this._renderCodex(codex);
    } catch {
      if (!this.isOpen) return;
      if (this.entriesEl) {
        this.entriesEl.textContent = 'Failed to load quest history.';
      }
    } finally {
      this._loading = false;
      this.loadingText.setVisible(false);
    }
  }

  _renderCodex(codex) {
    if (!this.entriesEl) return;
    this.entriesEl.replaceChildren();

    const active = codex?.activeQuest;
    if (active) {
      this.entriesEl.appendChild(this._makeEntry(active, true));
    }

    const history = Array.isArray(codex?.history) ? codex.history : [];
    for (const entry of history) {
      this.entriesEl.appendChild(this._makeEntry(entry, false));
    }

    if (!active && history.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No quests recorded yet.';
      empty.style.color = '#5c503a';
      empty.style.fontStyle = 'italic';
      this.entriesEl.appendChild(empty);
    }
  }

  _makeEntry(entry, isActive) {
    const card = document.createElement('div');
    card.style.border = `2px solid ${isActive ? '#30593f' : '#7f5b34'}`;
    card.style.background = isActive ? '#d8f0e0' : '#efe1bf';
    card.style.padding = '8px 10px';
    card.style.borderRadius = '3px';

    const badge = document.createElement('div');
    badge.textContent = isActive ? '⚔ Active Quest' : '✓ Completed';
    badge.style.fontSize = '11px';
    badge.style.color = isActive ? '#173020' : '#5c503a';
    badge.style.marginBottom = '4px';
    badge.style.fontWeight = 'bold';

    const title = document.createElement('div');
    title.textContent = entry.title ?? entry.questId ?? 'Unknown Quest';
    title.style.fontSize = '14px';
    title.style.color = '#2a2418';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '3px';

    const character = document.createElement('div');
    character.textContent = `NPC: ${entry.character ?? '—'}`;
    character.style.fontSize = '12px';
    character.style.color = '#5c503a';
    character.style.marginBottom = '4px';

    card.appendChild(badge);
    card.appendChild(title);
    card.appendChild(character);

    if (entry.lore) {
      const lore = document.createElement('div');
      lore.textContent = entry.lore;
      lore.style.fontSize = '12px';
      lore.style.color = '#3a2a16';
      lore.style.fontStyle = 'italic';
      lore.style.marginTop = '4px';
      card.appendChild(lore);
    }

    if (!isActive && entry.summary) {
      const summary = document.createElement('div');
      summary.textContent = entry.summary;
      summary.style.fontSize = '12px';
      summary.style.color = '#664b26';
      summary.style.marginTop = '4px';
      card.appendChild(summary);
    }

    return card;
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._setVisible(false);
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  update() {
    // Placeholder — keyboard handling is done in OverworldScene.update()
  }

  destroy() {
    this.close();
    for (const el of this.elements) {
      try { el.destroy(); } catch { /* ignore */ }
    }
    this.elements = [];
  }
}
