import { TimerPhase } from '../types';

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
