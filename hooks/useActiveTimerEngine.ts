import { useCallback, useEffect, useRef, useState } from 'react';
import { TimerConfig, TimerPhase } from '../types';
import { buildSaqCuePlan } from '../utils/saqCuePlan';

interface SaqCue {
  id: number;
  label: string;
  offsetMs: number;
}

export interface TimerSnapshot {
  phase: TimerPhase;
  timeRemaining: number;
  currentRound: number;
  currentExercise: string;
  cuePlan: SaqCue[];
}

interface TransitionResult extends TimerSnapshot {
  announcement: string;
  shouldFinish: boolean;
}

interface UseActiveTimerEngineParams {
  config: TimerConfig;
  exercises: string[];
  onFinish: () => void;
  onAnnounce: (message: string) => void;
}

const createInitialSnapshot = (config: TimerConfig): TimerSnapshot => ({
  phase: TimerPhase.PREP,
  timeRemaining: config.prepTime,
  currentRound: 1,
  currentExercise: '',
  cuePlan: [],
});

const getNextSnapshot = (
  current: TimerSnapshot,
  config: TimerConfig,
  getRandomExercise: () => string,
  getSaqCuePlan: () => SaqCue[]
): TransitionResult => {
  if (current.phase === TimerPhase.PREP) {
    if (config.mode === 'SAQ') {
      return {
        phase: TimerPhase.WORK,
        timeRemaining: config.workTime,
        currentRound: current.currentRound,
        currentExercise: 'Stand by',
        cuePlan: getSaqCuePlan(),
        announcement: 'Go',
        shouldFinish: false,
      };
    }

    const exercise = getRandomExercise();
    return {
      phase: TimerPhase.WORK,
      timeRemaining: config.workTime,
      currentRound: current.currentRound,
      currentExercise: exercise,
      cuePlan: [],
      announcement: `Go. ${exercise}`,
      shouldFinish: false,
    };
  }

  if (current.phase === TimerPhase.WORK) {
    return {
      phase: TimerPhase.REST,
      timeRemaining: config.restTime,
      currentRound: current.currentRound,
      currentExercise: '',
      cuePlan: [],
      announcement: 'Rest',
      shouldFinish: false,
    };
  }

  if (current.phase === TimerPhase.REST) {
    if (current.currentRound < config.rounds) {
      if (config.mode === 'SAQ') {
        return {
          phase: TimerPhase.WORK,
          timeRemaining: config.workTime,
          currentRound: current.currentRound + 1,
          currentExercise: 'Stand by',
          cuePlan: getSaqCuePlan(),
          announcement: 'Go',
          shouldFinish: false,
        };
      }

      const exercise = getRandomExercise();
      return {
        phase: TimerPhase.WORK,
        timeRemaining: config.workTime,
        currentRound: current.currentRound + 1,
        currentExercise: exercise,
        cuePlan: [],
        announcement: `Go. ${exercise}`,
        shouldFinish: false,
      };
    }

    if (config.coolDownTime > 0) {
      return {
        phase: TimerPhase.COOL_DOWN,
        timeRemaining: config.coolDownTime,
        currentRound: current.currentRound,
        currentExercise: '',
        cuePlan: [],
        announcement: 'Cool down',
        shouldFinish: false,
      };
    }

    return {
      phase: TimerPhase.FINISHED,
      timeRemaining: 0,
      currentRound: current.currentRound,
      currentExercise: '',
      cuePlan: [],
      announcement: 'Workout complete',
      shouldFinish: true,
    };
  }

  if (current.phase === TimerPhase.COOL_DOWN) {
    return {
      phase: TimerPhase.FINISHED,
      timeRemaining: 0,
      currentRound: current.currentRound,
      currentExercise: '',
      cuePlan: [],
      announcement: 'Workout complete',
      shouldFinish: true,
    };
  }

  return {
    ...current,
    announcement: '',
    shouldFinish: false,
  };
};

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
  const finishTimeoutRef = useRef<number | null>(null);
  const cueTimeoutsRef = useRef<number[]>([]);
  const workCueStartedAtRef = useRef<number | null>(null);
  const elapsedWorkCueMsRef = useRef(0);
  const { phase, timeRemaining, currentRound, currentExercise } = timerSnapshot;

  const getRandomExercise = useCallback(() => {
    if (exercises.length === 0) return 'Move';
    const randomIndex = Math.floor(Math.random() * exercises.length);
    return exercises[randomIndex];
  }, [exercises]);

  const clearCueTimeouts = useCallback(() => {
    cueTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    cueTimeoutsRef.current = [];
  }, []);

  const resetCueSchedule = useCallback(() => {
    clearCueTimeouts();
    workCueStartedAtRef.current = null;
    elapsedWorkCueMsRef.current = 0;
  }, [clearCueTimeouts]);

  const scheduleCuePlan = useCallback(
    (cuePlan: SaqCue[], elapsedMs = 0) => {
      clearCueTimeouts();

      cueTimeoutsRef.current = cuePlan
        .filter((cue) => cue.offsetMs > elapsedMs)
        .map((cue) =>
          window.setTimeout(() => {
            setTimerSnapshot((prev) => {
              if (prev.phase !== TimerPhase.WORK) {
                return prev;
              }

              return {
                ...prev,
                currentExercise: cue.label,
              };
            });
            onAnnounce(cue.label);
          }, cue.offsetMs - elapsedMs)
        );
    },
    [clearCueTimeouts, onAnnounce]
  );

  const startCuePlan = useCallback(
    (cuePlan: SaqCue[]) => {
      elapsedWorkCueMsRef.current = 0;
      workCueStartedAtRef.current = performance.now();
      scheduleCuePlan(cuePlan);
    },
    [scheduleCuePlan]
  );

  const scheduleFinish = useCallback(() => {
    if (finishTimeoutRef.current) {
      window.clearTimeout(finishTimeoutRef.current);
    }
    finishTimeoutRef.current = window.setTimeout(onFinish, 3000);
  }, [onFinish]);

  const triggerPhaseTransition = useCallback(() => {
    if (config.mode === 'SAQ' && timerSnapshot.phase === TimerPhase.WORK) {
      resetCueSchedule();
    }

    const next = getNextSnapshot(timerSnapshot, config, getRandomExercise, () =>
      buildSaqCuePlan(exercises, config.workTime)
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

    if (config.mode === 'SAQ' && next.phase === TimerPhase.WORK) {
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
    setTimerSnapshot((prev) => ({
      ...prev,
      timeRemaining: prev.timeRemaining > 0 ? prev.timeRemaining - 1 : 0,
    }));
  }, [isPaused]);

  useEffect(() => {
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
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
        window.clearTimeout(finishTimeoutRef.current);
      }
    };
  }, [resetCueSchedule]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const nextPaused = !prev;

      if (config.mode === 'SAQ' && phase === TimerPhase.WORK) {
        if (nextPaused) {
          if (workCueStartedAtRef.current !== null) {
            elapsedWorkCueMsRef.current += performance.now() - workCueStartedAtRef.current;
          }
          workCueStartedAtRef.current = null;
          clearCueTimeouts();
        } else {
          workCueStartedAtRef.current = performance.now();
          scheduleCuePlan(timerSnapshot.cuePlan, elapsedWorkCueMsRef.current);
        }
      }

      return nextPaused;
    });
  }, [config.mode, phase, clearCueTimeouts, scheduleCuePlan, timerSnapshot.cuePlan]);

  return {
    phase,
    timeRemaining,
    currentRound,
    currentExercise,
    cuePlan: timerSnapshot.cuePlan,
    isPaused,
    togglePause,
  };
};
