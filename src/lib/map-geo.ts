// Zurich region in Swiss coordinates (EPSG:2056): [minX, minY, maxX, maxY]
export const MAP_BBOX = [2660000, 1225000, 2720000, 1275000] as const;
export const MAP_W = 1200;
export const MAP_H = 1000;

export function toMap(x: number, y: number) {
  const [x0, y0, x1, y1] = MAP_BBOX;
  return { left: ((x - x0) / (x1 - x0)) * MAP_W, top: ((y1 - y) / (y1 - y0)) * MAP_H };
}

export function wmsUrl(layers: string) {
  return (
    `https://wms.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true` +
    `&LAYERS=${layers}&STYLES=&CRS=EPSG:2056&BBOX=${MAP_BBOX.join(",")}&WIDTH=${MAP_W}&HEIGHT=${MAP_H}`
  );
}

// Approximate, publicly reported data centre sites — positions are indicative only.
export const DATA_CENTRES = [
  { name: "Equinix ZH4, Oberengstringen", x: 2677600, y: 1251900 },
  { name: "NTT, Rümlang", x: 2683600, y: 1256400 },
  { name: "Digital Realty, Glattbrugg", x: 2685300, y: 1254600 },
  { name: "Green, Dielsdorf", x: 2676700, y: 1260300 },
  { name: "Equinix ZH5, Zurich West", x: 2680400, y: 1249300 },
];

export function wmsUrlFor(layers: string, bbox: readonly number[], w: number, h: number) {
  return (
    `https://wms.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true` +
    `&LAYERS=${layers}&STYLES=&CRS=EPSG:2056&BBOX=${bbox.join(",")}&WIDTH=${w}&HEIGHT=${h}`
  );
}
