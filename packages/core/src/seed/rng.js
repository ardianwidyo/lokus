/**
 * Deterministic pseudo-random source. The seeded dataset must be byte-identical
 * on every machine and every run, otherwise the eval golden set and the demo
 * screenshots drift. `Math.random()` is never used anywhere in this package.
 *
 * mulberry32 — small, fast, good enough for fixture generation.
 */
export function createRng(seed) {
  let state = hashSeed(seed);

  function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    /** Integer in [min, max]. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
  };
}

function hashSeed(seed) {
  const text = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
