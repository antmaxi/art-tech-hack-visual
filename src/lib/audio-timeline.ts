import { YEAR_DURATION_MS } from "@/lib/annual-vhi";

/** Let continuous audio drive the year, never seek on automatic year changes. */
export function indexForAudioTime(seconds: number, yearCount: number): number {
  if (yearCount <= 0 || !Number.isFinite(seconds)) return 0;
  return Math.max(0, Math.min(yearCount - 1, Math.floor(seconds * 1000 / YEAR_DURATION_MS)));
}