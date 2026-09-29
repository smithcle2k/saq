import type { IntervalCue } from './intervalCuePlan.ts';

export interface ScheduledCueAction {
  cue: IntervalCue;
  delayMs: number;
}

export const getCueScheduleActions = (
  cuePlan: readonly IntervalCue[],
  elapsedMs: number,
  deliveredCueIds: ReadonlySet<number>
): ScheduledCueAction[] =>
  cuePlan
    .filter((cue) => !deliveredCueIds.has(cue.id))
    .map((cue) => ({
      cue,
      delayMs: Math.max(0, cue.offsetMs - elapsedMs),
    }));

export const getRecentCuesAfterSelection = (recentCues: readonly string[], cue: string) =>
  [...recentCues, cue].slice(-2);
