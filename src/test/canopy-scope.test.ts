import { describe, expect, it } from 'vitest';
import { canopyAnnualVhi } from '@/lib/canopy-scope';
import { getAnnualRegion, nationalAnnual } from '@/lib/annual-vhi';

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
});