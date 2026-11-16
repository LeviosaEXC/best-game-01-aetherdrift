// Momentum movement: thrust with real inertia, exponential drag, a soft
// speed cap, bouncy arena walls, and a dash with invulnerability frames.
export function stepSkiff(skiff, input, stats, dt) {
  const thrust = input.thrustVector();
  if (thrust.x !== 0 || thrust.y !== 0) {
    skiff.vx += thrust.x * stats.thrust * dt;
    skiff.vy += thrust.y * stats.thrust * dt;
    skiff.thrusting = true;
    skiff.angle = Math.atan2(thrust.y, thrust.x);
  } else {
    skiff.thrusting = false;
  }
  const drag = Math.exp(-1.15 * dt);
  skiff.vx *= drag;
  skiff.vy *= drag;
  const speed = Math.hypot(skiff.vx, skiff.vy);
  if (speed > stats.maxSpeed) {
    const k = stats.maxSpeed / speed;
    skiff.vx *= k;
    skiff.vy *= k;
  }
  skiff.x += skiff.vx * dt;
  skiff.y += skiff.vy * dt;
  const m = 20;
  if (skiff.x < m) { skiff.x = m; skiff.vx = Math.abs(skiff.vx) * 0.85; }
  if (skiff.x > 1280 - m) { skiff.x = 1280 - m; skiff.vx = -Math.abs(skiff.vx) * 0.85; }
  if (skiff.y < m) { skiff.y = m; skiff.vy = Math.abs(skiff.vy) * 0.85; }
  if (skiff.y > 720 - m) { skiff.y = 720 - m; skiff.vy = -Math.abs(skiff.vy) * 0.85; }
  if (skiff.dashCooldown > 0) skiff.dashCooldown -= dt;
  if (skiff.invuln > 0) skiff.invuln -= dt;
  if (skiff.aegisTimer > 0) skiff.aegisTimer -= dt;
  // Persistent thrust ribbon: the last fast positions, fading.
  if (speed > 240) {
    skiff.ribbon.push({ x: skiff.x, y: skiff.y, life: 0.55 });
    if (skiff.ribbon.length > 18) skiff.ribbon.shift();
  }
  for (let i = skiff.ribbon.length - 1; i >= 0; i--) {
    skiff.ribbon[i].life -= dt;
    if (skiff.ribbon[i].life <= 0) skiff.ribbon.splice(i, 1);
  }
}

export function tryDash(skiff, stats) {
  if (skiff.dashCooldown > 0) return false;
  const speed = Math.hypot(skiff.vx, skiff.vy);
  let dx = 0;
  let dy = -1;
  if (speed > 30) {
    dx = skiff.vx / speed;
    dy = skiff.vy / speed;
  } else {
    dx = Math.cos(skiff.angle);
    dy = Math.sin(skiff.angle);
  }
  skiff.vx += dx * stats.dashImpulse;
  skiff.vy += dy * stats.dashImpulse;
  skiff.dashCooldown = stats.dashRecharge;
  skiff.invuln = Math.max(skiff.invuln, 0.35);
  skiff.dashing = true;
  return true;
}
