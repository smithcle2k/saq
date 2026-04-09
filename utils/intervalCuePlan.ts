import { INTERVAL_SINGLE_CUES, normalizeIntervalEnabledCues } from './defaultCues.ts';

export interface IntervalCue {
  id: number;
  label: string;
  offsetMs: number;
  interrupt?: boolean;
  afterPreviousEndMs?: number;
  announcement?: string;
  speak?: boolean;
}

export interface IntervalCuePlan {
  announcement: string;
  currentExercise: string;
  cuePlan: IntervalCue[];
}

const pickRandomIntervalCue = (pool: readonly string[]) => {
  const i = Math.floor(Math.random() * pool.length);
  return pool[i] ?? 'Left';
};

const getRandomIntInclusive = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));

const getIntervalCueOffsetMs = (cue: (typeof INTERVAL_SINGLE_CUES)[number]) => {
  if (cue === 'Run') return 500;
  if (cue === 'Come Back') return getRandomIntInclusive(2300, 2500);
  return getRandomIntInclusive(1200, 2200);
};

/** One random cue per work round (chosen from enabled cues only). */
export const buildIntervalCuePlan = (enabledCues: string[]): IntervalCuePlan => {
  const pool = normalizeIntervalEnabledCues(enabledCues);
  const cue = pickRandomIntervalCue(pool) as (typeof INTERVAL_SINGLE_CUES)[number];
  return {
    announcement: 'Go',
    currentExercise: cue,
    cuePlan: [{ id: 1, label: cue, offsetMs: getIntervalCueOffsetMs(cue) }],
  };
};
