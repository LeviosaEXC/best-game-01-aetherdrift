// The combo chain: kills in quick succession raise the score multiplier.
// A chain of eight kills pays x2.75; a chain of nine pays x3.00.
export class ComboChain {
  constructor(windowSeconds = 3.5, cap = 5) {
    this.windowSeconds = windowSeconds;
    this.cap = cap;
    this.chain = 0;
    this.timer = 0;
    this.bestChain = 0;
    this.decayRate = 1;
  }

  get multiplier() {
    if (this.chain <= 0) return 1;
    return Math.min(this.cap, 1 + 0.25 * (this.chain - 1));
  }

  registerKill() {
    this.chain += 1;
    this.timer = this.windowSeconds;
    if (this.chain > this.bestChain) this.bestChain = this.chain;
    return this.multiplier;
  }

  update(dt) {
    if (this.chain > 0) {
      this.timer -= dt * this.decayRate;
      if (this.timer <= 0) {
        this.chain = 0;
        this.timer = 0;
      }
    }
  }

  reset() {
    this.chain = 0;
    this.timer = 0;
    this.bestChain = 0;
  }
}
