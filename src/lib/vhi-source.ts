import data from "@/data/vhi-regions.json";
import { AVAILABLE_REGION_IDS } from "@/lib/annual-vhi";

export type VhiRegion = { id: number; bbox: number[]; rings: number[][][] };
export const REGIONS = data.regions as VhiRegion[];
export const DEFAULT_REGION = 39;

export const REGION_NAMES: Record<number, string> = {
  31: "Östlicher Jura",
  32: "Balsthal",
  33: "Unteres Emmental",
  34: "Berner Mittelland",
  35: "Westliches Berner Oberland",
  36: "Greyerzerland",
  37: "Oberaargau",
  38: "Oberes Emmental",
  39: "Freiamt",
  40: "Westliche Zentralschweiz",
  41: "Östliches Berner Oberland",
  42: "Östliches Mittelland",
  43: "Zürichseebecken",
  44: "Östliche Zentralschweiz",
  45: "Urner Alpen",
  46: "Surselva",
  47: "Alpstein",
  48: "Glarner Alpen",
  49: "Nördliches Mittelbünden",
  50: "Südliches Mittelbünden",
  51: "Rheintal",
  52: "Prättigau",
  53: "Freiberge",
  54: "Westlicher Jura",
  55: "Westliches Mittelland",
  56: "Genferseebecken",
  57: "Chablais",
  58: "Walliser Südalpen",
  59: "Nördliches Wallis",
  60: "Vispertäler",
  61: "Goms",
  62: "Westliches Tessin",
  63: "Nordtessin",
  64: "Östliches Tessin",
  65: "Sottoceneri",
  66: "Bündner Südtäler",
  67: "Oberengadin",
  68: "Unterengadin",
};
export const regionLabel = (id: number) => REGION_NAMES[id] ?? `Region ${id}`;
/** Region ids ordered alphabetically by name (German collation) for menus and lists. */
export const REGION_IDS_BY_NAME = [...AVAILABLE_REGION_IDS].sort((a, b) =>
  regionLabel(a).localeCompare(regionLabel(b), "de"),
);
export const getRegion = (id: number) => REGIONS.find((r) => r.id === id) ?? REGIONS.find((r) => r.id === DEFAULT_REGION)!;

function hash(n: number) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/**
 * VHI for a region, as health 0..1 (VHI / 100).
  * When an annual regional VHI (0..100) is passed, it becomes the field's mean
 * and the result is no longer hypothetical. Without one, the field falls back
 * to a stable per-region mean plus a smooth spatial field — clearly labelled
 * hypothetical. Monthly interpolation and annual aggregation occur in annual-vhi.
 */
export function getRegionVhi(id: number, vhi?: number | null) {
  const observed = vhi != null;
  const mean = observed ? vhi / 100 : 0.25 + hash(id) * 0.6;
  const a = hash(id * 7 + 1) * 6.28;
  const b = hash(id * 13 + 2) * 6.28;
  const field = (u: number, v: number) => {
    const w = Math.sin(u * 9 + a) * Math.cos(v * 7 + b) * 0.18 + Math.sin((u + v) * 23 + b) * 0.07;
    return Math.min(1, Math.max(0, mean + w));
  };
  return { hypothetical: !observed, mean, field };
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
