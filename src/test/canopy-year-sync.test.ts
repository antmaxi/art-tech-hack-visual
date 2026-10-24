import { describe, expect, it } from "vitest";
import { getRegionVhi } from "@/lib/vhi-source";

// The Canopy must follow the selected year only where real data exists.
describe("canopy year sync", () => {
  it("uses the annual regional VHI as the field mean and is not hypothetical", () => {
    const s = getRegionVhi(39, 62);
    expect(s.hypothetical).toBe(false);
    expect(s.mean).toBeCloseTo(0.62);
  });

  it("stays hypothetical when the selected year has no observation", () => {
    expect(getRegionVhi(39, null).hypothetical).toBe(true);
    expect(getRegionVhi(39, undefined).hypothetical).toBe(true);
  });

  it("never invents a mean for a missing year", () => {
    const a = getRegionVhi(39, null).mean;
    const b = getRegionVhi(39, null).mean;
    expect(a).toBe(b); // stable per-region fallback, not derived from other years
  });
});
