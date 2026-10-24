// Generative helpers: noise + palettes used by both the panel and immersive mode.

const perm = new Uint8Array(512);
(function seed() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = 19910801;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    const t = p[i]!;
    p[i] = p[j]!;
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]!;
})();

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
function grad(h: number, x: number, y: number) {
  const b = h & 3;
  const u = b < 2 ? x : y;
  const v = b < 2 ? y : x;
  return (b & 1 ? -u : u) + (b & 2 ? -v : v);
}
export function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = fade(xf);
  const v = fade(yf);
  const pm = (i: number) => perm[i] ?? 0;
  const aa = pm(pm(xi & 255) + (yi & 255));
  const ab = pm(pm(xi & 255) + ((yi + 1) & 255));
  const ba = pm(pm((xi + 1) & 255) + (yi & 255));
  const bb = pm(pm((xi + 1) & 255) + ((yi + 1) & 255));
  const x1 = grad(aa, xf, yf) + (grad(ba, xf - 1, yf) - grad(aa, xf, yf)) * u;
  const x2 = grad(ab, xf, yf - 1) + (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1)) * u;
  return x1 + (x2 - x1) * v;
}

// Timeline palette (VHI → colour): stress = earth/rust, health = emerald.
const STOPS: [number, number[]][] = [
  [0, [70, 30, 14]],
  [20, [140, 72, 30]],
  [32, [176, 118, 58]],
  [42, [120, 116, 70]],
  [52, [52, 110, 70]],
  [64, [28, 150, 96]],
  [80, [70, 210, 140]],
  [100, [160, 240, 190]],
];
export function vhiColor(v: number | null): number[] {
  if (v == null) return [38, 40, 38];
  if (v <= STOPS[0]![0]) return STOPS[0]![1];
  for (let i = 1; i < STOPS.length; i++) {
    if (v <= STOPS[i]![0]) {
      const t = (v - STOPS[i - 1]![0]) / (STOPS[i]![0] - STOPS[i - 1]![0]);
      return STOPS[i - 1]![1].map((c, k) => Math.round(c + ((STOPS[i]![1][k] ?? c) - c) * t));
    }
  }
  return STOPS[STOPS.length - 1]![1];
}
export const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Shared breathing tempo for the field and the Canopy (radians per frame at 60fps).
 * Peak health ≈ 9.5s per breath (slow, meditative); deepest drought ≈ 2s (rapid,
 * shallow panting), with a smooth nonlinear gradient between. Both panels call this
 * so their movement stays synchronised in Immersion Mode.
 */
export const breathRate = (health: number) => 0.011 + (1 - clamp01(health)) ** 2 * 0.041;
