import { YEAR_DURATION_MS } from "@/lib/annual-vhi";

export const ROUND_PAUSE_MS = 500;

/** Return a cancellation function so manual navigation cannot trigger a stale restart. */
export function scheduleRoundRestart(restart: () => void): () => void {
  const timer = setTimeout(restart, ROUND_PAUSE_MS);
  return () => clearTimeout(timer);
}

/** Let continuous audio drive the year, never seek on automatic year changes. */
export function indexForAudioTime(seconds: number, yearCount: number): number {
  if (yearCount <= 0 || !Number.isFinite(seconds)) return 0;
  return Math.max(0, Math.min(yearCount - 1, Math.floor(seconds * 1000 / YEAR_DURATION_MS)));
}