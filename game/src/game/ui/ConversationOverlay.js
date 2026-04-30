import Phaser from 'phaser';
import {
  AiClientError,
  endConversation,
  sendMessage,
  startConversation,
} from '../services/aiClient.js';
import { getActiveArchetype } from '../npc/npcConfig.js';
import { getPlaytestLevel } from '../playtestProgression.js';

const OVERLAY_DEPTH = 21000;

const PALETTE = {
  backdrop: 0x081017,
  parchment: 0xe8d1a2,
  parchmentLight: 0xf4e5bb,
  outerStroke: 0x55361f,
  innerStroke: 0x7f5b34,
  headerBand: 0x59b68a,
  headerStroke: 0x30593f,
  textPrimary: '#2a2418',
  textSecondary: '#5c503a',
  textHeader: '#20311c',
  textNpc: '#3d2f1a',
  textPlayer: '#244a32',
  errorBand: 0xb1494a,
  errorStroke: 0x6e2a2c,
};

const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 420;
const PORTRAIT_REGION_WIDTH = 168;
const INPUT_REGION_HEIGHT = 56;

export class ConversationOverlay {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.sessionId = null;
    this.npc = null;
    this.lines = [];
    this.awaiting = false;
    this.terminated = false;
    this.errorMessage = null;
    this.autoCloseTimer = null;
    this._generation = 0;

    this.escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.upKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

