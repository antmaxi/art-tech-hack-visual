import { describe, expect, it, vi } from "vitest";
import { indexForAudioTime, scheduleRoundRestart } from "@/lib/audio-timeline";

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

  it("holds the final picture for exactly one second before restarting", () => {
    vi.useFakeTimers();
    try {
      const restart = vi.fn();
      scheduleRoundRestart(restart);
      vi.advanceTimersByTime(999);
      expect(restart).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(restart).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels a pending restart when navigating manually", () => {
    vi.useFakeTimers();
    try {
      const restart = vi.fn();
      const cancel = scheduleRoundRestart(restart);
      cancel();
      vi.advanceTimersByTime(1000);
      expect(restart).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});