import { describe, expect, it } from "vitest";
import { indexForAudioTime } from "@/lib/audio-timeline";

describe("continuous soundtrack timeline", () => {
  it("advances years from continuous audio at three-second boundaries", () => {
    expect(indexForAudioTime(2.99, 36)).toBe(0);
    expect(indexForAudioTime(3, 36)).toBe(1);
    expect(indexForAudioTime(6.2, 36)).toBe(2);
    expect(indexForAudioTime(105, 36)).toBe(35);
  });

  it("keeps 2026 selected until the recording loops back to 1991", () => {
    expect(indexForAudioTime(108, 36)).toBe(35);
    expect(indexForAudioTime(0, 36)).toBe(0);
  });
});