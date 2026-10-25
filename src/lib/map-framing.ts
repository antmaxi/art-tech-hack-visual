import type { LatLngBoundsExpression, Map } from 'leaflet';

// Only selection and actual map-container size changes should reset exploration.
export function createMapFraming(
  map: Pick<Map, 'stop' | 'invalidateSize' | 'fitBounds'>,
  boundsForSelection: (selection: number) => LatLngBoundsExpression,
) {
  let previous: { selection: number; width: number; height: number } | undefined;
  return (selection: number, width: number, height: number) => {
    if (width < 32 || height < 32) return;
    if (previous?.selection === selection && previous.width === width && previous.height === height) return;
    map.stop();
    map.invalidateSize({ pan: false, animate: false });
    map.fitBounds(boundsForSelection(selection), { padding: [16, 16], maxZoom: 12, animate: false });
    previous = { selection, width, height };
  };
}