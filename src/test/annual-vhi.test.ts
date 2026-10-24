import { describe, expect, it } from 'vitest';
import { aggregateAnnual, AVAILABLE_REGION_IDS, getAnnualRegion, interpolateMonthly, nationalAnnual, ORIGINAL_MONTHLY_VHI, parseMonthlyVhi, YEAR_DURATION_MS } from '@/lib/annual-vhi';
import { ANNUAL_YEARS } from '@/lib/forest-data';
import { MAP_REGIONS, SWITZERLAND_BOUNDS } from '@/lib/forest-regions';
import { getRegionVhi } from '@/lib/vhi-source';

describe('annual Swiss VHI rules', () => {
  it('averages all twelve months rather than an August snapshot', () => {
    const rows = parseMonthlyVhi('month,REGION_NR,vhi_mean\n' + Array.from({ length: 12 }, (_, i) => `2000-${String(i + 1).padStart(2, '0')},39,${i + 1}`).join('\n'));
    expect(aggregateAnnual(rows)[0].vhi).toBe(6.5);
    expect(aggregateAnnual(rows)[0].monthsAvailable).toBe(12);
  });
  it('interpolates a missing month between previous and next month within the same region', () => {
    const rows = parseMonthlyVhi('month,REGION_NR,vhi_mean\n2000-01,39,20\n2000-02,39,\n2000-03,39,60\n2000-02,40,99');
    const filled = interpolateMonthly(rows);
    expect(filled.find((r) => r.regionId === 39 && r.month === '2000-02')).toMatchObject({ vhi: 40, interpolated: true });
    expect(rows[1].vhi).toBeNull();
  });
  it('uses proportional interpolation for consecutive missing months', () => {
    const rows = parseMonthlyVhi('month,REGION_NR,vhi_mean\n2000-01,39,10\n2000-04,39,70');
    expect(interpolateMonthly(rows).map((r) => r.vhi)).toEqual([10, 30, 50, 70]);
  });
  it('never extrapolates unbounded gaps or fabricates later months', () => {
    const rows = parseMonthlyVhi('month,REGION_NR,vhi_mean\n2000-01,39,\n2000-02,39,50\n2000-03,39,');
    expect(interpolateMonthly(rows).map((r) => r.vhi)).toEqual([null, 50, null]);
    expect(getAnnualRegion(2026, 39)?.monthsAvailable).toBe(10);
    expect(ORIGINAL_MONTHLY_VHI.some((r) => r.month === '2026-11')).toBe(false);
  });
  it('includes every supplied region and maps their boundaries within Switzerland', () => {
    expect(AVAILABLE_REGION_IDS).toEqual(Array.from({ length: 38 }, (_, i) => 31 + i));
    expect(MAP_REGIONS.map((r) => r.id).sort((a, b) => a - b)).toEqual(AVAILABLE_REGION_IDS);
    expect(SWITZERLAND_BOUNDS).toEqual([[45.82, 5.96], [47.81, 10.49]]);
    expect(MAP_REGIONS.every((r) => r.rings.every((ring) => ring.every(([lat, lng]) => lat > 45.7 && lat < 47.9 && lng > 5.8 && lng < 10.7)))).toBe(true);
  });
  it('keeps 35 historical years at 5000ms each for a 175-second sequence', () => {
    expect(ANNUAL_YEARS.map((r) => r.year)).toEqual(Array.from({ length: 35 }, (_, i) => 1991 + i));
    expect(YEAR_DURATION_MS).toBe(5000);
    expect(ANNUAL_YEARS.length * YEAR_DURATION_MS).toBe(175000);
  });
  it('uses equal-weight regional annual means for the national field', () => {
    const regions = AVAILABLE_REGION_IDS.map((id) => getAnnualRegion(2025, id)?.vhi ?? 0);
    expect(nationalAnnual(2025).vhi).toBeCloseTo(regions.reduce((s, v) => s + v, 0) / 38, 10);
    expect(nationalAnnual(2025).vhi).toBeCloseTo(49.289231643363216, 8);
  });
  it('feeds the selected regional annual mean into the Canopy', () => {
    const annual = getAnnualRegion(1992, 39);
    expect(annual?.vhi).not.toBeNull();
    expect(getRegionVhi(39, annual?.vhi).mean).toBeCloseTo((annual?.vhi ?? 0) / 100);
    expect(getAnnualRegion(1992, 31)?.vhi).not.toBe(annual?.vhi);
  });
});