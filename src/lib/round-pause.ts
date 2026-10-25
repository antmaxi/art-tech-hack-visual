/** A silent inter-round hold; pausing playback preserves its remaining time. */
export const ROUND_PAUSE_MS = 2000;

export function createRoundPause() {
  let remaining = ROUND_PAUSE_MS;
  let started = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pause = () => {
    if (timer === undefined) return;
    clearTimeout(timer);
    timer = undefined;
    remaining = Math.max(0, remaining - (Date.now() - started));
  };
  return {
    pause,
    reset() {
      pause();
      remaining = ROUND_PAUSE_MS;
    },
    resume(finish: () => void) {
      if (timer !== undefined) return;
      started = Date.now();
      timer = setTimeout(() => {
        timer = undefined;
        remaining = ROUND_PAUSE_MS;
        finish();
      }, remaining);
    },
  };
}