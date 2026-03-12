import { TimerPhase } from '../types';

export const shouldPlayCountdownBeep = (
  phase: TimerPhase,
  timeRemaining: number,
  isPaused: boolean
) =>
  !isPaused &&
  (phase === TimerPhase.PREP || phase === TimerPhase.REST) &&
  timeRemaining <= 3 &&
  timeRemaining > 0;

export const shouldAnnounceRestFiveSeconds = (
  phase: TimerPhase,
  timeRemaining: number,
  isPaused: boolean,
  hasAnnouncedRestFiveSeconds: boolean
) => !isPaused && phase === TimerPhase.REST && timeRemaining === 5 && !hasAnnouncedRestFiveSeconds;
