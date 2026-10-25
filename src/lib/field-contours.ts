import { contours } from "d3-contour";

/** Trace the same elevation levels as the raster, interpolating between samples. */
export function traceFieldContours(values: number[], width: number, height: number) {
  return contours().size([width, height]).smooth(true).thresholds(
    Array.from({ length: 20 }, (_, i) => i + 0.5),
  )(values);
}

/** Suppress subpixel islands, which would otherwise look like isolated dots. */
export function visibleContourRing(ring: number[][], scaleX: number, scaleY: number) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of ring) {
    const x = point[0];
    const y = point[1];
    if (x === undefined || y === undefined) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return Math.max((maxX - minX) * scaleX, (maxY - minY) * scaleY) >= 8;
}