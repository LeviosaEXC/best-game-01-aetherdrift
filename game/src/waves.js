// Wave composition and the spawn queue. A wave is cleared when the queue
// is empty and no enemy remains alive.
import { sharedRandom } from './rng.js';

export class WaveDirector {
  constructor() {
    this.queue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 0.95;
    this.currentWave = 0;
    this.banner = null;
    this.bannerTimer = 0;
  }

  buildWave(n) {
    this.currentWave = n;
    this.queue = [];
    const budget = 6 + 3 * n;
    let left = budget;
    const callers = n >= 3 ? Math.min(4, Math.floor(left / 3)) : 0;
    for (let i = 0; i < callers; i++) {
      this.queue.push({ kind: 'stormcaller', elite: false });
      left -= 3;
    }
    while (left > 0) {
      this.queue.push({ kind: sharedRandom.chance(0.55) ? 'pirate' : 'wisp', elite: false });
      left -= 1;
    }
    if (n % 4 === 0) {
      const elites = 2 + Math.floor(n / 4);
      for (let i = 0; i < elites; i++) {
        this.queue.push({ kind: sharedRandom.pick(['pirate', 'wisp', 'stormcaller']), elite: true });
      }
    }
    const bossWave = n % 5 === 0;
    if (bossWave) {
      const wisps = 2 + Math.floor(n / 5);
      const pirates = Math.floor(n / 5);
      for (let i = 0; i < wisps; i++) this.queue.push({ kind: 'wisp', elite: false });
      for (let i = 0; i < pirates; i++) this.queue.push({ kind: 'pirate', elite: false });
    }
    // Shuffle the queue so the mix arrives in random order.
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(sharedRandom.next() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    this.spawnInterval = Math.max(0.35, 0.95 - n * 0.045);
    this.spawnTimer = 0.4;
    const subtitle = bossWave
      ? 'THE TEMPEST SOVEREIGN APPROACHES'
      : n % 4 === 0
        ? 'ELITE SQUADRON INBOUND'
        : n === 15
          ? 'FINAL WAVE — TAME THE STORM'
          : 'HOSTILES INBOUND';
    this.banner = { text: `WAVE ${n}`, sub: subtitle };
    this.bannerTimer = 1.8;
    return { bossWave, queueSize: this.queue.length };
  }

  spawnPoint(game) {
    const p = game.skiff;
    for (let tries = 0; tries < 12; tries++) {
      const edge = Math.floor(sharedRandom.next() * 4);
      let x;
      let y;
      if (edge === 0) { x = sharedRandom.range(40, 1240); y = 36; }
      else if (edge === 1) { x = sharedRandom.range(40, 1240); y = 684; }
      else if (edge === 2) { x = 36; y = sharedRandom.range(40, 680); }
      else { x = 1244; y = sharedRandom.range(40, 680); }
      if (Math.hypot(x - p.x, y - p.y) >= 320) return { x, y };
    }
    return { x: 640, y: 40 };
  }

  update(dt, game) {
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.queue.length === 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval;
      const next = this.queue.shift();
      const pt = this.spawnPoint(game);
      game.spawnEnemy(next.kind, pt.x, pt.y, next.elite);
    }
  }

  isCleared(game) {
    return this.queue.length === 0 && game.enemies.length === 0 && !game.boss;
  }
}
