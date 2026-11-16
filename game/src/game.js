// The game: state machine, combat, collisions, scoring, wave flow, relic
// tracking for the flight record, and the debug hooks the playtest uses.
import { sharedRandom } from './rng.js';
import { StormAudio } from './audio.js';
import { InputTracker } from './input.js';
import { ParticleSystem } from './particles.js';
import { stepSkiff, tryDash } from './momentum.js';
import { ComboChain } from './combo.js';
import { defaultStats, rollDraft, applyRelic } from './relics.js';
import { SkiffShip, makeEnemy, updateEnemy, drawEnemy, BulletShot, PickupDrop } from './entities.js';
import { WaveDirector } from './waves.js';
import { TempestSovereign } from './boss.js';
import { drawScene, drawBackdrop } from './render.js';
import { drawTitle, drawDraft, drawPause, drawVictory, drawDefeat } from './scenes.js';

export const ARENA_WIDTH = 1280;
export const ARENA_HEIGHT = 720;
const BEST_KEY = 'aetherdrift-best';

export class AetherdriftGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = new StormAudio();
    this.input = new InputTracker(canvas);
    this.input.onFirstGesture = () => {
      this.audio.unlock();
      this.audio.startMusic();
    };
    this.particles = new ParticleSystem();
    this.director = new WaveDirector();
    this.combo = new ComboChain();
    this.phase = 'title';
    this.time = 0;
    this.score = 0;
    this.wave = 1;
    this.kills = 0;
    this.best = 0;
    try {
      this.best = Number(window.localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch {
      this.best = 0;
    }
    this.endless = false;
    this.overchargeTimer = 0;
    this.magnetTimer = 0;
    this.lightningTimer = 9;
    this.shotMode = false;
    this.scriptInput = null;
    this.stats = defaultStats();
    this.skiff = new SkiffShip();
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.pickups = [];
    this.boss = null;
    this.draftChoices = [];
    this.relicsTaken = [];
    this.endStats = null;
    this.demoShip = new SkiffShip();
    this.demoShip.x = 170;
    this.demoShip.y = 250;
    this.demoWisp = makeEnemy('wisp', 1, 1080, 200, false, sharedRandom);
    this._prevMouseDown = false;
    this._prevPhase = 'title';
  }

  startRun() {
    this.stats = defaultStats();
    this.skiff = new SkiffShip();
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.pickups = [];
    this.boss = null;
    this.particles.sparks = [];
    this.particles.smoke = [];
    this.particles.shards = [];
    this.particles.rings = [];
    this.combo = new ComboChain(this.stats.comboWindow, this.stats.comboCap);
    this.score = 0;
    this.wave = 1;
    this.kills = 0;
    this.endless = false;
    this.overchargeTimer = 0;
    this.magnetTimer = 0;
    this.lightningTimer = sharedRandom.range(7, 14);
    this.relicsTaken = [];
    this.endStats = null;
    this.phase = 'play';
    this.beginWave(1);
    this.audio.sfx('horn');
  }

  beginWave(n) {
    this.wave = n;
    const built = this.director.buildWave(n);
    if (built.bossWave) {
      this.boss = new TempestSovereign(n, 640, 150);
      this.audio.sfx('roar');
    }
  }

  spawnEnemy(kind, x, y, elite = false) {
    this.enemies.push(makeEnemy(kind, this.wave, x, y, elite, sharedRandom));
  }

  spawnEnemyBullet(x, y, vx, vy) {
    this.enemyBullets.push(new BulletShot(x, y, vx, vy, 10, false));
  }

  spawnBullet(x, y, vx, vy, damage) {
    this.bullets.push(new BulletShot(x, y, vx, vy, damage, true));
  }

  spawnPickup(kind, x, y) {
    this.pickups.push(new PickupDrop(kind, x, y));
  }

  summonWisps(n) {
    if (!this.boss) return;
    for (let i = 0; i < n; i++) {
      const a = sharedRandom.range(0, Math.PI * 2);
      this.spawnEnemy('wisp', this.boss.x + Math.cos(a) * 90, this.boss.y + Math.sin(a) * 90, false);
    }
  }

  damagePlayer(damage, x, y) {
    if (this.phase !== 'play' || this.skiff.invuln > 0) return;
    if (this.stats.aegis && this.skiff.aegisTimer <= 0) {
      this.skiff.aegisTimer = 20;
      this.particles.ring(this.skiff.x, this.skiff.y, '#2fd8ff', 90);
      this.audio.sfx('hit');
      return;
    }
    this.skiff.hull -= damage;
    this.particles.shake(7);
    this.particles.burst(x, y, '#ff5a4d', 14, 300);
    this.audio.sfx('hurt');
    this.skiff.invuln = 0.7;
    if (this.skiff.hull <= 0) {
      this.skiff.hull = 0;
      this.defeat();
    }
  }

  defeat() {
    this.endStats = this.buildEndStats();
    this.phase = 'defeat';
    this.audio.sfx('defeat');
    this.saveBest();
  }

  victory() {
    this.endStats = this.buildEndStats();
    this.phase = 'victory';
    this.audio.sfx('victory');
    this.saveBest();
  }

  buildEndStats() {
    return {
      score: this.score,
      wave: this.wave,
      kills: this.kills,
      bestChain: this.combo.bestChain,
      time: this.time,
      relics: this.relicsTaken.length,
      relicNames: this.relicsTaken.map((r) => r.name),
    };
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try {
        window.localStorage.setItem(BEST_KEY, String(this.best));
      } catch {
        // Storage unavailable; the best score simply does not persist.
      }
    }
  }

  chooseRelic(index) {
    const relic = this.draftChoices[index];
    if (!relic) return;
    applyRelic(this.stats, relic);
    if (relic.heal) {
      this.skiff.hull = Math.min(this.stats.maxHull, this.skiff.hull + relic.heal);
    }
    if (relic.id === 'plating' || relic.id === 'keel' || relic.id === 'nanoweave') {
      this.skiff.hull = Math.min(this.skiff.hull, this.stats.maxHull);
    }
    this.relicsTaken.push(relic);
    this.combo.windowSeconds = this.stats.comboWindow;
    this.combo.cap = this.stats.comboCap;
    this.combo.decayRate = this.stats.comboDecay;
    this.audio.sfx('draft');
    this.wave += 1;
    this.phase = 'play';
    this.beginWave(this.wave);
  }

  forceVictory() {
    this.wave = 15;
    this.victory();
  }

  forceDefeat() {
    this.skiff.hull = 0;
    this.defeat();
  }

  clearWave() {
    this.enemies = [];
    this.boss = null;
    this.director.queue = [];
  }

  fireCannons() {
    const skiff = this.skiff;
    const aim = Math.atan2(this.input.mouse.y - skiff.y, this.input.mouse.x - skiff.x);
    skiff.angle = aim;
    const rate = this.stats.fireRate * (this.overchargeTimer > 0 ? 2 : 1);
    skiff.fireCooldown = 1 / rate;
    const n = this.stats.projectiles;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 0.09;
      const a = aim + off;
      const bx = skiff.x + Math.cos(a) * 24;
      const by = skiff.y + Math.sin(a) * 24;
      this.spawnBullet(bx, by, Math.cos(a) * this.stats.bulletSpeed, Math.sin(a) * this.stats.bulletSpeed, this.stats.bulletDamage);
    }
    this.audio.sfx('cannon');
  }

  killEnemy(index, multiplier) {
    const e = this.enemies[index];
    this.enemies.splice(index, 1);
    const gained = Math.round(e.score * multiplier);
    this.score += gained;
    this.kills += 1;
    this.particles.burst(e.x, e.y, e.elite ? '#ffd34d' : '#ff8a7a', e.elite ? 22 : 12, 300);
    this.particles.shardBurst(e.x, e.y, e.elite ? '#ffd34d' : '#ff5a4d', 6);
    this.particles.ring(e.x, e.y, '#ffffff', 46);
    this.audio.sfx('kill');
    if (e.elite || sharedRandom.chance(0.12)) {
      const kind = sharedRandom.pick(['repair', 'overcharge', 'magnet']);
      this.spawnPickup(kind, e.x, e.y);
    }
  }

  killBoss(multiplier) {
    const b = this.boss;
    this.boss = null;
    const gained = Math.round(5000 * multiplier);
    this.score += gained;
    this.kills += 1;
    this.particles.burst(b.x, b.y, '#b46bff', 40, 420);
    this.particles.shardBurst(b.x, b.y, '#ffd34d', 16);
    this.particles.ring(b.x, b.y, '#ffffff', 160);
    this.particles.shake(12);
    this.audio.sfx('explosion');
    this.spawnPickup('repair', b.x - 40, b.y);
    this.spawnPickup('overcharge', b.x + 40, b.y);
  }

  chainLightningArc(fromEnemy) {
    let nearest = null;
    let nearestDist = 220;
    for (const e of this.enemies) {
      if (e === fromEnemy) continue;
      const d = Math.hypot(e.x - fromEnemy.x, e.y - fromEnemy.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = e;
      }
    }
    if (nearest) {
      nearest.hp -= Math.max(1, Math.floor(this.stats.bulletDamage / 2));
      nearest.flash = 0.08;
      this.particles.burst(nearest.x, nearest.y, '#2fd8ff', 6, 200);
    }
  }

  step(dt) {
    this.time += dt;
    const input = this.input;
    const clickEdge = input.mouse.down && !this._prevMouseDown;
    this._prevMouseDown = input.mouse.down;
    this.particles.update(dt, this.time);
    if (input.consume('KeyM')) {
      this.audio.setMuted(!this.audio.muted);
    }
    if (this.phase === 'title') {
      this.demoShip.x = 170 + Math.cos(this.time * 0.25) * 30;
      this.demoShip.y = 250 + Math.sin(this.time * 0.4) * 18;
      this.demoShip.angle = Math.sin(this.time * 0.3) * 0.6;
      this.demoWisp.x = 1080 + Math.cos(this.time * 0.3) * 24;
      this.demoWisp.y = 200 + Math.sin(this.time * 0.5) * 14;
      if (input.consume('Enter') || input.consume('Space') || clickEdge) {
        this.audio.unlock();
        this.audio.startMusic();
        this.startRun();
      }
      return;
    }
    if (this.phase === 'pause') {
      if (input.consume('KeyP') || input.consume('Escape')) this.phase = 'play';
      if (input.consume('KeyR')) this.startRun();
      return;
    }
    if (this.phase === 'draft') {
      if (input.consume('Digit1')) this.chooseRelic(0);
      else if (input.consume('Digit2')) this.chooseRelic(1);
      else if (input.consume('Digit3')) this.chooseRelic(2);
      else if (clickEdge) {
        const w = 300;
        const gap = 30;
        const x0 = 640 - (w * 3 + gap * 2) / 2;
        const y0 = 220;
        const mx = input.mouse.x;
        const my = input.mouse.y;
        for (let i = 0; i < 3; i++) {
          const x = x0 + i * (w + gap);
          if (mx >= x && mx <= x + w && my >= y0 && my <= y0 + 250) {
            this.chooseRelic(i);
            break;
          }
        }
      }
      return;
    }
    if (this.phase === 'victory') {
      if (input.consume('Enter')) {
        this.endless = true;
        this.phase = 'play';
        this.wave += 1;
        this.beginWave(this.wave);
      }
      if (input.consume('KeyR')) this.startRun();
      return;
    }
    if (this.phase === 'defeat') {
      if (input.consume('Enter') || clickEdge) this.startRun();
      return;
    }
    // Phase: play.
    if (input.consume('KeyP') || input.consume('Escape')) {
      this.phase = 'pause';
      return;
    }
    if (input.consume('Space')) {
      if (tryDash(this.skiff, this.stats)) {
        this.audio.sfx('dash');
        this.particles.puff(this.skiff.x, this.skiff.y, 8);
        if (this.stats.dashDamage > 0) {
          for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (Math.hypot(e.x - this.skiff.x, e.y - this.skiff.y) < e.radius + 26) {
              e.hp -= this.stats.dashDamage;
              if (e.hp <= 0) this.killEnemy(i, this.combo.registerKill());
            }
          }
        }
      }
    }
    const thrust = this.scriptInput || input.thrustVector();
    const firing = this.scriptInput ? this.scriptInput.fire : input.mouse.down;
    const fakeInput = { thrustVector: () => ({ x: thrust.x, y: thrust.y }) };
    stepSkiff(this.skiff, fakeInput, this.stats, dt);
    if (this.stats.regen > 0 && this.skiff.hull < this.stats.maxHull) {
      this.skiff.hull = Math.min(this.stats.maxHull, this.skiff.hull + this.stats.regen * dt);
    }
    if (this.overchargeTimer > 0) this.overchargeTimer -= dt;
    if (this.magnetTimer > 0) this.magnetTimer -= dt;
    if (this.skiff.fireCooldown > 0) this.skiff.fireCooldown -= dt;
    if (firing && this.skiff.fireCooldown <= 0) this.fireCannons();
    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0) {
      this.lightningTimer = sharedRandom.range(7, 14);
      this.particles.strikeLightning(sharedRandom.range(60, 1220));
      this.audio.sfx('thunder');
    }
    this.combo.update(dt);
    this.director.update(dt, this);
    for (const e of this.enemies) updateEnemy(e, this, dt, this.time);
    if (this.boss) this.boss.update(dt, this, this.time);
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt);
      if (b.life <= 0 || b.x < -20 || b.x > 1300 || b.y < -20 || b.y > 740) {
        this.bullets.splice(i, 1);
      }
    }
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.update(dt);
      if (b.life <= 0 || b.x < -20 || b.x > 1300 || b.y < -20 || b.y > 740) {
        this.enemyBullets.splice(i, 1);
      }
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.update(dt, this);
      if (pk.ttl <= 0) this.pickups.splice(i, 1);
    }
    this.collide(dt);
    if (this.phase === 'play' && this.director.isCleared(this)) {
      if (this.wave === 15 && !this.endless) {
        this.victory();
      } else {
        this.draftChoices = rollDraft(sharedRandom);
        this.phase = 'draft';
        this.audio.sfx('draft');
      }
    }
  }

  collide() {
    const skiff = this.skiff;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
          hit = true;
          e.hp -= b.damage;
          e.flash = 0.08;
          if (this.stats.chainLightning) this.chainLightningArc(e);
          if (e.hp <= 0) {
            const mult = this.combo.registerKill();
            this.killEnemy(j, mult);
          } else {
            this.audio.sfx('hit');
          }
          break;
        }
      }
      if (!hit && this.boss) {
        const boss = this.boss;
        if (Math.hypot(boss.x - b.x, boss.y - b.y) < boss.radius + b.radius) {
          hit = true;
          if (boss.takeHit(b.damage, this)) {
            const mult = this.combo.registerKill();
            this.killBoss(mult);
          } else {
            this.audio.sfx('hit');
          }
        }
      }
      if (hit) this.bullets.splice(i, 1);
    }
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      if (Math.hypot(skiff.x - b.x, skiff.y - b.y) < skiff.radius + b.radius) {
        this.enemyBullets.splice(i, 1);
        this.damagePlayer(10, b.x, b.y);
        if (this.phase !== 'play') return;
      }
    }
    for (let j = this.enemies.length - 1; j >= 0; j--) {
      const e = this.enemies[j];
      if (Math.hypot(e.x - skiff.x, e.y - skiff.y) < e.radius + skiff.radius) {
        this.damagePlayer(12, e.x, e.y);
        e.x += (e.x - skiff.x) * 0.1;
        e.y += (e.y - skiff.y) * 0.1;
        if (this.phase !== 'play') return;
      }
    }
    if (this.boss && Math.hypot(this.boss.x - skiff.x, this.boss.y - skiff.y) < this.boss.radius + skiff.radius) {
      this.damagePlayer(22, this.boss.x, this.boss.y);
      if (this.phase !== 'play') return;
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      if (Math.hypot(pk.x - skiff.x, pk.y - skiff.y) < pk.radius + skiff.radius + 4) {
        this.pickups.splice(i, 1);
        this.score += 25;
        if (pk.kind === 'repair') {
          this.skiff.hull = Math.min(this.stats.maxHull, this.skiff.hull + 25);
        } else if (pk.kind === 'overcharge') {
          this.overchargeTimer = 8;
        } else {
          this.magnetTimer = 10;
        }
        this.particles.ring(pk.x, pk.y, '#3ddc78', 40);
        this.audio.sfx('pickup');
      }
    }
  }

  renderFrame() {
    const ctx = this.ctx;
    const t = this.time;
    ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    if (this.phase === 'title') {
      drawBackdrop(ctx, this, t);
      this.demoShip.draw(ctx, t);
      drawEnemy(ctx, this.demoWisp, t);
      this.particles.draw(ctx);
      drawTitle(ctx, this, t);
      return;
    }
    if (this.phase === 'victory') {
      drawBackdrop(ctx, this, t);
      this.particles.draw(ctx);
      drawVictory(ctx, this);
      return;
    }
    if (this.phase === 'defeat') {
      drawBackdrop(ctx, this, t);
      this.particles.draw(ctx);
      drawDefeat(ctx, this);
      return;
    }
    drawScene(ctx, this, t);
    if (this.phase === 'draft') drawDraft(ctx, this, t);
    if (this.phase === 'pause') drawPause(ctx, this);
  }

  debugState() {
    return {
      phase: this.phase,
      score: this.score,
      wave: this.wave,
      combo: this.combo.chain,
      multiplier: Number(this.combo.multiplier.toFixed(2)),
      hull: Math.ceil(this.skiff.hull),
      maxHull: this.stats.maxHull,
      kills: this.kills,
      enemies: this.enemies.length,
      bullets: this.bullets.length,
      enemyBullets: this.enemyBullets.length,
      best: this.best,
      muted: this.audio.muted,
      draft: this.phase === 'draft',
      draftChoices: this.draftChoices.map((r) => r.name),
      boss: !!this.boss,
      bossHp: this.boss ? this.boss.hp : 0,
      endless: this.endless,
      runTime: Number(this.time.toFixed(2)),
      relics: this.relicsTaken.length,
      relicNames: this.relicsTaken.map((r) => r.name),
      endStats: this.endStats,
    };
  }
}
