/**
 * Deterministic seeded RNG (mulberry32). Pure: takes the current rng state,
 * returns a value in [0, 1) and the next state. The next state must be fed back
 * in for the following draw. Used by later plans (events); included now so the
 * GameState shape is stable.
 */
export function nextRandom(rngState: number): { value: number; rngState: number } {
  const t = (rngState + 0x6d2b79f5) | 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  const value = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  return { value, rngState: t };
}
