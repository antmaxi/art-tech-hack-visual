import csv from '@/data/forest-vhi-monthly.csv?raw';

export type MonthlyVhi = { month: string; regionId: number; vhi: number | null; interpolated: boolean };
export type AnnualVhi = { year: number; regionId: number; vhi: number | null; monthsAvailable: number; observedMonths: number; interpolatedMonths: number };
export const YEAR_DURATION_MS = 5000;
export const PLAYBACK_FIRST_YEAR = 1991;
export const PLAYBACK_LAST_YEAR = 2025;

const monthIndex = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;
const monthLabel = (index: number) => `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;

export function parseMonthlyVhi(text: string): MonthlyVhi[] {
  return text.trim().split(/\r?\n/).slice(1).map((line) => {
    const [month = '', region, value] = line.split(',');
    const parsed = value?.trim() ? Number(value) : null;
    return { month, regionId: Number(region), vhi: parsed != null && Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null, interpolated: false };
  });
}

/** Fill only bounded gaps within one region; original observations remain untouched. */
export function interpolateMonthly(rows: MonthlyVhi[]): MonthlyVhi[] {
  const groups = new Map<number, MonthlyVhi[]>();
  for (const row of rows) groups.set(row.regionId, [...(groups.get(row.regionId) ?? []), { ...row }]);
  const result: MonthlyVhi[] = [];
  for (const [regionId, group] of groups) {
    group.sort((a, b) => monthIndex(a.month) - monthIndex(b.month));
    const first = group[0];
    const last = group.at(-1);
    if (!first || !last) continue;
    const byMonth = new Map(group.map((r) => [monthIndex(r.month), r]));
    const series = Array.from({ length: monthIndex(last.month) - monthIndex(first.month) + 1 }, (_, i) => {
      const index = monthIndex(first.month) + i;
      return byMonth.get(index) ?? { month: monthLabel(index), regionId, vhi: null, interpolated: false };
    });
    let previous = -1;
    for (let next = 0; next < series.length; next++) {
      const value = series[next]?.vhi;
      if (value == null) continue;
      const before = series[previous]?.vhi;
      if (previous >= 0 && before != null) {
        for (let i = previous + 1; i < next; i++) {
          const row = series[i];
          if (row) series[i] = { ...row, vhi: before + (value - before) * (i - previous) / (next - previous), interpolated: true };
        }
      }
      previous = next;
    }
    result.push(...series);
  }
  return result;
}

export function aggregateAnnual(rows: MonthlyVhi[]): AnnualVhi[] {
  const groups = new Map<string, MonthlyVhi[]>();
  for (const row of rows) {
    const key = `${row.month.slice(0, 4)}:${row.regionId}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()].map((group) => {
    const valid = group.filter((r) => r.vhi != null);
    return {
      year: Number(group[0]?.month.slice(0, 4)), regionId: group[0]?.regionId ?? 0,
      vhi: valid.length ? valid.reduce((sum, r) => sum + (r.vhi ?? 0), 0) / valid.length : null,
      monthsAvailable: valid.length,
      observedMonths: valid.filter((r) => !r.interpolated).length,
      interpolatedMonths: valid.filter((r) => r.interpolated).length,
    };
  });
}

export const ORIGINAL_MONTHLY_VHI = parseMonthlyVhi(csv);
export const MONTHLY_VHI = interpolateMonthly(ORIGINAL_MONTHLY_VHI);
export const ANNUAL_REGIONAL_VHI = aggregateAnnual(MONTHLY_VHI);
export const AVAILABLE_REGION_IDS = [...new Set(ORIGINAL_MONTHLY_VHI.map((r) => r.regionId))].sort((a, b) => a - b);
export const getAnnualRegion = (year: number, regionId: number) => ANNUAL_REGIONAL_VHI.find((r) => r.year === year && r.regionId === regionId);

/** Equal-weight average of regional annual means; not an area-weighted national estimate. */
export function nationalAnnual(year: number) {
  const regions = ANNUAL_REGIONAL_VHI.filter((r) => r.year === year && r.vhi != null);
  return {
    vhi: regions.length ? regions.reduce((sum, r) => sum + (r.vhi ?? 0), 0) / regions.length : null,
    regionsAvailable: regions.length,
    monthsAvailable: regions.reduce((sum, r) => sum + r.monthsAvailable, 0),
    interpolatedMonths: regions.reduce((sum, r) => sum + r.interpolatedMonths, 0),
  };
}