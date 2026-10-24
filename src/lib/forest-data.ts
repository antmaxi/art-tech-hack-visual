// Data layer for "Forest, 1991–2026". Replace PROTOTYPE_YEARS with a verified
// loader later (see loadYears). VCI and TCI stay null until a verified source exists.

export type DataStatus = "prototype" | "verified" | "missing" | "not-yet";

export interface YearRecord {
  year: number;
  day: string; // date used for the swisstopo WMS "item" parameter
  vhi: number | null;
  vci: number | null;
  tci: number | null;
  status: DataStatus;
}

export const SOURCE = {
  name: "swissEO VHI — Vegetation Health Index (swisstopo)",
  url: "https://opendata.swiss/en/dataset/swisseo-vhi-karte-des-vhi",
  layer: "ch.swisstopo.swisseo_vhi_v100",
};

// August values, forest warn-region 39 (Limmat), carried over from the original
// prototype. Provenance has not been confirmed against the official source, so
// they are flagged "prototype". null = frame empty or too few valid pixels.
const RAW: [string, number | null][] = [
  ["1991-08-01", 47], ["1992-08-01", 33], ["1993-08-01", 54], ["1994-08-01", 46],
  ["1995-08-01", 41], ["1996-08-01", 50], ["1997-08-01", 58], ["1998-08-01", 54],
  ["1999-08-01", 61], ["2000-08-01", 60], ["2001-08-01", 66], ["2002-08-01", 79],
  ["2003-08-01", 46], ["2004-08-01", null], ["2005-08-01", 61], ["2006-08-01", null],
  ["2007-08-01", null], ["2008-08-01", 70], ["2009-08-01", 62], ["2010-08-01", 70],
  ["2011-08-01", 57], ["2012-08-01", 66], ["2013-08-01", 73], ["2014-08-01", null],
  ["2015-08-01", 57], ["2016-08-01", 63], ["2017-08-01", null], ["2018-08-15", 30],
  ["2019-08-15", null], ["2020-08-15", 49], ["2021-08-15", 59], ["2022-08-15", 44],
  ["2023-08-15", 41], ["2024-08-15", 62], ["2025-08-15", 29],
];

export const PROTOTYPE_YEARS: YearRecord[] = [
  ...RAW.map(([day, vhi]) => ({
    year: Number(day.slice(0, 4)),
    day,
    vhi,
    vci: null,
    tci: null,
    status: (vhi == null ? "missing" : "prototype") as DataStatus,
  })),
  // August 2026 has not been observed yet — never invent a value.
  { year: 2026, day: "2026-08-15", vhi: null, vci: null, tci: null, status: "not-yet" },
];

/** Swap this for a fetch of verified data; keep the same shape. */
export async function loadYears(): Promise<YearRecord[]> {
  return PROTOTYPE_YEARS;
}

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
  if (y.status === "not-yet") return "not yet observed";
  if (y.status === "missing") return "no valid observation";
  if (y.status === "prototype") return "prototype value · unverified";
  return "verified";
}
