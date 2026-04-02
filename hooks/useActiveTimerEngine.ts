import { useCallback, useEffect, useRef, useState } from 'react';
import { type SpeakOptions } from '../utils/tts';
import { TimerConfig, TimerPhase } from '../types';
import {
  buildSaqPlanFromExercises,
  createInitialSnapshot,
  decrementSnapshot,
  getNextSnapshot,
  TimerSnapshot,
} from '../utils/timerEngine';
import { IntervalCue } from '../utils/intervalCuePlan';

interface UseActiveTimerEngineParams {
  config: TimerConfig;
  exercises: string[];
  onFinish: () => void;
  onAnnounce: (message: string, options?: SpeakOptions) => void;
}

export const useActiveTimerEngine = ({
  config,
  exercises,
  onFinish,
  onAnnounce,
}: UseActiveTimerEngineParams) => {
  const [timerSnapshot, setTimerSnapshot] = useState<TimerSnapshot>(() =>
    createInitialSnapshot(config)
  );
  const [isPaused, setIsPaused] = useState(false);
  const timerSnapshotRef = useRef(timerSnapshot);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cueTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const cueScheduleStartedAtRef = useRef<number | null>(null);
  const elapsedCueScheduleMsRef = useRef(0);
  const { phase, timeRemaining, currentRound } = timerSnapshot;

  useEffect(() => {
    timerSnapshotRef.current = timerSnapshot;
  }, [timerSnapshot]);

  const getRandomExercise = useCallback(() => {
    if (exercises.length === 0) return 'Move';
    const randomIndex = Math.floor(Math.random() * exercises.length);
    return exercises[randomIndex];
  }, [exercises]);

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

            if (cue.speak ?? true) {
              onAnnounce(cue.announcement ?? cue.label, {
                interrupt: cue.interrupt ?? true,
                afterPreviousEndMs: cue.afterPreviousEndMs,
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

  const scheduleFinish = useCallback(() => {
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
    }
    finishTimeoutRef.current = setTimeout(onFinish, 3000);
  }, [onFinish]);

  const triggerPhaseTransition = useCallback(() => {
    if (timerSnapshot.phase === TimerPhase.WORK) {
      resetCueSchedule();
    }

    const next = getNextSnapshot(timerSnapshot, config, getRandomExercise, () =>
      buildSaqPlanFromExercises(exercises)
    );
    setTimerSnapshot({
      phase: next.phase,
      timeRemaining: next.timeRemaining,
      currentRound: next.currentRound,
      currentExercise: next.currentExercise,
      cuePlan: next.cuePlan,
    });

    if (next.announcement) {
      onAnnounce(next.announcement);
    }

    if (next.phase === TimerPhase.WORK && next.cuePlan.length > 0) {
      startCuePlan(next.cuePlan);
    }

    if (next.shouldFinish) {
      scheduleFinish();
    }
  }, [
    timerSnapshot,
    config,
    getRandomExercise,
    onAnnounce,
    scheduleFinish,
    resetCueSchedule,
    startCuePlan,
    exercises,
  ]);

  const tick = useCallback(() => {
    if (isPaused) return;
    setTimerSnapshot((prev) => decrementSnapshot(prev));
  }, [isPaused]);

  useEffect(() => {
    const timerId = setInterval(tick, 1000);
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
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
    };
  }, [resetCueSchedule]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const nextPaused = !prev;

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
    cuePlan: timerSnapshot.cuePlan,
    isPaused,
    togglePause,
  };
};
