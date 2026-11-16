// Drawing: the storm backdrop, the world (pickups, enemies, boss, bullets,
// skiff, particles, telegraphs), the HUD, and the wave banner.
import { drawEnemy } from './entities.js';

export function drawBackdrop(ctx, game, t) {
  game.particles.drawBackdrop(ctx, t);
}

export function drawWorld(ctx, game, t) {
  for (const pk of game.pickups) pk.draw(ctx);
  for (const e of game.enemies) drawEnemy(ctx, e, t);
  if (game.boss) game.boss.draw(ctx, t);
  for (const b of game.bullets) b.draw(ctx);
  for (const b of game.enemyBullets) b.draw(ctx);
  if (game.boss && game.boss.telegraph) {
    const tg = game.boss.telegraph;
    const strength = 0.5 + 0.5 * Math.sin(t * 14);
    ctx.globalAlpha = 0.35 + 0.4 * strength;
    ctx.strokeStyle = '#ff3b30';
    ctx.fillStyle = 'rgba(255, 59, 48, 0.16)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(tg.x, tg.y, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.5 + 0.4 * strength;
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.moveTo(tg.x + 4, tg.y - 20);
    ctx.lineTo(tg.x - 8, tg.y + 4);
    ctx.lineTo(tg.x - 1, tg.y + 4);
    ctx.lineTo(tg.x - 5, tg.y + 20);
    ctx.lineTo(tg.x + 8, tg.y - 4);
    ctx.lineTo(tg.x + 1, tg.y - 4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  game.skiff.draw(ctx, t);
  game.particles.draw(ctx);
}

export function drawHUD(ctx, game) {
  const skiff = game.skiff;
  const stats = game.stats;
  ctx.textBaseline = 'alphabetic';
  // Top-left: hull + dash.
  ctx.fillStyle = 'rgba(4, 10, 24, 0.55)';
  ctx.fillRect(16, 14, 220, 52);
  ctx.fillStyle = '#0d2b3d';
  ctx.fillRect(24, 22, 204, 16);
  const hullFrac = Math.max(0, skiff.hull / stats.maxHull);
  ctx.fillStyle = hullFrac > 0.5 ? '#3ddc78' : hullFrac > 0.25 ? '#ffd34d' : '#ff5a4d';
  ctx.fillRect(24, 22, 204 * hullFrac, 16);
  ctx.strokeStyle = '#2fd8ff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(24, 22, 204, 16);
  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`HULL ${Math.ceil(skiff.hull)}/${stats.maxHull}`, 28, 34);
  ctx.fillStyle = '#0d2b3d';
  ctx.fillRect(24, 44, 204, 8);
  const dashFrac = stats.dashRecharge > 0 ? 1 - Math.max(0, skiff.dashCooldown) / stats.dashRecharge : 1;
  ctx.fillStyle = '#2fd8ff';
  ctx.fillRect(24, 44, 204 * dashFrac, 8);
  ctx.fillStyle = '#7fa8cc';
  ctx.font = '11px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('DASH — SPACE', 28, 62);
  if (game.overchargeTimer > 0) {
    ctx.fillStyle = '#ff9a3d';
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`OVERCHARGE ${game.overchargeTimer.toFixed(1)}s`, 24, 84);
  }
  // Top-center: score + wave + boss bar.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(game.score.toLocaleString('en-US'), 640, 42);
  ctx.fillStyle = '#7fa8cc';
  ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${game.wave}/15${game.endless ? ' — ENDLESS' : ''}`, 640, 62);
  if (game.boss) {
    const b = game.boss;
    ctx.fillStyle = 'rgba(4, 10, 24, 0.55)';
    ctx.fillRect(480, 70, 320, 30);
    ctx.fillStyle = '#b46bff';
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('TEMPEST SOVEREIGN', 640, 84);
    ctx.fillStyle = '#1a0b33';
    ctx.fillRect(492, 90, 296, 8);
    ctx.fillStyle = '#b46bff';
    ctx.fillRect(492, 90, 296 * Math.max(0, b.hp / b.maxHp), 8);
  }
  // Top-right: combo.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`x${game.combo.multiplier.toFixed(2)}`, 1256, 42);
  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`${game.combo.chain} CHAINED KILLS`, 1256, 62);
  if (game.combo.chain > 0) {
    ctx.fillStyle = '#1a0b33';
    ctx.fillRect(1116, 68, 140, 6);
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(1116, 68, 140 * (game.combo.timer / game.combo.windowSeconds), 6);
  }
  // Bottom-right: best score.
  ctx.fillStyle = '#7fa8cc';
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`BEST ${game.best.toLocaleString('en-US')}`, 1256, 706);
  ctx.textAlign = 'left';
}

export function drawBanner(ctx, game, t) {
  const d = game.director;
  if (!d.banner || d.bannerTimer <= 0) return;
  const a = Math.min(1, d.bannerTimer / 0.5) * Math.min(1, (1.8 - d.bannerTimer) / 0.25 + 0.2);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 64px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = '#2fd8ff';
  ctx.shadowBlur = 26;
  ctx.fillText(d.banner.text, 640, 330);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(d.banner.sub, 640, 362);
  ctx.restore();
}

export function drawScene(ctx, game, t) {
  ctx.save();
  ctx.translate(game.particles.shakeX, game.particles.shakeY);
  drawBackdrop(ctx, game, t);
  drawWorld(ctx, game, t);
  ctx.restore();
  drawHUD(ctx, game);
  drawBanner(ctx, game, t);
}
