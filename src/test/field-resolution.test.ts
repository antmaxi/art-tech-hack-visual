import { describe, expect, it } from "vitest";
import { DEFAULT_FIELD_RESOLUTION, fieldBufferSize, FRAME_INTERVAL_MS, frameTimeScale } from "@/lib/field-resolution";

describe("immersive contour resolution", () => {
  it("defaults to high quality", () => {
    expect(DEFAULT_FIELD_RESOLUTION).toBe("high");
  });

  it("samples three times as many pixels in high mode, within its bounded budget", () => {
    const low = fieldBufferSize(1280, 1049, true, "low");
    const high = fieldBufferSize(1280, 1049, true, "high");
    expect(high.width * high.height).toBeGreaterThan(low.width * low.height * 2.9);
    expect(high.width * high.height).toBeLessThanOrEqual(210000);
    expect(low.width * low.height).toBeLessThanOrEqual(70000);
  });

  it("preserves the original normal-panel resolution regardless of the immersive setting", () => {
    expect(fieldBufferSize(400, 800, false, "high")).toEqual(fieldBufferSize(400, 800, false, "low"));
    expect(fieldBufferSize(400, 800, false, "high")).toEqual({ width: 187, height: 374 });
  });
});