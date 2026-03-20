export interface IntervalCue {
  id: number;
  label: string;
  offsetMs: number;
  interrupt?: boolean;
  afterPreviousEndMs?: number;
}

interface IntervalCuePlan {
  announcement: string;
  currentExercise: string;
  cuePlan: IntervalCue[];
}

const BREAK_MIN_OFFSET_MS = 300;
const BREAK_MAX_OFFSET_MS = 2800;
const EXERCISE_AFTER_BREAK_DELAY_MS = 50;

const getRandomBreakOffsetMs = () =>
  BREAK_MIN_OFFSET_MS + Math.round(Math.random() * (BREAK_MAX_OFFSET_MS - BREAK_MIN_OFFSET_MS));

export const buildIntervalCuePlan = (exercise: string, slowMode: boolean): IntervalCuePlan => {
  if (!slowMode) {
    return {
      announcement: `Go. ${exercise}`,
      currentExercise: exercise,
      cuePlan: [],
    };
  }

  const breakOffsetMs = getRandomBreakOffsetMs();

  return {
    announcement: 'Go',
    currentExercise: 'Go',
    cuePlan: [
      { id: 1, label: 'Break', offsetMs: breakOffsetMs, interrupt: false },
      {
        id: 2,
        label: exercise,
        offsetMs: breakOffsetMs + EXERCISE_AFTER_BREAK_DELAY_MS,
        interrupt: false,
        afterPreviousEndMs: EXERCISE_AFTER_BREAK_DELAY_MS,
      },
    ],
  };
};
