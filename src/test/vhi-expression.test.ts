import { describe, expect, it } from 'vitest';
import { ANNUAL_YEARS } from '@/lib/forest-data';
import { audioTimeForIndex, nationalAnnual, normalizeVhi, VHI_RANGE } from '@/lib/annual-vhi';
import { breathRate } from '@/lib/forest-art';

describe('expressive VHI range', () => {
  it('maps the worst observed year to 0 and the best to 1', () => {
    expect(normalizeVhi(VHI_RANGE.min)).toBe(0);
    expect(normalizeVhi(VHI_RANGE.max)).toBe(1);
  });

  it('keeps missing observations neutral', () => {
    expect(normalizeVhi(null)).toBe(0.5);
    expect(normalizeVhi(undefined)).toBe(0.5);
  });

  it('clamps values beyond the observed record', () => {
    expect(normalizeVhi(0)).toBe(0);
    expect(normalizeVhi(100)).toBe(1);
  });

  it('separates the 1992 drought from the peak year by most of the scale', () => {
    const drought = normalizeVhi(nationalAnnual(1992).vhi);
    const peak = normalizeVhi(nationalAnnual(2017).vhi);
    expect(peak - drought).toBeGreaterThan(0.6);
  });
});

describe('shared breathing tempo', () => {
  it('breathes more than 4x faster in deepest drought than at peak health', () => {
    expect(breathRate(0) / breathRate(1)).toBeGreaterThan(4);
  });

  it('slows monotonically as health rises', () => {
    expect(breathRate(0)).toBeGreaterThan(breathRate(0.5));
    expect(breathRate(0.5)).toBeGreaterThan(breathRate(1));
  });

  it('lets peak health breathe very slowly, over 20 seconds per breath', () => {
    const secondsPerBreath = (2 * Math.PI) / (breathRate(1) * 60);
    expect(secondsPerBreath).toBeGreaterThan(20);
  });
});

describe('soundtrack synchronisation', () => {
  it('maps each year to exactly three seconds of the track', () => {
    expect(audioTimeForIndex(0)).toBe(0);
    expect(audioTimeForIndex(1)).toBe(3);
    expect(audioTimeForIndex(35)).toBe(105);
  });

  it('covers the full 1991–2026 sequence within the 108-second track', () => {
    expect(ANNUAL_YEARS.length).toBe(36);
    expect(audioTimeForIndex(ANNUAL_YEARS.length)).toBe(108);
  });
});
