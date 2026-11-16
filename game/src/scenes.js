// Title, draft, pause, victory and defeat screens, plus the deterministic
// screenshot staging: each ?shot= scene renders a fixed seeded frame.
import { sharedRandom } from './rng.js';
import { TempestSovereign } from './boss.js';
import { rollDraft } from './relics.js';

function dim(ctx) {
  ctx.fillStyle = 'rgba(4, 6, 16, 0.72)';
  ctx.fillRect(0, 0, 1280, 720);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function drawTitle(ctx, game, t) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 72px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = '#2fd8ff';
  ctx.shadowBlur = 30;
  ctx.fillText('AETHERDRIFT', 640, 190);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 19px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('RIDE THE STORM  ·  CHAIN THE KILLS  ·  TAME THE TEMPEST', 640, 228);
  ctx.fillStyle = 'rgba(4, 10, 24, 0.72)';
  ctx.fillRect(390, 268, 500, 208);
  ctx.strokeStyle = '#2fd8ff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(390, 268, 500, 208);
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  const lines = [
    'WASD / ARROWS — thrust with real momentum',
    'MOUSE — aim   ·   HOLD CLICK — fire cannons',
    'SPACE — dash through danger (briefly invulnerable)',
    'Chain kills to raise your combo multiplier, up to x5',
    'Clear a wave, draft 1 of 3 relics — every one has a cost',
    'Boss every 5th wave. Clear wave 15 to tame the storm.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 640, 300 + i * 28));
  ctx.fillStyle = '#7fa8cc';
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`BEST SCORE  ${game.best.toLocaleString('en-US')}`, 640, 512);
  if (Math.floor(t * 1.6) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRESS ENTER OR CLICK TO LAUNCH', 640, 556);
  }
  ctx.fillStyle = '#5f7fb0';
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('P pause   ·   M mute   ·   R restart', 640, 690);
  ctx.textAlign = 'left';
}

export function drawDraft(ctx, game, t) {
  dim(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 40px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('CHOOSE A RELIC', 640, 120);
  ctx.fillStyle = '#ffd34d';
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Every relic carries a cost. Pick with keys 1, 2, 3 — or click a card.', 640, 150);
  const cards = game.draftChoices;
  const w = 300;
  const h = 250;
  const gap = 30;
  const x0 = 640 - (w * 3 + gap * 2) / 2;
  const y0 = 220;
  cards.forEach((relic, i) => {
    const x = x0 + i * (w + gap);
    const hover = game.input.mouse.x >= x && game.input.mouse.x <= x + w && game.input.mouse.y >= y0 && game.input.mouse.y <= y0 + h;
    ctx.fillStyle = hover ? 'rgba(20, 42, 74, 0.95)' : 'rgba(8, 18, 40, 0.9)';
    ctx.fillRect(x, y0, w, h);
    ctx.strokeStyle = hover ? '#ffd34d' : '#2fd8ff';
    ctx.lineWidth = hover ? 3 : 1.5;
    ctx.strokeRect(x, y0, w, h);
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`[${i + 1}]`, x + w / 2, y0 + 34);
    ctx.fillStyle = '#e8f6ff';
    ctx.font = 'bold 21px "Segoe UI", system-ui, sans-serif';
    const name = relic.name;
    ctx.fillText(name, x + w / 2, y0 + 72);
    ctx.fillStyle = '#cfe8ff';
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    wrapText(ctx, relic.desc, x + w / 2, y0 + 112, w - 36, 22);
  });
  ctx.fillStyle = '#7fa8cc';
  ctx.font = '14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Wave ${game.wave} cleared  ·  Score ${game.score.toLocaleString('en-US')}`, 640, 530);
  ctx.textAlign = 'left';
}

export function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

