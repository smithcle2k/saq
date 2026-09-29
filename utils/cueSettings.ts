import { INTERVAL_SINGLE_CUES } from './defaultCues.ts';

export type IntervalCueLabel = (typeof INTERVAL_SINGLE_CUES)[number];

export interface CueDelayRange {
  minMs: number;
  maxMs: number;
}

export type CueWeights = Record<IntervalCueLabel, number>;

export interface CueSettings {
  delayMinMs: number;
  delayMaxMs: number;
  cueWeights: CueWeights;
}

export type CueSettingsInput = Partial<{
  delayMinMs: unknown;
  delayMaxMs: unknown;
  cueWeights: Partial<Record<IntervalCueLabel, unknown>>;
}>;

export const MIN_CUE_DELAY_MS = 100;
export const MAX_CUE_DELAY_MS = 2500;
export const MIN_CUE_WEIGHT = 1;
export const MAX_CUE_WEIGHT = 10;
export const WORK_END_MARGIN_MS = 500;

export const DEFAULT_CUE_SETTINGS: CueSettings = {
  delayMinMs: 500,
  delayMaxMs: 2500,
  cueWeights: {
    Left: 1,
    Right: 1,
    Run: 1,
    'Come Back': 1,
  },
};

export const CUE_DELAY_PRESETS = {
  Early: { minMs: 300, maxMs: 900 },
  Mixed: { minMs: 500, maxMs: 2500 },
  Late: { minMs: 1500, maxMs: 2500 },
} as const;

export type CueSettingsValidation =
  | {
      isValid: true;
      settings: CueSettings;
      effectiveDelayRange: CueDelayRange;
      maxAllowedDelayMs: number;
    }
  | {
      isValid: false;
      settings: CueSettings;
      maxAllowedDelayMs: number;
      error: 'WORK_TIME_TOO_SHORT';
    };

const normalizeNumber = (value: unknown, fallback: number, min: number, max: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
};

export const normalizeCueSettings = (input: CueSettingsInput | undefined): CueSettings => {
  const delayMinMs = normalizeNumber(
    input?.delayMinMs,
    DEFAULT_CUE_SETTINGS.delayMinMs,
    MIN_CUE_DELAY_MS,
    MAX_CUE_DELAY_MS
  );
  const delayMaxMs = normalizeNumber(
    input?.delayMaxMs,
    DEFAULT_CUE_SETTINGS.delayMaxMs,
    MIN_CUE_DELAY_MS,
    MAX_CUE_DELAY_MS
  );

  const cueWeights = INTERVAL_SINGLE_CUES.reduce<CueWeights>((weights, cue) => {
    weights[cue] = normalizeNumber(
      input?.cueWeights?.[cue],
      DEFAULT_CUE_SETTINGS.cueWeights[cue],
      MIN_CUE_WEIGHT,
      MAX_CUE_WEIGHT
    );
    return weights;
  }, {} as CueWeights);

  return {
    delayMinMs: Math.min(delayMinMs, delayMaxMs),
    delayMaxMs: Math.max(delayMinMs, delayMaxMs),
    cueWeights,
  };
};

export const validateCueSettingsForWorkTime = (
  input: CueSettingsInput | undefined,
  workTimeSeconds: number
): CueSettingsValidation => {
  const settings = normalizeCueSettings(input);
  const maxAllowedDelayMs = Math.max(
    0,
    Math.min(MAX_CUE_DELAY_MS, Math.floor(workTimeSeconds * 1000 - WORK_END_MARGIN_MS))
  );

  if (maxAllowedDelayMs < MIN_CUE_DELAY_MS) {
    return {
      isValid: false,
      settings,
      maxAllowedDelayMs,
      error: 'WORK_TIME_TOO_SHORT',
    };
  }

  return {
    isValid: true,
    settings,
    effectiveDelayRange: {
      minMs: Math.min(settings.delayMinMs, maxAllowedDelayMs),
      maxMs: Math.min(settings.delayMaxMs, maxAllowedDelayMs),
    },
    maxAllowedDelayMs,
  };
};
