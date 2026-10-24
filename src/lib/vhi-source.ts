import data from "@/data/vhi-regions.json";

export type VhiRegion = { id: number; bbox: number[]; rings: number[][][] };
export const REGIONS = data.regions as VhiRegion[];
export const DEFAULT_REGION = 39;

export const REGION_NAMES: Record<number, string> = {
  39: "Zurich, Glatt & Limmat",
  42: "Zurich Unterland & Weinland",
  43: "Zurich Oberland & Pfannenstiel",
};
export const regionLabel = (id: number) => REGION_NAMES[id] ?? `Warning region ${id}`;
export const getRegion = (id: number) => REGIONS.find((r) => r.id === id) ?? REGIONS.find((r) => r.id === DEFAULT_REGION)!;

function hash(n: number) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/**
 * VHI for a region, as health 0..1 (VHI / 100).
 * HYPOTHETICAL for now: a stable per-region mean plus a smooth spatial field.
 * Later: replace with predownloaded real per-region rasters, same return shape.
 */
export function getRegionVhi(id: number) {
  const mean = 0.25 + hash(id) * 0.6;
  const a = hash(id * 7 + 1) * 6.28;
  const b = hash(id * 13 + 2) * 6.28;
  const field = (u: number, v: number) => {
    const w = Math.sin(u * 9 + a) * Math.cos(v * 7 + b) * 0.18 + Math.sin((u + v) * 23 + b) * 0.07;
    return Math.min(1, Math.max(0, mean + w));
  };
  return { hypothetical: true, mean, field };
}

/** Pixel frame for a region: padded bbox and canvas size with the bbox's aspect. */
export function regionFrame(r: VhiRegion, max = 1200) {
  const [x0, y0, x1, y1] = r.bbox as [number, number, number, number];
  const p = Math.max(x1 - x0, y1 - y0) * 0.05;
  const bbox = [x0 - p, y0 - p, x1 + p, y1 + p] as [number, number, number, number];
  const ar = (bbox[2] - bbox[0]) / (bbox[3] - bbox[1]);
  const W = Math.round(ar >= 1 ? max : max * ar);
  const H = Math.round(ar >= 1 ? max / ar : max);
  const toPx = (e: number, n: number) => [((e - bbox[0]) / (bbox[2] - bbox[0])) * W, ((bbox[3] - n) / (bbox[3] - bbox[1])) * H] as const;
  return { bbox, W, H, toPx };
}
