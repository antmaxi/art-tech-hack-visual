import { describe, expect, it } from "vitest";
import { traceFieldContours, visibleContourRing } from "@/lib/field-contours";

describe("continuous immersive contours", () => {
  it("interpolates a continuous elevation crossing between samples", () => {
    const lines = traceFieldContours([0, 1, 2, 0, 1, 2, 0, 1, 2], 3, 3);
    const ring = lines[0]?.coordinates[0]?.[0] ?? [];
    expect(ring.filter(([x, y]) => x === 1 && y !== undefined && y > 0 && y < 3).length).toBeGreaterThanOrEqual(3);
  });

  it("excludes dot-sized islands while retaining larger continuous rings", () => {
    expect(visibleContourRing([[0, 0], [1, 0], [1, 1], [0, 0]], 3, 3)).toBe(false);
    expect(visibleContourRing([[0, 0], [4, 0], [4, 4], [0, 0]], 3, 3)).toBe(true);
  });
});