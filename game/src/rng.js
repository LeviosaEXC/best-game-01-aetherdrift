// Seeded randomness shared by gameplay and visuals, so a screenshot scene
// staged from one seed reproduces the same pixels every time.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SeededRandom {
  constructor(seed = 1) {
    this.reseed(seed);
  }

  reseed(seed) {
    this.seed = seed >>> 0 || 1;
    this.nextFn = mulberry32(this.seed);
  }

  next() {
    return this.nextFn();
  }

  range(min, max) {
    return min + (max - min) * this.nextFn();
  }

  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  pick(list) {
    return list[Math.floor(this.nextFn() * list.length)];
  }

  chance(p) {
    return this.nextFn() < p;
  }
}

// The one shared source every system draws from. In live play it is seeded
// from the wall clock; screenshot staging reseeds it from the scene seed.
export const sharedRandom = new SeededRandom(1337);
