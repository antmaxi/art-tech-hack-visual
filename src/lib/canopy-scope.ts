import { getAnnualRegion, nationalAnnual } from '@/lib/annual-vhi';
import { getRegionVhi } from '@/lib/vhi-source';

/** Immersion changes only the health data, never the selected map region. */
export function canopyAnnualVhi(year: number, regionId: number, immersive: boolean) {
  return immersive ? nationalAnnual(year).vhi : getAnnualRegion(year, regionId)?.vhi ?? null;
}

/** Keep the terrain intact, but never seed national health from a selected region. */
export function canopyHealthSource(regionId: number, vhi: number | null | undefined, scope: 'regional' | 'national') {
  return getRegionVhi(scope === 'national' ? 0 : regionId, vhi);
}