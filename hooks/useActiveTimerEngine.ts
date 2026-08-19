import { useCallback, useEffect, useRef, useState } from 'react';
import { type SpeakOptions } from '../utils/tts';
import { TimerConfig, TimerPhase } from '../types';
import {
  createInitialSnapshot,
  decrementSnapshot,
  getNextSnapshot,
  TimerSnapshot,
} from '../utils/timerEngine';
import { buildIntervalCuePlan, IntervalCue } from '../utils/intervalCuePlan';

interface UseActiveTimerEngineParams {
  config: TimerConfig;
  exercises: string[];
  onAnnounce: (message: string, options?: SpeakOptions) => void;
}

/**
 * Ticks 4x per second and derives elapsed whole seconds from wall-clock time,
 * so the countdown stays accurate even when the browser throttles timers in a
 * backgrounded tab and catches up as soon as the tab wakes.
 */
const TICK_INTERVAL_MS = 250;

export const useActiveTimerEngine = ({
  config,
  exercises,
  onAnnounce,
}: UseActiveTimerEngineParams) => {
  const [timerSnapshot, setTimerSnapshot] = useState<TimerSnapshot>(() =>
    createInitialSnapshot(config)
  );
  const [isPaused, setIsPaused] = useState(false);
  const [currentCue, setCurrentCue] = useState('');
  const timerSnapshotRef = useRef(timerSnapshot);
  const lastTickTimeRef = useRef(0);
  const cueTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const cueScheduleStartedAtRef = useRef<number | null>(null);
  const elapsedCueScheduleMsRef = useRef(0);
  const { phase, timeRemaining, currentRound } = timerSnapshot;

  useEffect(() => {
    timerSnapshotRef.current = timerSnapshot;
  }, [timerSnapshot]);

  const getIntervalPlan = useCallback(() => buildIntervalCuePlan(exercises), [exercises]);

  const clearCueTimeouts = useCallback(() => {
    cueTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    cueTimeoutsRef.current = [];
  }, []);

  const resetCueSchedule = useCallback(() => {
    clearCueTimeouts();
    cueScheduleStartedAtRef.current = null;
    elapsedCueScheduleMsRef.current = 0;
  }, [clearCueTimeouts]);

  const scheduleCuePlan = useCallback(
    (cuePlan: IntervalCue[], elapsedMs = 0) => {
      clearCueTimeouts();

      cueTimeoutsRef.current = cuePlan
        .filter((cue) => cue.offsetMs > elapsedMs)
        .map((cue) =>
          setTimeout(() => {
            if (timerSnapshotRef.current.phase !== TimerPhase.WORK) {
              return;
            }

            setCurrentCue(cue.label);
            if (cue.speak ?? true) {
              onAnnounce(cue.announcement ?? cue.label, {
                interrupt: cue.interrupt ?? true,
                afterPreviousEndMs: cue.afterPreviousEndMs,
                rate: cue.rate,
              });
            }
          }, cue.offsetMs - elapsedMs)
        );
    },
    [clearCueTimeouts, onAnnounce, timerSnapshotRef]
  );

  const startCuePlan = useCallback(
    (cuePlan: IntervalCue[]) => {
      elapsedCueScheduleMsRef.current = 0;
      cueScheduleStartedAtRef.current = Date.now();
      scheduleCuePlan(cuePlan);
    },
    [scheduleCuePlan]
  );

  const triggerPhaseTransition = useCallback(() => {
    if (timerSnapshot.phase === TimerPhase.WORK) {
      resetCueSchedule();
    }

    const next = getNextSnapshot(timerSnapshot, config, getIntervalPlan);
    setTimerSnapshot({
      phase: next.phase,
      timeRemaining: next.timeRemaining,
      currentRound: next.currentRound,
      currentExercise: next.currentExercise,
      cuePlan: next.cuePlan,
    });
    setCurrentCue(next.phase === TimerPhase.WORK ? next.currentExercise : '');

    if (next.announcement) {
      onAnnounce(next.announcement);
    }

    if (next.phase === TimerPhase.WORK && next.cuePlan.length > 0) {
      startCuePlan(next.cuePlan);
    }
  }, [timerSnapshot, config, onAnnounce, resetCueSchedule, startCuePlan, getIntervalPlan]);

  const tick = useCallback(() => {
    const now = Date.now();
    if (lastTickTimeRef.current === 0) {
      lastTickTimeRef.current = now;
    }

    if (isPaused) {
      lastTickTimeRef.current = now;
      return;
    }

    const elapsedMs = now - lastTickTimeRef.current;
    if (elapsedMs < 1000) return;

    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    lastTickTimeRef.current += elapsedSeconds * 1000;
    setTimerSnapshot((prev) => decrementSnapshot(prev, elapsedSeconds));
  }, [isPaused]);

  useEffect(() => {
    const timerId = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(timerId);
  }, [tick]);

  useEffect(() => {
    if (isPaused) return;
    if (phase === TimerPhase.FINISHED) return;
    if (timeRemaining === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      triggerPhaseTransition();
    }
  }, [timeRemaining, isPaused, phase, triggerPhaseTransition]);

  useEffect(() => {
    return () => {
      resetCueSchedule();
    };
  }, [resetCueSchedule]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const nextPaused = !prev;

      if (!nextPaused) {
        lastTickTimeRef.current = Date.now();
      }

      if (phase === TimerPhase.WORK && timerSnapshot.cuePlan.length > 0) {
        if (nextPaused) {
          if (cueScheduleStartedAtRef.current !== null) {
            elapsedCueScheduleMsRef.current += Date.now() - cueScheduleStartedAtRef.current;
          }
          cueScheduleStartedAtRef.current = null;
          clearCueTimeouts();
        } else {
          cueScheduleStartedAtRef.current = Date.now();
          scheduleCuePlan(timerSnapshot.cuePlan, elapsedCueScheduleMsRef.current);
        }
      }

      return nextPaused;
    });
  }, [phase, clearCueTimeouts, scheduleCuePlan, timerSnapshot.cuePlan]);

  return {
    phase,
    timeRemaining,
    currentRound,
    currentCue,
    cuePlan: timerSnapshot.cuePlan,
    isPaused,
    togglePause,
  };
};
