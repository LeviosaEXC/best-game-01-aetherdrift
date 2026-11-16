# AETHERDRIFT — Momentum Arena Roguelite

A momentum-driven arena roguelite for the make.fun best-game-01
competition. Pilot a skiff through a storm-lashed arena: thrust with
inertia, chain kills into combos, draft relics between waves, and face
the Tempest Sovereign every fifth wave. Survive all 15 waves to tame
the storm — then keep going in endless mode.

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/LeviosaEXC/best-game-01-aetherdrift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/LeviosaEXC/best-game-01-aetherdrift/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

## How to play

Serve the `game/` directory over HTTP with any static file server and
open it in a desktop browser. No build step, no network requests —
every asset is code and canvas drawing.

## Controls

| Input | Action |
| --- | --- |
| W / A / S / D or arrows | Thrust (with inertia and drift) |
| Mouse | Aim |
| Hold left mouse | Fire |
| Space | Dash (brief invulnerability) |
| 1 / 2 / 3 or click | Pick a relic after clearing a wave |
| P or Esc | Pause / resume |
| M | Mute / unmute sound and music |
| Enter or click | Launch, continue to endless, restart |
| R | Quick restart |

## The game

- **15 waves** in a storm arena: three enemy kinds plus gold elites,
  then the Tempest Sovereign boss every 5th wave — radial bursts,
  aimed spreads, wisp summons, and telegraphed lightning strikes.
- **Momentum flight**: thrust accelerates the skiff, drag bleeds
  speed, and a dash bursts forward through danger.
- **Combo chains**: kills inside a short window raise the score
  multiplier, up to x5.
- **12 relics** drafted 1-of-3 after each cleared wave, each with a
  trade-off that reshapes the run.
- **Campaign win**: clear wave 15 to earn the "Storm Tamed" victory,
  then continue into endless waves. Best score is saved locally.
- **Sound**: fully synthesized WebAudio effects and a procedural
  116 BPM sequenced score. No audio files.

## Layout

- `game/index.html` — the page (canvas + module script)
- `game/src/` — the game modules (momentum, combo, relics, entities,
  waves, boss, render, scenes, audio, particles, input, rng)
- `main.ts` — the make.fun hand-in program
- `screenshots/` — four real renders of the game's own code
