export type FieldResolution = "low" | "high";
export const DEFAULT_FIELD_RESOLUTION: FieldResolution = "high";

/** Keep the normal panel unchanged; increase actual contour samples in immersion. */
export function fieldBufferSize(width: number, height: number, immersive: boolean, resolution: FieldResolution) {
  const high = immersive && resolution === "high";
  const budget = high ? 210000 : 70000;
  const scale = Math.min(high ? 1 : 0.5, Math.sqrt(budget / Math.max(1, width * height)));
  return {
    width: Math.max(2, Math.floor(width * scale)),
    height: Math.max(2, Math.floor(height * scale)),
  };
}