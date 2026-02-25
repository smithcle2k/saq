import { useCallback, useEffect, useRef, useState } from 'react';
import { TimerConfig, TimerPhase } from '../types';

export interface TimerSnapshot {
  phase: TimerPhase;
  timeRemaining: number;
  currentRound: number;
  currentExercise: string;
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
});

const getNextSnapshot = (
  current: TimerSnapshot,
  config: TimerConfig,
  getRandomExercise: () => string
): TransitionResult => {
  if (current.phase === TimerPhase.PREP) {
    const exercise = getRandomExercise();
    return {
      phase: TimerPhase.WORK,
      timeRemaining: config.workTime,
      currentRound: current.currentRound,
      currentExercise: exercise,
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
      announcement: 'Rest',
      shouldFinish: false,
    };
  }

  if (current.phase === TimerPhase.REST) {
    if (current.currentRound < config.rounds) {
      const exercise = getRandomExercise();
      return {
        phase: TimerPhase.WORK,
        timeRemaining: config.workTime,
        currentRound: current.currentRound + 1,
        currentExercise: exercise,
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
        announcement: 'Cool down',
        shouldFinish: false,
      };
    }

    return {
      phase: TimerPhase.FINISHED,
      timeRemaining: 0,
      currentRound: current.currentRound,
      currentExercise: '',
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
  const [timerSnapshot, setTimerSnapshot] = useState<TimerSnapshot>(() => createInitialSnapshot(config));
  const [isPaused, setIsPaused] = useState(false);
  const finishTimeoutRef = useRef<number | null>(null);
  const { phase, timeRemaining, currentRound, currentExercise } = timerSnapshot;

  const getRandomExercise = useCallback(() => {
    if (exercises.length === 0) return 'Move';
    const randomIndex = Math.floor(Math.random() * exercises.length);
    return exercises[randomIndex];
  }, [exercises]);

  const scheduleFinish = useCallback(() => {
    if (finishTimeoutRef.current) {
      window.clearTimeout(finishTimeoutRef.current);
    }
    finishTimeoutRef.current = window.setTimeout(onFinish, 3000);
  }, [onFinish]);

  const triggerPhaseTransition = useCallback(() => {
    const next = getNextSnapshot(timerSnapshot, config, getRandomExercise);
    setTimerSnapshot({
      phase: next.phase,
      timeRemaining: next.timeRemaining,
      currentRound: next.currentRound,
      currentExercise: next.currentExercise,
    });

    if (next.announcement) {
      onAnnounce(next.announcement);
    }

    if (next.shouldFinish) {
      scheduleFinish();
    }
  }, [timerSnapshot, config, getRandomExercise, onAnnounce, scheduleFinish]);

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
      triggerPhaseTransition();
    }
  }, [timeRemaining, isPaused, phase, triggerPhaseTransition]);

  useEffect(() => {
    return () => {
      if (finishTimeoutRef.current) {
        window.clearTimeout(finishTimeoutRef.current);
      }
    };
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  return {
    phase,
    timeRemaining,
    currentRound,
    currentExercise,
    isPaused,
    togglePause,
  };
};
