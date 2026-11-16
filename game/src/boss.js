// The Tempest Sovereign: a large storm eye that orbits the player, fires
// radial bursts and aimed spreads, summons wisps as its hull falls, and
// telegraphs a lightning strike under the player's position.
import { sharedRandom } from './rng.js';

export class TempestSovereign {
  constructor(wave, x, y) {
    this.wave = wave;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.maxHp = 220 + 32 * wave;
    this.hp = this.maxHp;
    this.radius = 52;
    this.orbitAngle = sharedRandom.range(0, Math.PI * 2);
    this.burstTimer = 2.2;
    this.spreadTimer = 1.4;
    this.strikeTimer = 4.0;
    this.telegraph = null;
    this.summonedTwoThirds = false;
    this.summonedThird = false;
    this.flash = 0;
    this.ringPhase = sharedRandom.range(0, 6.28);
  }

  takeHit(damage, game) {
    this.hp -= damage;
    this.flash = 0.08;
    if (!this.summonedTwoThirds && this.hp <= (this.maxHp * 2) / 3) {
      this.summonedTwoThirds = true;
      game.summonWisps(3);
    }
    if (!this.summonedThird && this.hp <= this.maxHp / 3) {
      this.summonedThird = true;
      game.summonWisps(4);
    }
    return this.hp <= 0;
  }

  update(dt, game, t) {
    const p = game.skiff;
    this.orbitAngle += dt * 0.45;
    const tx = p.x + Math.cos(this.orbitAngle) * 300;
    const ty = p.y + Math.sin(this.orbitAngle) * 220;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 72;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = Math.max(70, Math.min(1210, this.x));
    this.y = Math.max(70, Math.min(650, this.y));
    this.ringPhase += dt * 1.8;
    if (this.flash > 0) this.flash -= dt;
    this.burstTimer -= dt;
    if (this.burstTimer <= 0) {
      this.burstTimer = 3.4;
      const count = 10 + Math.floor(sharedRandom.next() * 5);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + sharedRandom.range(-0.1, 0.1);
        game.spawnEnemyBullet(this.x, this.y, Math.cos(a) * 220, Math.sin(a) * 220);
      }
      game.audio.sfx('enemyShot');
    }
    this.spreadTimer -= dt;
    if (this.spreadTimer <= 0) {
      this.spreadTimer = 2.1;
      const a = Math.atan2(p.y - this.y, p.x - this.x);
      for (const off of [-0.22, 0, 0.22]) {
        game.spawnEnemyBullet(this.x, this.y, Math.cos(a + off) * 300, Math.sin(a + off) * 300);
      }
      game.audio.sfx('enemyShot');
    }
    this.strikeTimer -= dt;
    if (this.strikeTimer <= 0) {
      this.strikeTimer = 5.5;
      this.telegraph = { x: p.x, y: p.y, timer: 0.9, max: 0.9 };
    }
    if (this.telegraph) {
      this.telegraph.timer -= dt;
      if (this.telegraph.timer <= 0) {
        const tx2 = this.telegraph.x;
        const ty2 = this.telegraph.y;
        this.telegraph = null;
        game.particles.strikeLightning(tx2);
        game.audio.sfx('thunder');
        if (Math.hypot(p.x - tx2, p.y - ty2) < 70) {
          game.damagePlayer(18, tx2, ty2);
        }
      }
    }
  }

  draw(ctx, t) {
    // Telegraph ring under the player, drawn by the game; the boss itself
    // is a large menacing storm eye: dark core, pale eye, two rotating
    // violet rings and a crown of spikes.
    const pulse = 1 + Math.sin(t * 3 + this.ringPhase) * 0.06;
    const glow = ctx.createRadialGradient(this.x, this.y, 10, this.x, this.y, this.radius * 2.1);
    glow.addColorStop(0, 'rgba(120, 60, 220, 0.55)');
    glow.addColorStop(1, 'rgba(120, 60, 220, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#1a0b33';
    ctx.strokeStyle = '#b46bff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this.ringPhase * 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * this.radius, Math.sin(a) * this.radius);
      ctx.lineTo(Math.cos(a) * (this.radius + 14), Math.sin(a) * (this.radius + 14));
      ctx.stroke();
    }
    ctx.rotate(this.ringPhase);
    ctx.strokeStyle = 'rgba(180, 107, 255, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.72, 0, Math.PI * 1.4);
    ctx.stroke();
    ctx.rotate(-this.ringPhase * 1.7);
    ctx.strokeStyle = 'rgba(255, 211, 77, 0.7)';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.45, 0, Math.PI * 1.2);
    ctx.stroke();
    ctx.rotate(this.ringPhase * 1.7);
    ctx.fillStyle = '#f2e6ff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0b33';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.11, 0, Math.PI * 2);
    ctx.fill();
    if (this.flash > 0) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
