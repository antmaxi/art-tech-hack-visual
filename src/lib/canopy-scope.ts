import { getAnnualRegion, nationalAnnual } from '@/lib/annual-vhi';

/** Immersion changes only the health data, never the selected map region. */
export function canopyAnnualVhi(year: number, regionId: number, immersive: boolean) {
  return immersive ? nationalAnnual(year).vhi : getAnnualRegion(year, regionId)?.vhi ?? null;
}