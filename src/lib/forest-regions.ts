import proj4 from 'proj4';
import { REGIONS } from '@/lib/vhi-source';
import { AVAILABLE_REGION_IDS } from '@/lib/annual-vhi';

const SWISS_GRID = '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs';
export const SWITZERLAND_BOUNDS: [[number, number], [number, number]] = [[45.82, 5.96], [47.81, 10.49]];
export const MAP_REGIONS = REGIONS.filter((r) => AVAILABLE_REGION_IDS.includes(r.id)).map((region) => ({
  id: region.id,
  rings: region.rings.map((ring) => ring.map(([e, n]) => {
    const point = proj4(SWISS_GRID, 'EPSG:4326', { x: e ?? 0, y: n ?? 0 });
    return [point.y, point.x] as [number, number];
  })),
}));