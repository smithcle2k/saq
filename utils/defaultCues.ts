/** Built-in interval work cues (one chosen at random each round). */
export const INTERVAL_SINGLE_CUES = ['Left', 'Right', 'Run', 'Come Back'] as const;

export const DEFAULT_CUES = [...INTERVAL_SINGLE_CUES];

/** Keeps canonical order; empty or invalid lists fall back to all built-in cues. */
export const normalizeIntervalEnabledCues = (cues: string[] | undefined): string[] => {
  const ordered = INTERVAL_SINGLE_CUES.filter((c) => cues?.includes(c));
  return ordered.length > 0 ? ordered : [...INTERVAL_SINGLE_CUES];
};
export const PREVIOUS_DEFAULT_CUES = ['Straight', 'Left', 'Right', 'Come Back'];
export const PREVIOUS_SAQ_DEFAULT_CUES = DEFAULT_CUES;

export const SAQ_DEFAULT_CUES = [
  'Forward',
  'Back',
  'Shuffle Left',
  'Shuffle Right',
  'Jump Left',
  'Jump Right',
  'Jump Forward',
  'Jump Back',
  'Spin Right',
  'Spin Left',
];

export const LEGACY_DEFAULT_CUES = ['Straight', 'Left', 'Right', 'Back', 'Turn around'];

export const matchesCueList = (left: string[], right: string[]) =>
  left.length === right.length && left.every((cue, index) => cue === right[index]);
