import { getAnnualRegion, nationalAnnual } from '@/lib/annual-vhi';
import { getRegionVhi } from '@/lib/vhi-source';

/** Selection value meaning "all of Switzerland" (no single region). */
export const ALL_SWITZERLAND = 0;

/** National data applies in immersion or when all of Switzerland is selected. */
export const isNationalScope = (regionId: number, immersive: boolean) => immersive || regionId === ALL_SWITZERLAND;

/** Immersion changes only the health data, never the selected map region. */
export function canopyAnnualVhi(year: number, regionId: number, immersive: boolean) {
  return isNationalScope(regionId, immersive) ? nationalAnnual(year).vhi : getAnnualRegion(year, regionId)?.vhi ?? null;
}

/** Keep the terrain intact, but never seed national health from a selected region. */
export function canopyHealthSource(regionId: number, vhi: number | null | undefined, scope: 'regional' | 'national') {
  return getRegionVhi(scope === 'national' ? 0 : regionId, vhi);
}
