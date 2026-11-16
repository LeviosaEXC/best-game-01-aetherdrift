// All sound is synthesized live with the Web Audio API: no audio files,
// no network. The context only starts after the first user gesture, and
// every call is guarded so headless runs stay silent and error-free.
import { sharedRandom } from './rng.js';

export class StormAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicNextTime = 0;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.55, this.ctx.currentTime, 0.02);
    }
  }

  tone(freq, dur, type = 'sine', gain = 0.2, slideTo = 0, when = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(dur, gain = 0.2, filterFreq = 1200, when = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'cannon': this.tone(880, 0.07, 'square', 0.08, 320); break;
      case 'enemyShot': this.tone(220, 0.12, 'sawtooth', 0.07, 140); break;
      case 'hit': this.tone(160, 0.05, 'square', 0.1, 90); break;
      case 'kill': this.tone(520, 0.16, 'triangle', 0.16, 120); this.noise(0.12, 0.1, 2400); break;
      case 'explosion': this.noise(0.5, 0.3, 500); this.tone(90, 0.4, 'sine', 0.25, 40); break;
      case 'hurt': this.tone(140, 0.22, 'sawtooth', 0.2, 60); this.noise(0.15, 0.15, 800); break;
      case 'dash': this.noise(0.18, 0.14, 3600); break;
      case 'pickup': this.tone(660, 0.09, 'sine', 0.14, 990); this.tone(990, 0.12, 'sine', 0.1, 1320, 0.07); break;
      case 'draft': this.tone(523, 0.12, 'triangle', 0.14); this.tone(784, 0.16, 'triangle', 0.12, 0, 0.1); break;
      case 'horn': this.tone(196, 0.5, 'sawtooth', 0.12, 196); this.tone(294, 0.5, 'sawtooth', 0.08, 294, 0.05); break;
      case 'roar': this.noise(0.7, 0.22, 300); this.tone(70, 0.7, 'sawtooth', 0.16, 45); break;
      case 'thunder': this.noise(0.9, 0.25, 240); break;
      case 'victory':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.15, 0, i * 0.14));
        break;
      case 'defeat':
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.34, 'triangle', 0.14, 0, i * 0.17));
        break;
      default: break;
    }
  }

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    // 116 BPM sequenced loop over Am - F - C - G: root pulse, triangle
    // bass, soft sine arpeggio, periodic wind swell. Visual randomness is
    // seeded elsewhere; music timing uses the audio clock only.
    const roots = [110.0, 87.31, 130.81, 98.0];
    const arpNotes = [220.0, 261.63, 329.63, 392.0, 440.0, 523.25];
    const stepDur = 60 / 116 / 2;
    this.musicNextTime = this.ctx.currentTime + 0.05;
    this.musicTimer = setInterval(() => {
      if (!this.ctx) return;
      while (this.musicNextTime < this.ctx.currentTime + 0.25) {
        const step = this.musicStep;
        const bar = Math.floor(step / 8) % 4;
        const when = this.musicNextTime - this.ctx.currentTime;
        if (step % 8 === 0) {
          this.tone(roots[bar], stepDur * 7, 'sine', 0.22, 0, Math.max(0, when));
        }
        if (step % 2 === 0) {
          const note = arpNotes[(step * 2 + bar) % arpNotes.length];
          this.tone(note, stepDur * 1.8, 'sine', 0.05, 0, Math.max(0, when));
        }
        if (step % 8 === 4) {
          this.noise(stepDur * 4, 0.03, 900, Math.max(0, when));
        }
        this.musicStep += 1;
        this.musicNextTime += stepDur;
      }
    }, 90);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
