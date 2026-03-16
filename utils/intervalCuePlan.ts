export interface IntervalCue {
  id: number;
  label: string;
  offsetMs: number;
}

interface IntervalCuePlan {
  announcement: string;
  currentExercise: string;
  cuePlan: IntervalCue[];
}

export const buildIntervalCuePlan = (exercise: string, slowMode: boolean): IntervalCuePlan => {
  if (!slowMode) {
    return {
      announcement: `Go. ${exercise}`,
      currentExercise: exercise,
      cuePlan: [],
    };
  }

  return {
    announcement: 'Go',
    currentExercise: 'Go',
    cuePlan: [
      { id: 1, label: 'Slow Down', offsetMs: 1000 },
      { id: 2, label: exercise, offsetMs: 2000 },
    ],
  };
};
