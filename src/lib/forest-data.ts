import { nationalAnnual, PLAYBACK_FIRST_YEAR, PLAYBACK_LAST_YEAR } from '@/lib/annual-vhi';

export type DataStatus = "supplied" | "estimated" | "missing";

export interface YearRecord {
  year: number;
  vhi: number | null;
  vci: number | null;
  tci: number | null;
  status: DataStatus;
  regionsAvailable: number;
  monthsAvailable: number;
  interpolatedMonths: number;
}

export const SOURCE = {
  name: "swissEO VHI — Vegetation Health Index (swisstopo)",
  url: "https://opendata.swiss/en/dataset/swisseo-vhi-karte-des-vhi",
  layer: "ch.swisstopo.swisseo_vhi_v100",
};

export const ANNUAL_YEARS: YearRecord[] = Array.from(
  { length: PLAYBACK_LAST_YEAR - PLAYBACK_FIRST_YEAR + 1 }, (_, i) => {
    const year = PLAYBACK_FIRST_YEAR + i;
    const summary = nationalAnnual(year);
    return { year, ...summary, vci: null, tci: null,
      status: summary.vhi == null ? 'missing' : summary.interpolatedMonths > 0 ? 'estimated' : 'supplied' };
  },
);

export function baselineMean(years: YearRecord[], until = 2020): number {
  const v = years.filter((y) => y.vhi != null && y.year <= until).map((y) => y.vhi as number);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 50;
}

export function band(v: number): string {
  if (v >= 60) return "excellent";
  if (v >= 50) return "good";
  if (v >= 40) return "normal";
  if (v >= 30) return "light stress";
  if (v >= 20) return "stress";
  if (v >= 10) return "severe stress";
  return "extreme stress";
}

export function statusLabel(y: YearRecord): string {
  if (y.status === "missing") return "no valid observation";
  if (y.status === "estimated") return "annual mean · includes interpolated months";
  return "annual mean · supplied monthly observations";
}