export function drawPause(ctx, game) {
  dim(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PAUSED', 640, 300);
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('P — resume      R — restart run      M — mute', 640, 350);
  ctx.fillStyle = '#7fa8cc';
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Score ${game.score.toLocaleString('en-US')}  ·  Wave ${game.wave}  ·  Hull ${Math.ceil(game.skiff.hull)}`, 640, 392);
  ctx.textAlign = 'left';
}

function drawEndScreen(ctx, game, title, titleColor, prompt) {
  dim(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 58px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = titleColor;
  ctx.shadowBlur = 24;
  ctx.fillText(title, 640, 150);
  ctx.shadowBlur = 0;
  const s = game.endStats;
  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
  const rows = [
    `FINAL SCORE   ${s.score.toLocaleString('en-US')}`,
    `WAVE REACHED   ${s.wave}${s.wave >= 15 ? '  —  STORM TAMED' : ''}`,
    `FOES DOWNED   ${s.kills}`,
    `BEST COMBO CHAIN   ${s.bestChain}  (x${(1 + 0.25 * Math.max(0, s.bestChain - 1)).toFixed(2)})`,
    `FLIGHT TIME   ${formatTime(s.time)}`,
    `RELICS DRAFTED   ${s.relics}`,
  ];
  rows.forEach((row, i) => ctx.fillText(row, 640, 218 + i * 36));
  if (s.relicNames && s.relicNames.length > 0) {
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(s.relicNames.join('  ·  '), 640, 218 + rows.length * 36 + 8);
  }
  ctx.fillStyle = '#7fa8cc';
  ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`BEST SCORE   ${game.best.toLocaleString('en-US')}`, 640, 520);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 21px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(prompt, 640, 566);
  ctx.textAlign = 'left';
}

export function drawVictory(ctx, game) {
  drawEndScreen(ctx, game, 'STORM TAMED', '#3ddc78', 'ENTER — ENDLESS MODE   ·   R — NEW RUN');
}

export function drawDefeat(ctx, game) {
  drawEndScreen(ctx, game, 'THE STORM CLAIMS YOU', '#ff5a4d', 'ENTER — FLY AGAIN');
}

// Deterministic screenshot staging. Every scene reseeds the shared random
// source, builds a fixed state, simulates fixed steps, and renders at a
// fixed time, so the same seed reproduces the same pixels.
export function stageShot(game, name, seed = 1337) {
  sharedRandom.reseed(seed);
  game.audio.muted = true;
  if (name === 'play') {
    game.startRun();
    game.best = 18450;
    game.wave = 5;
    game.score = 8200;
    game.skiff.hull = 82;
    game.kills = 58;
    game.combo.chain = 9;
    game.combo.timer = game.combo.windowSeconds;
    game.skiff.x = 380;
    game.skiff.y = 560;
    game.skiff.vx = 0;
    game.skiff.vy = 0;
    const boss = new TempestSovereign(5, 700, 250);
    boss.hp = 240;
    boss.burstTimer = 0.4;
    boss.spreadTimer = 0.8;
    game.boss = boss;
    // Aim the scripted fire at the boss so its hits summon wisps and the
    // radial burst lands inside the captured frame.
    game.input.mouse.x = 700;
    game.input.mouse.y = 250;
    game.director.banner = null;
    game.director.bannerTimer = 0;
    game.director.queue = [];
    const escorts = [
      ['pirate', 520, 430, false],
      ['wisp', 300, 420, false],
      ['pirate', 620, 520, true],
      ['wisp', 470, 610, false],
      ['stormcaller', 560, 350, false],
    ];
    for (const [kind, x, y, elite] of escorts) game.spawnEnemy(kind, x, y, elite);
    game.spawnPickup('repair', 460, 500);
    game.spawnPickup('overcharge', 700, 480);
    game.spawnBullet(420, 540, 640, -40, 1);
    game.spawnBullet(460, 520, 620, -90, 1);
    game.time = 0;
    game.scriptInput = { x: 0.7, y: -0.7, fire: true };
    for (let i = 0; i < 21; i++) game.step(1 / 60);
    game.scriptInput = { x: 0, y: 0, fire: true };
    for (let i = 0; i < 54; i++) game.step(1 / 60);
    game.scriptInput = null;
    game.particles.strikeLightning(980);
    if (game.boss) game.boss.telegraph = { x: game.skiff.x, y: game.skiff.y, timer: 0.9, max: 0.9 };
    game.time = 1.458;
  } else if (name === 'title') {
    game.phase = 'title';
    game.best = 18450;
    game.time = 2.5;
    game.demoSkiff = { x: 170, y: 250, angle: 0.3 };
    game.demoWisp = { x: 1080, y: 200 };
  } else if (name === 'victory') {
    game.phase = 'victory';
    game.best = 18450;
    game.endStats = {
      score: 18450, wave: 15, kills: 212, bestChain: 23, time: 872, relics: 5,
      relicNames: ['TWIN CANNONS', 'SWIFT KEEL', 'COMBO EXTENDER', 'MAGNET COIL', 'NANOWEAVE HULL'],
    };
    game.time = 2.0;
  } else if (name === 'defeat') {
    game.phase = 'defeat';
    game.best = 18450;
    game.endStats = {
      score: 9310, wave: 9, kills: 118, bestChain: 14, time: 527, relics: 3,
      relicNames: ['TWIN CANNONS', 'HEAVY PLATING', 'MAGNET COIL'],
    };
    game.time = 2.0;
  }
  game.shotMode = true;
}
