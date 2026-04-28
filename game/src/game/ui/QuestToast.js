const TOAST_DEPTH = 22000;
const TOAST_WIDTH = 280;
const TOAST_HEIGHT = 64;
const TOAST_MARGIN_X = 24;
const TOAST_MARGIN_Y = 24;
const TOAST_GAP = 12;
const TOAST_LIFETIME_MS = 4000;
const FADE_IN_MS = 200;
const FADE_OUT_MS = 250;
const MAX_VISIBLE = 2;

const PALETTE = {
  parchment: 0xe8d1a2,
  outerStroke: 0x55361f,
  startBand: 0x59b68a,
  startStroke: 0x30593f,
  completeBand: 0xf1ba84,
  completeStroke: 0x6c4423,
  textPrimary: '#2a2418',
  textSecondary: '#5c503a',
  glyph: '#3a2a16',
  shadow: 0x000000,
};

const activeToasts = [];

function repackPositions() {
  for (let i = 0; i < activeToasts.length; i += 1) {
    const toast = activeToasts[i];
    const yTarget = TOAST_MARGIN_Y + i * (TOAST_HEIGHT + TOAST_GAP);
    toast.scene.tweens.add({
      targets: toast.container,
      y: yTarget + TOAST_HEIGHT / 2,
      duration: 180,
      ease: 'sine.out',
    });
  }
}

function startFadeOut(toast) {
  if (toast.fadingOut) return;
  toast.fadingOut = true;
  if (toast.timer) {
    toast.timer.remove(false);
    toast.timer = null;
  }
  toast.scene.tweens.add({
    targets: toast.container,
    alpha: 0,
    duration: FADE_OUT_MS,
    ease: 'sine.in',
    onComplete: () => {
      const idx = activeToasts.indexOf(toast);
      if (idx >= 0) activeToasts.splice(idx, 1);
      toast.container.destroy();
      repackPositions();
    },
  });
}

export function spawnQuestToast(scene, { kind, title, bodyLine }) {
  if (!scene || !scene.add) return null;

  if (activeToasts.length >= MAX_VISIBLE) {
    startFadeOut(activeToasts[0]);
  }

  const isStart = kind === 'quest_start';
  const bandColor = isStart ? PALETTE.startBand : PALETTE.completeBand;
  const bandStroke = isStart ? PALETTE.startStroke : PALETTE.completeStroke;
  const headerLabel = isStart ? 'Quest started' : 'Quest complete';

  const x = scene.scale.width - TOAST_MARGIN_X - TOAST_WIDTH / 2;
  const yIndex = activeToasts.length;
  const y = TOAST_MARGIN_Y + yIndex * (TOAST_HEIGHT + TOAST_GAP) + TOAST_HEIGHT / 2;

  const container = scene.add.container(x, y);

  const shadow = scene.add.rectangle(0, 4, TOAST_WIDTH + 6, TOAST_HEIGHT + 6, PALETTE.shadow, 0.34);
  const card = scene.add.rectangle(0, 0, TOAST_WIDTH, TOAST_HEIGHT, PALETTE.parchment, 0.98)
    .setStrokeStyle(3, PALETTE.outerStroke, 0.95);
  const band = scene.add.rectangle(
    -TOAST_WIDTH / 2 + 6,
    0,
    8,
    TOAST_HEIGHT - 12,
    bandColor,
    1,
  ).setStrokeStyle(1, bandStroke, 1);

  const glyph = scene.add.text(-TOAST_WIDTH / 2 + 22, -TOAST_HEIGHT / 2 + 6, '✦', {
    fontFamily: 'monospace',
    fontSize: '20px',
    color: PALETTE.glyph,
  });

  const headerText = scene.add.text(-TOAST_WIDTH / 2 + 46, -TOAST_HEIGHT / 2 + 8, headerLabel, {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: PALETTE.textSecondary,
  });

  const titleText = scene.add.text(-TOAST_WIDTH / 2 + 46, -TOAST_HEIGHT / 2 + 24, title, {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: PALETTE.textPrimary,
    fontStyle: 'bold',
  });

  const bodyText = scene.add.text(-TOAST_WIDTH / 2 + 46, -TOAST_HEIGHT / 2 + 42, bodyLine ?? '', {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: PALETTE.textSecondary,
    wordWrap: { width: TOAST_WIDTH - 56 },
  });

  container.add([shadow, card, band, glyph, headerText, titleText, bodyText]);
  container.setDepth(TOAST_DEPTH);
  container.setScrollFactor(0);
  container.setAlpha(0);

  scene.tweens.add({
    targets: container,
    alpha: 1,
    duration: FADE_IN_MS,
    ease: 'sine.out',
  });

  const toast = {
    scene,
    container,
    fadingOut: false,
    timer: null,
  };

  toast.timer = scene.time.delayedCall(TOAST_LIFETIME_MS, () => {
    toast.timer = null;
    startFadeOut(toast);
  });

  activeToasts.push(toast);
  return toast;
}

export function clearAllToasts() {
  while (activeToasts.length) {
    const toast = activeToasts.pop();
    if (toast.timer) toast.timer.remove(false);
    toast.container.destroy();
  }
}
