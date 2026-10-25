import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoundPause } from "@/lib/round-pause";

afterEach(() => vi.useRealTimers());

describe("silent final-picture hold", () => {
  it("restarts only after exactly two seconds", () => {
    vi.useFakeTimers();
    const finish = vi.fn();
    createRoundPause().resume(finish);
    vi.advanceTimersByTime(1999);
    expect(finish).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(finish).toHaveBeenCalledTimes(1);
  });

  it("preserves remaining silence when playback is paused", () => {
    vi.useFakeTimers();
    const hold = createRoundPause();
    const finish = vi.fn();
    hold.resume(finish);
    vi.advanceTimersByTime(750);
    hold.pause();
    vi.advanceTimersByTime(5000);
    expect(finish).not.toHaveBeenCalled();
    hold.resume(finish);
    vi.advanceTimersByTime(1249);
    expect(finish).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(finish).toHaveBeenCalledTimes(1);
  });

  it("cancels the pending restart on deliberate year selection", () => {
    vi.useFakeTimers();
    const hold = createRoundPause();
    const finish = vi.fn();
    hold.resume(finish);
    vi.advanceTimersByTime(1000);
    hold.reset();
    vi.advanceTimersByTime(2000);
    expect(finish).not.toHaveBeenCalled();
    hold.resume(finish);
    vi.advanceTimersByTime(2000);
    expect(finish).toHaveBeenCalledTimes(1);
  });
});