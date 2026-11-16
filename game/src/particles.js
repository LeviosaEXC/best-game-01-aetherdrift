// Sparks, smoke, shards, rings, clouds, islands, storm debris, lightning
// and screen flash. The backdrop (stars, clouds, islands, debris) is drawn
// from seeded state so screenshot scenes are deterministic.
import { sharedRandom } from './rng.js';

export class ParticleSystem {
  constructor() {
    this.sparks = [];
    this.smoke = [];
    this.shards = [];
    this.rings = [];
    this.flash = 0;
    this.shakeAmount = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.bolt = null;
    this.boltLife = 0;
    this.stars = [];
    this.clouds = [];
    this.islands = [];
    this.debris = [];
    this._initBackdrop();
  }

  _initBackdrop() {
    const rng = sharedRandom;
    for (let i = 0; i < 90; i++) {
      this.stars.push({ x: rng.range(0, 1280), y: rng.range(0, 300), r: rng.range(0.6, 1.8), phase: rng.range(0, 6.28), speed: rng.range(0.5, 2) });
    }
    for (let i = 0; i < 9; i++) {
      this.clouds.push({ x: rng.range(0, 1280), y: rng.range(40, 620), r: rng.range(50, 130), vx: rng.range(4, 12), alpha: rng.range(0.05, 0.12) });
    }
    const rims = ['#2fd8ff', '#b46bff', '#2fe8c8'];
    for (let i = 0; i < 5; i++) {
      this.islands.push({ x: rng.range(90, 1190), y: rng.range(90, 630), r: rng.range(26, 52), rim: rims[i % 3], bob: rng.range(0, 6.28), bobSpeed: rng.range(0.4, 0.9) });
    }
    for (let i = 0; i < 46; i++) {
      this.debris.push({ x: rng.range(0, 1280), y: rng.range(0, 720), r: rng.range(1.5, 4), vx: rng.range(-9, 9), vy: rng.range(-6, 6), rot: rng.range(0, 6.28), vr: rng.range(-1, 1) });
    }
  }

  burst(x, y, color, n = 12, speed = 260) {
    for (let i = 0; i < n; i++) {
      const a = sharedRandom.range(0, Math.PI * 2);
      const s = sharedRandom.range(speed * 0.3, speed);
      this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: sharedRandom.range(0.25, 0.6), max: 0.6, color, r: sharedRandom.range(1.5, 3.5) });
    }
  }

  puff(x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      this.smoke.push({ x: x + sharedRandom.range(-8, 8), y: y + sharedRandom.range(-8, 8), vx: sharedRandom.range(-20, 20), vy: sharedRandom.range(-30, -8), life: sharedRandom.range(0.5, 1.1), max: 1.1, r: sharedRandom.range(6, 14) });
    }
  }

  shardBurst(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = sharedRandom.range(0, Math.PI * 2);
      const s = sharedRandom.range(80, 320);
      this.shards.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: sharedRandom.range(0, 6.28), vr: sharedRandom.range(-6, 6), life: sharedRandom.range(0.4, 0.9), max: 0.9, color, r: sharedRandom.range(3, 7) });
    }
  }

  ring(x, y, color, maxR = 70) {
    this.rings.push({ x, y, r: 6, maxR, life: 0.45, max: 0.45, color });
  }

  strikeLightning(x) {
    const pts = [{ x, y: -10 }];
    let cx = x;
    for (let y = 40; y < 720; y += 46) {
      cx += sharedRandom.range(-42, 42);
      pts.push({ x: cx, y });
    }
    this.bolt = pts;
    this.boltLife = 0.22;
    this.flash = 0.35;
  }

  shake(amount) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  update(dt, t) {
    const step = (list, drag) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life -= dt;
        if (p.life <= 0) { list.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= drag;
        p.vy *= drag;
        if (p.rot !== undefined) p.rot += p.vr * dt;
      }
    };
    step(this.sparks, 0.92);
    step(this.smoke, 0.97);
    step(this.shards, 0.94);
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      r.r += (r.maxR - r.r) * dt * 9;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    if (this.boltLife > 0) this.boltLife -= dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.2);
    if (this.shakeAmount > 0) {
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 26);
      this.shakeX = sharedRandom.range(-1, 1) * this.shakeAmount;
      this.shakeY = sharedRandom.range(-1, 1) * this.shakeAmount;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
    for (const c of this.clouds) {
      c.x += c.vx * dt;
      if (c.x - c.r > 1280) c.x = -c.r;
    }
    for (const d of this.debris) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vr * dt;
      if (d.x < -10) d.x = 1290;
      if (d.x > 1290) d.x = -10;
      if (d.y < -10) d.y = 730;
      if (d.y > 730) d.y = -10;
    }
  }

  drawBackdrop(ctx, t) {
    const grad = ctx.createLinearGradient(0, 0, 0, 720);
    grad.addColorStop(0, '#05070f');
    grad.addColorStop(0.55, '#0a1230');
    grad.addColorStop(1, '#12244d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);
    for (const s of this.stars) {
      const a = 0.35 + 0.4 * Math.abs(Math.sin(t * s.speed + s.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#cfe8ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const c of this.clouds) {
      ctx.globalAlpha = c.alpha;
      ctx.fillStyle = '#8fb8e8';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.r, c.r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const d of this.debris) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#5f7fb0';
      ctx.fillRect(-d.r, -d.r * 0.4, d.r * 2, d.r * 0.8);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const isle of this.islands) {
      const bobY = Math.sin(t * isle.bobSpeed + isle.bob) * 6;
      const pulse = 0.6 + 0.4 * Math.sin(t * 0.7 + isle.bob);
      ctx.globalAlpha = 0.55 + 0.25 * pulse;
      ctx.strokeStyle = isle.rim;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(isle.x, isle.y + bobY, isle.r, isle.r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#0d1a33';
      ctx.beginPath();
      ctx.ellipse(isle.x, isle.y + bobY, isle.r, isle.r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  draw(ctx) {
    for (const s of this.smoke) {
      ctx.globalAlpha = (s.life / s.max) * 0.28;
      ctx.fillStyle = '#9db8d8';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const sh of this.shards) {
      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.rot);
      ctx.globalAlpha = sh.life / sh.max;
      ctx.fillStyle = sh.color;
      ctx.fillRect(-sh.r, -sh.r * 0.5, sh.r * 2, sh.r);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const sp of this.sparks) {
      ctx.globalAlpha = sp.life / sp.max;
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const r of this.rings) {
      ctx.globalAlpha = (r.life / r.max) * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (this.bolt && this.boltLife > 0) {
      ctx.globalAlpha = this.boltLife / 0.22;
      ctx.strokeStyle = '#dfefff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#7fc4ff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(this.bolt[0].x, this.bolt[0].y);
      for (const p of this.bolt) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash * 0.55;
      ctx.fillStyle = '#bcd8ff';
      ctx.fillRect(0, 0, 1280, 720);
      ctx.globalAlpha = 1;
    }
  }
}
