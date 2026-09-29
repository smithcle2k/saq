import { normalizeIntervalEnabledCues } from './defaultCues.ts';
import { validateCueSettingsForWorkTime } from './cueSettings.ts';
import type { CueSettingsInput, IntervalCueLabel } from './cueSettings.ts';
import type { CueEventRole } from '../types.ts';

export interface IntervalCue {
  id: number;
  /** Stable session event id when the cue comes from a recorded session plan. */
  eventId?: string;
  label: string;
  offsetMs: number;
  role?: CueEventRole;
  interrupt?: boolean;
  afterPreviousEndMs?: number;
  announcement?: string;
  speak?: boolean;
  /** TTS speech rate for this cue (default 1.0) */
  rate?: number;
}

export interface IntervalCuePlan {
  announcement: string;
  currentExercise: string;
  cuePlan: IntervalCue[];
  workDurationSeconds?: number;
}

export interface BuildIntervalCuePlanOptions {
  settings?: CueSettingsInput;
  recentCues?: readonly string[];
  workTimeSeconds?: number;
  random?: () => number;
}

const randomUnit = (random: () => number) => Math.min(0.999999999, Math.max(0, random()));

export const getEligibleCues = (pool: IntervalCueLabel[], recentCues: readonly string[]) => {
  const lastTwo = recentCues.slice(-2);
  if (pool.length > 1 && lastTwo.length === 2 && lastTwo[0] === lastTwo[1]) {
    return pool.filter((cue) => cue !== lastTwo[0]);
  }
  return pool;
};

export const pickWeightedCue = (
  pool: IntervalCueLabel[],
  weights: Record<IntervalCueLabel, number>,
  random: () => number
) => {
  const totalWeight = pool.reduce((total, cue) => total + weights[cue], 0);
  let position = randomUnit(random) * totalWeight;

  for (const cue of pool) {
    position -= weights[cue];
    if (position < 0) return cue;
  }

  return pool[pool.length - 1] ?? 'Left';
};

export const getRandomIntInclusive = (min: number, max: number, random: () => number) =>
  min + Math.floor(randomUnit(random) * (max - min + 1));

const getIntervalCueOffsetMs = (minMs: number, maxMs: number, random: () => number) =>
  getRandomIntInclusive(minMs, maxMs, random);

/** One random cue per work round (chosen from enabled cues only). */
export const buildIntervalCuePlan = (
  enabledCues: string[],
  options: BuildIntervalCuePlanOptions = {}
): IntervalCuePlan => {
  const validation = validateCueSettingsForWorkTime(options.settings, options.workTimeSeconds ?? 5);
  if (!validation.isValid) {
    throw new Error('Work time is too short for a cue delay.');
  }

  const random = options.random ?? Math.random;
  const pool = normalizeIntervalEnabledCues(enabledCues) as IntervalCueLabel[];
  const cue = pickWeightedCue(
    getEligibleCues(pool, options.recentCues ?? []),
    validation.settings.cueWeights,
    random
  );
  return {
    announcement: 'Go',
    currentExercise: cue,
    cuePlan: [
      {
        id: 1,
        label: cue,
        offsetMs: getIntervalCueOffsetMs(
          validation.effectiveDelayRange.minMs,
          validation.effectiveDelayRange.maxMs,
          random
        ),
      },
    ],
  };
};
