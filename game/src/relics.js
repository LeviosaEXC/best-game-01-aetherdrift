// The twelve relics. Every one carries a trade-off, and effects stack
// when the same relic is drafted twice. The draft offers three choices
// after every cleared wave except the campaign-winning one.
export function defaultStats() {
  return {
    thrust: 430,
    maxSpeed: 560,
    dashImpulse: 540,
    dashRecharge: 2.2,
    dashDamage: 0,
    fireRate: 6,
    bulletSpeed: 640,
    bulletDamage: 1,
    projectiles: 1,
    maxHull: 100,
    comboWindow: 3.5,
    comboCap: 5,
    comboDecay: 1,
    pickupRadius: 90,
    regen: 0,
    chainLightning: false,
    aegis: false,
  };
}

export const RELIC_POOL = [
  { id: 'twin', name: 'TWIN CANNONS', desc: '+1 projectile per shot. Bullets 8% slower.', apply(s) { s.projectiles += 1; s.bulletSpeed *= 0.92; } },
  { id: 'plating', name: 'HEAVY PLATING', desc: '+40 max hull, repair 40 now. Thrust 8% lower.', apply(s) { s.maxHull += 40; }, heal: 40, thrustMul: 0.92 },
  { id: 'keel', name: 'SWIFT KEEL', desc: '+18% thrust. -10 max hull.', apply(s) { s.thrust *= 1.18; s.maxHull -= 10; } },
  { id: 'coils', name: 'OVERCLOCKED COILS', desc: '+25% fire rate. Bullets 15% slower.', apply(s) { s.fireRate *= 1.25; s.bulletSpeed *= 0.85; } },
  { id: 'chain', name: 'CHAIN LIGHTNING', desc: 'Shots arc to a nearby foe for half damage. Fire rate 10% lower.', apply(s) { s.chainLightning = true; s.fireRate *= 0.9; } },
  { id: 'extender', name: 'COMBO EXTENDER', desc: '+1.5s combo window. Multiplier cap +1.', apply(s) { s.comboWindow += 1.5; s.comboCap += 1; } },
  { id: 'magnet', name: 'MAGNET COIL', desc: 'Pickup attraction radius x3.', apply(s) { s.pickupRadius *= 3; } },
  { id: 'nanoweave', name: 'NANOWEAVE HULL', desc: 'Regenerate 1.5 hull per second. -10 max hull.', apply(s) { s.regen += 1.5; s.maxHull -= 10; } },
  { id: 'capacitor', name: 'DASH CAPACITOR', desc: 'Dash recharges 40% faster. Dashing through foes deals 25 damage.', apply(s) { s.dashRecharge *= 0.6; s.dashDamage = 25; } },
  { id: 'sails', name: 'STORM SAILS', desc: '+12% thrust and top speed. Combo decays 20% faster.', apply(s) { s.thrust *= 1.12; s.maxSpeed *= 1.12; s.comboDecay *= 1.2; } },
  { id: 'void', name: 'VOID ROUNDS', desc: '+1 bullet damage. Fire rate 15% lower.', apply(s) { s.bulletDamage += 1; s.fireRate *= 0.85; } },
  { id: 'aegis', name: 'AEGIS FIELD', desc: 'Blocks one hit every 20 seconds. Thrust 8% lower.', apply(s) { s.aegis = true; }, thrustMul: 0.92 },
];

export function rollDraft(rng) {
  const pool = [...RELIC_POOL];
  const picks = [];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(rng.next() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

export function applyRelic(stats, relic) {
  relic.apply(stats);
  if (relic.thrustMul) stats.thrust *= relic.thrustMul;
  if (stats.maxHull < 20) stats.maxHull = 20;
  if (stats.fireRate < 1) stats.fireRate = 1;
  if (stats.bulletSpeed < 200) stats.bulletSpeed = 200;
}
