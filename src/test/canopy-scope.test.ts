import { describe, expect, it } from 'vitest';
import { canopyAnnualVhi, canopyHealthSource } from '@/lib/canopy-scope';
import { AVAILABLE_REGION_IDS, getAnnualRegion, nationalAnnual } from '@/lib/annual-vhi';
import { ANNUAL_YEARS } from '@/lib/forest-data';
import { getRegionVhi } from '@/lib/vhi-source';

describe('immersive-only Canopy data scope', () => {
  it('preserves regional data outside immersion', () => {
    expect(canopyAnnualVhi(1991, 47, false)).toBe(33.625);
  });

  it('uses the national mean independently of selected region in immersion', () => {
    const national = nationalAnnual(2009).vhi;
    expect(national).not.toBeNull();
    expect(getAnnualRegion(2009, 47)?.vhi).not.toBe(national);
    expect(canopyAnnualVhi(2009, 47, true)).toBe(national);
    expect(canopyAnnualVhi(2009, 39, true)).toBe(national);
  });

  it('restores the selected regional value after immersion ends', () => {
    const regional = canopyAnnualVhi(1991, 47, false);
    expect(canopyAnnualVhi(1991, 47, true)).not.toBe(regional);
    expect(canopyAnnualVhi(1991, 47, false)).toBe(33.625);
  });

  it('uses all 38 regions and the breathing artwork dataset for every immersive year', () => {
    for (const year of ANNUAL_YEARS) {
      const values = AVAILABLE_REGION_IDS.map(id => getAnnualRegion(year.year, id)?.vhi);
      expect(values.filter(value => value != null)).toHaveLength(38);
      const expected = values.reduce<number>((sum, value) => sum + (value ?? 0), 0) / 38;
      expect(year.vhi).toBeCloseTo(expected, 10);
      for (const id of AVAILABLE_REGION_IDS) {
        expect(canopyAnnualVhi(year.year, id, true)).toBe(year.vhi);
      }
    }
  });

  it('keeps the actual national health field independent of all selected regions', () => {
    const vhi = nationalAnnual(2025).vhi;
    expect(vhi).toBeCloseTo(49.28923245614036, 8);
    const national = canopyHealthSource(39, vhi, 'national');
    for (const id of AVAILABLE_REGION_IDS) {
      const source = canopyHealthSource(id, vhi, 'national');
      expect(source.mean).toBeCloseTo(0.4928923245614036, 10);
      for (const [u, v] of [[0.1, 0.2], [0.5, 0.5], [0.8, 0.7]] as const) {
        expect(source.field(u, v)).toBe(national.field(u, v));
      }
    }
  });

  it('restores the exact regional health field outside immersion', () => {
    const regional = canopyHealthSource(47, 33.625, 'regional');
    expect(regional.mean).toBe(0.33625);
    expect(regional.field(0.1, 0.2)).toBe(getRegionVhi(47, 33.625).field(0.1, 0.2));
    expect(regional.field(0.1, 0.2)).not.toBe(canopyHealthSource(47, 33.625, 'national').field(0.1, 0.2));
  });
});