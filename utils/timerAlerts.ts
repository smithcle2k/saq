import { TimerPhase } from '../types.ts';

/**
 * Work-phase countdown beeps only kick in for longer efforts; short reaction
 * rounds are dense with spoken cues and beeps would collide with them.
 */
const MIN_WORK_TIME_FOR_COUNTDOWN = 10;

export const shouldPlayCountdownBeep = (
  phase: TimerPhase,
  timeRemaining: number,
  isPaused: boolean,
  workTime = 0
) => {
  if (isPaused || timeRemaining > 3 || timeRemaining <= 0) return false;

  if (phase === TimerPhase.PREP || phase === TimerPhase.REST) return true;
  return phase === TimerPhase.WORK && workTime >= MIN_WORK_TIME_FOR_COUNTDOWN;
};

export const shouldAnnounceRestFiveSeconds = (
  phase: TimerPhase,
  timeRemaining: number,
  isPaused: boolean,
  hasAnnouncedRestFiveSeconds: boolean
) => !isPaused && phase === TimerPhase.REST && timeRemaining === 5 && !hasAnnouncedRestFiveSeconds;

/** Window around a cue deadline in which a competing beep would mask cue speech. */
export const CUE_COLLISION_WINDOW_MS = 700;

/** Cue speech has priority: beeps within the window of any cue deadline are suppressed. */
export const isNearCueEvent = (
  elapsedWorkMs: number,
  cueOffsetsMs: readonly number[],
  windowMs = CUE_COLLISION_WINDOW_MS
) => cueOffsetsMs.some((offsetMs) => Math.abs(offsetMs - elapsedWorkMs) < windowMs);
