import { INTERVAL_SINGLE_CUES } from './defaultCues.ts';

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

const pickRandomIntervalCue = () => {
  const i = Math.floor(Math.random() * INTERVAL_SINGLE_CUES.length);
  return INTERVAL_SINGLE_CUES[i] ?? 'Left';
};

const getRandomIntInclusive = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));

const getIntervalCueOffsetMs = (cue: (typeof INTERVAL_SINGLE_CUES)[number]) => {
  if (cue === 'Run') return 500;
  if (cue === 'Come Back') return getRandomIntInclusive(2300, 2500);
  return getRandomIntInclusive(1200, 2200);
};

/** One random cue per work round. */
export const buildIntervalCuePlan = (): IntervalCuePlan => {
  const cue = pickRandomIntervalCue();
  return {
    announcement: 'Go',
    currentExercise: cue,
    cuePlan: [{ id: 1, label: cue, offsetMs: getIntervalCueOffsetMs(cue) }],
  };
};
