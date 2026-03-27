export interface IntervalCue {
  id: number;
  label: string;
  offsetMs: number;
  interrupt?: boolean;
  afterPreviousEndMs?: number;
  announcement?: string;
  speak?: boolean;
}

interface IntervalCuePlan {
  announcement: string;
  currentExercise: string;
  cuePlan: IntervalCue[];
}

const BREAK_MIN_OFFSET_MS = 300;
const BREAK_MAX_OFFSET_MS = 2800;
const EXERCISE_AFTER_BREAK_DELAY_MS = 50;
const ANDROID_CHROME_SPEECH_COMBINE_WINDOW_MS = 150;

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

export const optimizeIntervalCuePlanForAndroidChrome = (cuePlan: IntervalCue[]): IntervalCue[] =>
  cuePlan.map((cue, index) => {
    const nextCue = cuePlan[index + 1];
    const shouldCombineSpeech =
      cue.label === 'Break' &&
      cue.interrupt === false &&
      nextCue?.interrupt === false &&
      nextCue.offsetMs - cue.offsetMs <= ANDROID_CHROME_SPEECH_COMBINE_WINDOW_MS;

    if (shouldCombineSpeech) {
      return {
        ...cue,
        announcement: `${cue.label}. ${nextCue.label}`,
        speak: true,
      };
    }

    if (
      index > 0 &&
      cuePlan[index - 1]?.label === 'Break' &&
      cue.interrupt === false &&
      cue.offsetMs - cuePlan[index - 1].offsetMs <= ANDROID_CHROME_SPEECH_COMBINE_WINDOW_MS
    ) {
      return {
        ...cue,
        speak: false,
      };
    }

    return cue;
  });
