import { IntervalCue, IntervalCuePlan } from './intervalCuePlan';
import { TimerConfig, TimerPhase } from '../types';

export interface TimerSnapshot {
  phase: TimerPhase;
  timeRemaining: number;
  currentRound: number;
  currentExercise: string;
  cuePlan: IntervalCue[];
}

export interface TransitionResult extends TimerSnapshot {
  announcement: string;
  shouldFinish: boolean;
}

export const createInitialSnapshot = (config: TimerConfig): TimerSnapshot => ({
  phase: TimerPhase.PREP,
  timeRemaining: config.prepTime,
  currentRound: 1,
  currentExercise: '',
  cuePlan: [],
});

export const getNextSnapshot = (
  current: TimerSnapshot,
  config: TimerConfig,
  getIntervalPlan: () => IntervalCuePlan
): TransitionResult => {
  if (current.phase === TimerPhase.PREP) {
    const intervalPlan = getIntervalPlan();

    return {
      phase: TimerPhase.WORK,
      timeRemaining: config.workTime,
      currentRound: current.currentRound,
      currentExercise: intervalPlan.currentExercise,
      cuePlan: intervalPlan.cuePlan,
      announcement: intervalPlan.announcement,
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
      const intervalPlan = getIntervalPlan();

      return {
        phase: TimerPhase.WORK,
        timeRemaining: config.workTime,
        currentRound: current.currentRound + 1,
        currentExercise: intervalPlan.currentExercise,
        cuePlan: intervalPlan.cuePlan,
        announcement: intervalPlan.announcement,
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

export const decrementSnapshot = (snapshot: TimerSnapshot, seconds = 1): TimerSnapshot => ({
  ...snapshot,
  timeRemaining: Math.max(0, snapshot.timeRemaining - seconds),
});
