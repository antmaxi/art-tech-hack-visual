import { describe, expect, it, vi } from 'vitest';
import { createMapFraming } from '@/lib/map-framing';
import { SWITZERLAND_BOUNDS } from '@/lib/forest-regions';

function setup() {
  const map = { stop: vi.fn(), invalidateSize: vi.fn(), fitBounds: vi.fn() };
  const regionalBounds: [[number, number], [number, number]] = [[47.1, 9.1], [47.4, 9.5]];
  const frame = createMapFraming(map, id => id === 47 ? regionalBounds : SWITZERLAND_BOUNDS);
  return { map, frame, regionalBounds };
}

describe('Place map navigation', () => {
  it('centers the complete menu-selected region, then restores all Switzerland', () => {
    const { map, frame, regionalBounds } = setup();
    frame(47, 404, 600);
    expect(map.fitBounds).toHaveBeenLastCalledWith(regionalBounds, { padding: [16, 16], maxZoom: 12, animate: false });
    frame(0, 404, 600);
    expect(map.fitBounds).toHaveBeenLastCalledWith(SWITZERLAND_BOUNDS, { padding: [16, 16], maxZoom: 12, animate: false });
  });
  it('refits when the map itself changes size, after updating Leaflet dimensions', () => {
    const { map, frame } = setup();
    frame(47, 404, 600);
    frame(47, 404, 500);
    expect(map.fitBounds).toHaveBeenCalledTimes(2);
    expect(map.invalidateSize.mock.invocationCallOrder[1]).toBeLessThan(map.fitBounds.mock.invocationCallOrder[1] ?? 0);
  });
  it('preserves manual zoom and pan during playback and ignores hidden map sizes', () => {
    const { map, frame } = setup();
    frame(47, 0, 600);
    expect(map.fitBounds).not.toHaveBeenCalled();
    frame(47, 404, 600);
    frame(47, 404, 600);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
  });
});