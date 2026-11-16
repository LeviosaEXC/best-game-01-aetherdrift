// Boot: start the live game, or stage one deterministic screenshot scene
// from ?shot=play|title|victory|defeat&seed=N and flag it ready.
import { AetherdriftGame } from './game.js';
import { stageShot } from './scenes.js';

const canvas = document.getElementById('game');
const game = new AetherdriftGame(canvas);
window.__game = game;
Object.defineProperty(window, '__dbg', { get: () => game.debugState() });
Object.defineProperty(window, '__shotReady', { get: () => !!game.shotReadyFlag, configurable: true });

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 1337);

if (shot) {
  stageShot(game, shot, seed);
  game.renderFrame();
  game.shotReadyFlag = true;
} else {
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
    last = now;
    game.step(dt);
    game.renderFrame();
    game.input.endFrame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