    this.build();
    this.setVisible(false);
  }

  build() {
    const { width, height } = this.scene.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const panelLeft = centerX - PANEL_WIDTH / 2;
    const panelTop = centerY - PANEL_HEIGHT / 2;

    this.elements = [];

    this.backdrop = this.scene.add.rectangle(centerX, centerY, width, height, PALETTE.backdrop, 0.72);
    this.panelShadow = this.scene.add.rectangle(centerX, centerY + 10, PANEL_WIDTH + 26, PANEL_HEIGHT + 24, 0x000000, 0.34);
    this.panelFrame = this.scene.add.rectangle(centerX, centerY, PANEL_WIDTH, PANEL_HEIGHT, PALETTE.parchment, 0.98)
      .setStrokeStyle(4, PALETTE.outerStroke, 0.9);

    this.headerBand = this.scene.add.rectangle(centerX, panelTop + 24, PANEL_WIDTH - 32, 34, PALETTE.headerBand, 1)
      .setStrokeStyle(3, PALETTE.headerStroke, 0.95);
    this.titleText = this.scene.add.text(panelLeft + 28, panelTop + 12, 'Conversation', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: PALETTE.textHeader,
    });
    this.subtitleText = this.scene.add.text(panelLeft + 24, panelTop + PANEL_HEIGHT - 24, 'Esc to leave | Mouse wheel / ↑↓ scroll', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#36503a',
    });

    const portraitX = panelLeft + 24;
    const portraitTop = panelTop + 60;
    this.portraitFrame = this.scene.add.rectangle(
      portraitX + PORTRAIT_REGION_WIDTH / 2,
      portraitTop + PORTRAIT_REGION_WIDTH / 2,
      PORTRAIT_REGION_WIDTH,
      PORTRAIT_REGION_WIDTH,
      PALETTE.parchmentLight,
      1,
    ).setStrokeStyle(3, PALETTE.innerStroke, 0.95);
    this.portrait = this.scene.add.image(
      portraitX + PORTRAIT_REGION_WIDTH / 2,
      portraitTop + PORTRAIT_REGION_WIDTH / 2,
      'npc-girl-1-dialogue',
      0,
    );
    this.portrait.setVisible(false);

    this.nameLabel = this.scene.add.text(
      portraitX + PORTRAIT_REGION_WIDTH / 2,
      portraitTop + PORTRAIT_REGION_WIDTH + 12,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: PALETTE.textPrimary,
      },
    ).setOrigin(0.5, 0);

    this.archetypeLabel = this.scene.add.text(
      portraitX + PORTRAIT_REGION_WIDTH / 2,
      portraitTop + PORTRAIT_REGION_WIDTH + 32,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: PALETTE.textSecondary,
      },
    ).setOrigin(0.5, 0);

    const dialogueLeft = panelLeft + 24 + PORTRAIT_REGION_WIDTH + 18;
    const dialogueTop = panelTop + 60;
    const dialogueWidth = PANEL_WIDTH - (24 + PORTRAIT_REGION_WIDTH + 18 + 24);
    const dialogueHeight = PANEL_HEIGHT - 60 - INPUT_REGION_HEIGHT - 36;

    this.dialoguePanel = this.scene.add.rectangle(
      dialogueLeft + dialogueWidth / 2,
      dialogueTop + dialogueHeight / 2,
      dialogueWidth,
      dialogueHeight,
      PALETTE.parchmentLight,
      1,
    ).setStrokeStyle(3, PALETTE.innerStroke, 0.95);

    const dialogueHtml = `<div tabindex="0" style="
      width: ${dialogueWidth - 24}px;
      height: ${dialogueHeight - 42}px;
      overflow-y: auto;
      overflow-x: hidden;
      font-family: monospace;
      font-size: 14px;
      color: ${PALETTE.textPrimary};
      line-height: 1.35;
      padding: 6px 4px;
      box-sizing: border-box;
      outline: none;
      background: #f4e5bb;
    "><div data-chat-log style="display:flex;flex-direction:column;gap:8px;"></div></div>`;
    this.dialogueDom = this.scene.add.dom(
      dialogueLeft + 12 + (dialogueWidth - 24) / 2,
      dialogueTop + 12 + (dialogueHeight - 42) / 2,
    ).createFromHTML(dialogueHtml);
    this.dialogueElement = this.dialogueDom.node;
    this.dialogueLogElement = this.dialogueElement?.querySelector?.('[data-chat-log]') ?? null;

    this.statusText = this.scene.add.text(
      dialogueLeft + 12,
      dialogueTop + dialogueHeight - 24,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: PALETTE.textSecondary,
      },
    );

    const inputTop = panelTop + PANEL_HEIGHT - INPUT_REGION_HEIGHT - 24;
    const inputWidth = PANEL_WIDTH - 48;
    this.inputFrame = this.scene.add.rectangle(
      panelLeft + 24 + inputWidth / 2,
      inputTop + INPUT_REGION_HEIGHT / 2,
      inputWidth,
      INPUT_REGION_HEIGHT,
      PALETTE.parchmentLight,
      1,
    ).setStrokeStyle(3, PALETTE.innerStroke, 0.95);

    const inputHtml = `<input type="text" maxlength="3900" style="
      width: ${inputWidth - 24}px;
      height: ${INPUT_REGION_HEIGHT - 18}px;
      box-sizing: border-box;
      background: #f4e5bb;
      color: #2a2418;
      font-family: monospace;
      font-size: 14px;
      padding: 6px 10px;
      border: 2px solid #7f5b34;
      outline: none;
    " placeholder="Press Enter to send..." />`;
    this.inputDom = this.scene.add.dom(
      panelLeft + 24 + inputWidth / 2,
      inputTop + INPUT_REGION_HEIGHT / 2,
    ).createFromHTML(inputHtml);
    this.inputElement = this.inputDom.getChildByName ? null : null;
    const node = this.inputDom.node;
    if (node) {
      const input = node.tagName === 'INPUT' ? node : node.querySelector('input');
      this.inputElement = input;
      if (input) {
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            this.handleSubmit();
            return;
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.close();
            return;
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            this.scrollTranscriptBy(-32);
            return;
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault();
            event.stopPropagation();
            this.scrollTranscriptBy(32);
            return;
          }

          event.stopPropagation();
        });
      }
    }

    this.errorBand = this.scene.add.rectangle(
      centerX,
      panelTop + PANEL_HEIGHT - INPUT_REGION_HEIGHT - 56,
      PANEL_WIDTH - 48,
      28,
      PALETTE.errorBand,
      0.92,
    ).setStrokeStyle(2, PALETTE.errorStroke, 1);
    this.errorText = this.scene.add.text(
      panelLeft + 32,
      panelTop + PANEL_HEIGHT - INPUT_REGION_HEIGHT - 68,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#fff7d9',
      },
    );

    this.elements.push(
      this.backdrop,
      this.panelShadow,
      this.panelFrame,
      this.headerBand,
      this.titleText,
      this.subtitleText,
      this.portraitFrame,
      this.portrait,
      this.nameLabel,
      this.archetypeLabel,
      this.dialoguePanel,
      this.dialogueDom,
      this.statusText,
      this.inputFrame,
      this.inputDom,
      this.errorBand,
      this.errorText,
    );

    for (const element of this.elements) {
      element.setScrollFactor(0);
      element.setDepth(OVERLAY_DEPTH);
    }

    this.errorBand.setVisible(false);
    this.errorText.setVisible(false);
  }

  setVisible(visible) {
    for (const element of this.elements) {
      element.setVisible(visible);
    }
    if (visible) {
      this.errorBand.setVisible(Boolean(this.errorMessage));
      this.errorText.setVisible(Boolean(this.errorMessage));
    }
  }

  async open(npc) {
    if (this.isOpen) return;
    this.isOpen = true;
    this._generation += 1;
    this.npc = npc;
    this.sessionId = null;
    this.lines = [];
    this.terminated = false;
    this.errorMessage = null;
    this.awaiting = false;
    this.cancelAutoClose();

    this.nameLabel.setText(npc.displayName ?? 'NPC');
    const archetype = getActiveArchetype(npc) ?? npc.archetype ?? '';
    this.archetypeLabel.setText(archetype ? `(${archetype})` : '');
    this.portrait.setTexture(npc.portraitKey ?? 'npc-girl-1-dialogue', 0);
    this.portrait.setVisible(true);
    this.fitPortrait();
    this.refresh();
    this.setVisible(true);
    this.focusInput();

    await this.startSession(archetype);
  }

  fitPortrait() {
    const targetSize = PORTRAIT_REGION_WIDTH - 16;
    const tex = this.portrait.texture;
    const frame = tex && tex.get && tex.get(0);
    const w = frame?.width ?? this.portrait.width;
    const h = frame?.height ?? this.portrait.height;
    if (!w || !h) return;
    const scale = Math.min(targetSize / w, targetSize / h);
    this.portrait.setScale(scale);
  }

  focusInput() {
    if (this.inputElement) {
      try {
        this.inputElement.focus();
      } catch {
        // ignore
      }
    }
  }

  async startSession(archetype) {
    const gen = this._generation;
    this.awaiting = true;
    this.refresh();
    try {
      const response = await startConversation(archetype || this.npc?.archetype || 'general', getPlaytestLevel());
      if (this._generation !== gen) return;
      this.sessionId = response.sessionId;
      if (response.greeting) {
        this.appendLine('npc', response.greeting);
      }
      this.errorMessage = null;
    } catch (err) {
      if (this._generation !== gen) return;
      this.handleError(err, 'start');
    } finally {
      if (this._generation === gen) {
        this.awaiting = false;
        this.refresh();
        this.focusInput();
      }
    }
  }

  async handleSubmit() {
    if (this.awaiting || this.terminated || !this.sessionId) {
      return;
    }
    if (!this.inputElement) return;
    const text = String(this.inputElement.value ?? '').trim();
    if (!text) return;
    this.inputElement.value = '';
    this.appendLine('player', text);
    this.awaiting = true;
    this.errorMessage = null;
    this.refresh();
    try {
      const response = await sendMessage(this.sessionId, text);
      if (response.reply) {
        this.appendLine('npc', response.reply);
      }
      if (response.terminated) {
        this.terminated = true;
        this.scheduleAutoClose();
      }
    } catch (err) {
      this.handleError(err, 'send');
    } finally {
      this.awaiting = false;
      this.refresh();
      this.focusInput();
    }
  }

  handleError(err, _phase) {
    if (err instanceof AiClientError) {
      if (err.code === 'lm_studio_unavailable') {
        this.errorMessage = 'LM Studio is offline. Start it on localhost:1234, then press Enter to retry.';
      } else if (err.code === 'session_terminated') {
        this.errorMessage = 'Conversation already ended.';
        this.terminated = true;
        this.scheduleAutoClose();
      } else if (err.code === 'session_not_found') {
        this.errorMessage = 'Session expired. Press Esc and try again.';
        this.terminated = true;
      } else if (err.code === 'network_error') {
        this.errorMessage = 'Network error reaching the AI bridge.';
      } else {
        this.errorMessage = err.message || `Error: ${err.code}`;
      }
    } else {
      this.errorMessage = (err && err.message) ? err.message : 'Unexpected error.';
    }
  }

  appendLine(speaker, text) {
    this.lines.push({ speaker, text });
  }

  refresh() {
    if (!this.isOpen) return;

    if (this.dialogueElement && this.dialogueLogElement) {
      const wasNearBottom = this.isTranscriptNearBottom();
      this.dialogueLogElement.replaceChildren();

      for (const line of this.lines) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
        row.style.alignItems = line.speaker === 'player' ? 'flex-end' : 'flex-start';

        const speaker = document.createElement('div');
        speaker.textContent = line.speaker === 'player' ? 'You' : (this.npc?.displayName ?? 'NPC');
        speaker.style.fontSize = '11px';
        speaker.style.color = line.speaker === 'player' ? '#2f6f4a' : '#664b26';
        speaker.style.marginBottom = '2px';

        const bubble = document.createElement('div');
        bubble.textContent = line.text;
        bubble.style.maxWidth = '92%';
        bubble.style.padding = '6px 8px';
        bubble.style.border = line.speaker === 'player' ? '1px solid #73a07b' : '1px solid #ad915f';
        bubble.style.background = line.speaker === 'player' ? '#dfefdf' : '#efe1bf';
        bubble.style.color = line.speaker === 'player' ? '#244a32' : '#3d2f1a';
        bubble.style.whiteSpace = 'pre-wrap';

        row.appendChild(speaker);
        row.appendChild(bubble);
        this.dialogueLogElement.appendChild(row);
      }

      if (this.awaiting) {
        const waiting = document.createElement('div');
        waiting.textContent = `${this.npc?.displayName ?? 'NPC'} is typing...`;
        waiting.style.fontSize = '12px';
        waiting.style.color = '#5c503a';
        waiting.style.fontStyle = 'italic';
        this.dialogueLogElement.appendChild(waiting);
      }

      if (wasNearBottom || this.awaiting) {
        this.scrollTranscriptToBottom();
      }
    }

    let status = '';
    if (this.terminated) {
      status = 'Conversation ended. Closing...';
    } else if (this.awaiting) {
      status = 'Waiting for reply...';
    }
    this.statusText.setText(status);

    const showError = Boolean(this.errorMessage);
    this.errorBand.setVisible(showError);
    this.errorText.setVisible(showError);
    this.errorText.setText(this.errorMessage ?? '');

    if (this.inputElement) {
      const disabled = this.awaiting || this.terminated || !this.sessionId;
      this.inputElement.disabled = disabled;
    }
  }

  scheduleAutoClose() {
    this.cancelAutoClose();
    this.autoCloseTimer = this.scene.time.delayedCall(1500, () => {
      this.autoCloseTimer = null;
      this.close();
    });
  }

  cancelAutoClose() {
    if (this.autoCloseTimer) {
      this.autoCloseTimer.remove(false);
      this.autoCloseTimer = null;
    }
  }

  update() {
    if (!this.isOpen) return false;
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.close();
      return true;
    }

    if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.scrollTranscriptBy(-32);
      return true;
    }

    if (Phaser.Input.Keyboard.JustDown(this.downKey)) {
      this.scrollTranscriptBy(32);
      return true;
    }

    return true;
  }

  scrollTranscriptBy(delta) {
    if (!this.dialogueElement || !Number.isFinite(delta)) return;
    this.dialogueElement.scrollTop += delta;
  }

  scrollTranscriptToBottom() {
    if (!this.dialogueElement) return;
    this.dialogueElement.scrollTop = this.dialogueElement.scrollHeight;
  }

  isTranscriptNearBottom() {
    if (!this.dialogueElement) return true;
    const remaining = this.dialogueElement.scrollHeight - this.dialogueElement.scrollTop - this.dialogueElement.clientHeight;
    return remaining < 20;
  }

  close() {
    if (!this.isOpen) return;
    const sessionId = this.sessionId;
    this.isOpen = false;
    this.cancelAutoClose();
    this.setVisible(false);
    if (this.inputElement) {
      this.inputElement.value = '';
      try { this.inputElement.blur(); } catch { /* ignore */ }
    }
    if (sessionId && !this.terminated) {
      endConversation(sessionId, 'exit').catch(() => {
        // best effort — ignore
      });
    }
    this.sessionId = null;
    this.lines = [];
    this.terminated = false;
    this.errorMessage = null;
    this.awaiting = false;
  }
}
