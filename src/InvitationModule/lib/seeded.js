// Small seeded PRNG (mulberry32). Decorations generated with it are identical on the server and
// in the browser, so hydration never sees different SVG markup.
export function seeded(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One decimal is plenty for SVG coordinates and keeps the markup short.
export function round1(n) {
  const r = Math.round(n * 10) / 10;
  return r === 0 ? 0 : r; // no "-0"
}
