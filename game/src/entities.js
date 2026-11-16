// The skiff, the three enemy kinds, bullets and pickups: their movement,
// their drawing, and nothing else. Combat rules live in game.js.
import { sharedRandom } from './rng.js';

export const ENEMY_SCORE = { pirate: 100, wisp: 80, stormcaller: 150, elite: 400, boss: 5000 };

export class SkiffShip {
  constructor() {
    this.x = 640;
    this.y = 560;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.radius = 14;
    this.hull = 100;
    this.fireCooldown = 0;
    this.dashCooldown = 0;
    this.invuln = 0;
    this.aegisTimer = 0;
    this.thrusting = false;
    this.dashing = false;
    this.ribbon = [];
    this.flame = 0;
  }

  draw(ctx, t) {
    // Persistent thrust ribbon so the path and speed read at a glance.
    for (const p of this.ribbon) {
      ctx.globalAlpha = (p.life / 0.55) * 0.5;
      ctx.fillStyle = '#ff9a3d';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const blink = this.invuln > 0 && Math.floor(t * 18) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.45;
    // Bright cyan under-glow: the skiff must be findable in one glance.
    const glow = ctx.createRadialGradient(this.x, this.y, 4, this.x, this.y, 34);
    glow.addColorStop(0, 'rgba(47, 216, 255, 0.55)');
    glow.addColorStop(1, 'rgba(47, 216, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const s = 1.35;
    ctx.scale(s, s);
    if (this.thrusting) {
      const fl = 12 + Math.sin(t * 30) * 4;
      ctx.fillStyle = '#ff9a3d';
      ctx.beginPath();
      ctx.moveTo(-14, -5);
      ctx.lineTo(-14 - fl, 0);
      ctx.lineTo(-14, 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#2fd8ff';
    ctx.fillStyle = '#0d2b3d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -11);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e8f6ff';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(2, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

export function makeEnemy(kind, wave, x, y, elite, rng) {
  const e = {
    kind,
    elite: !!elite,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: kind === 'stormcaller' ? 17 : 15,
    angle: rng.range(0, Math.PI * 2),
    strafeDir: rng.chance(0.5) ? 1 : -1,
    strafeTimer: rng.range(1, 2.5),
    fireTimer: rng.range(1, 2.4),
    wobble: rng.range(0, 6.28),
    flash: 0,
  };
  if (kind === 'pirate') {
    e.hp = 2 + Math.floor(wave / 4);
    e.speed = 150 + 6 * wave;
    e.score = 100;
  } else if (kind === 'wisp') {
    e.hp = 1;
    e.speed = 120 + 5 * wave;
    e.score = 80;
    e.radius = 12;
  } else {
    e.hp = 3 + Math.floor(wave / 3);
    e.speed = 70 + 3 * wave;
    e.score = 150;
  }
  if (elite) {
    e.hp *= 3;
    e.score = 400;
    e.radius += 3;
  }
  e.maxHp = e.hp;
  return e;
}

export function updateEnemy(e, game, dt, t) {
  const p = game.skiff;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  if (e.kind === 'pirate') {
    e.strafeTimer -= dt;
    if (e.strafeTimer <= 0) {
      e.strafeDir *= -1;
      e.strafeTimer = sharedRandom.range(1, 2.5);
    }
    let mx;
    let my;
    if (dist > 260) {
      mx = nx;
      my = ny;
    } else {
      mx = -ny * e.strafeDir * 0.9 + nx * 0.25;
      my = nx * e.strafeDir * 0.9 + ny * 0.25;
    }
    e.vx = mx * e.speed;
    e.vy = my * e.speed;
  } else if (e.kind === 'wisp') {
    e.wobble += dt * 3;
    const wob = Math.sin(e.wobble) * 0.7;
    e.vx = (nx + -ny * wob) * e.speed;
    e.vy = (ny + nx * wob) * e.speed;
  } else {
    // Stormcaller: keep ~300px, fire aimed orbs inside 560px.
    let mx = 0;
    let my = 0;
    if (dist > 340) { mx = nx; my = ny; }
    else if (dist < 260) { mx = -nx; my = -ny; }
    e.vx = mx * e.speed;
    e.vy = my * e.speed;
    e.fireTimer -= dt;
    const interval = Math.max(1.3, 2.4 - game.wave * 0.07);
    if (e.fireTimer <= 0 && dist < 560) {
      e.fireTimer = interval;
      game.spawnEnemyBullet(e.x, e.y, nx * 260, ny * 260);
      game.audio.sfx('enemyShot');
    }
  }
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.x = Math.max(16, Math.min(1264, e.x));
  e.y = Math.max(16, Math.min(704, e.y));
  e.angle = Math.atan2(dy, dx);
  if (e.flash > 0) e.flash -= dt;
}

export function drawEnemy(ctx, e, t) {
  const flash = e.flash > 0;
  if (e.kind === 'pirate') {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    ctx.fillStyle = e.elite ? '#ffd34d' : '#ff5a4d';
    ctx.strokeStyle = e.elite ? '#fff2b0' : '#ff9a8a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-16, -5);
    ctx.lineTo(-16, 5);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (flash) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.restore();
  } else if (e.kind === 'wisp') {
    const pulse = 1 + Math.sin(t * 6 + e.wobble) * 0.15;
    const glow = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, e.radius * 2.4);
    glow.addColorStop(0, e.elite ? 'rgba(255, 211, 77, 0.7)' : 'rgba(180, 107, 255, 0.7)');
    glow.addColorStop(1, 'rgba(180, 107, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.elite ? '#ffd34d' : '#b46bff';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2e6ff';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(t * 1.4);
    ctx.strokeStyle = e.elite ? '#ffd34d' : '#5f8dff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(-t * 1.4);
    ctx.fillStyle = e.elite ? '#ffd34d' : '#2c4a8f';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cfe0ff';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    if (flash) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (e.elite) {
    ctx.strokeStyle = 'rgba(255, 211, 77, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export class BulletShot {
  constructor(x, y, vx, vy, damage, friendly) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.friendly = friendly;
    this.radius = friendly ? 4 : 6;
    this.life = 2.2;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.friendly ? '#2fd8ff' : '#ff7a5c';
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.friendly ? '#aeeeff' : '#ff9a7a';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class PickupDrop {
  constructor(kind, x, y) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.vx = sharedRandom.range(-30, 30);
    this.vy = sharedRandom.range(-30, 30);
    this.radius = 11;
    this.ttl = 12;
    this.bob = sharedRandom.range(0, 6.28);
  }

  update(dt, game) {
    const p = game.skiff;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < game.stats.pickupRadius) {
      const pull = 420 * (1 - dist / game.stats.pickupRadius);
      this.vx += (dx / dist) * pull * dt;
      this.vy += (dy / dist) * pull * dt;
    }
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    this.bob += dt * 3;
  }

  draw(ctx) {
    const blink = this.ttl < 3 && Math.floor(this.ttl * 6) % 2 === 0;
    if (blink) return;
    const color = this.kind === 'repair' ? '#3ddc78' : this.kind === 'overcharge' ? '#ff9a3d' : '#2fd8ff';
    const glow = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, 22);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(this.x, this.y + Math.sin(this.bob) * 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.strokeRect(-6, -6, 12, 12);
    ctx.restore();
  }
}
