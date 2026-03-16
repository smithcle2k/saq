export const DEFAULT_CUES = ['Left', 'Right', 'Come Back'];
export const PREVIOUS_DEFAULT_CUES = ['Straight', 'Left', 'Right', 'Come Back'];
export const SAQ_DEFAULT_CUES = DEFAULT_CUES;

export const LEGACY_DEFAULT_CUES = ['Straight', 'Left', 'Right', 'Back', 'Turn around'];

export const matchesCueList = (left: string[], right: string[]) =>
  left.length === right.length && left.every((cue, index) => cue === right[index]);
