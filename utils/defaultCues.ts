export const DEFAULT_CUES = ['Straight', 'Left', 'Right', 'Come Back'];

export const LEGACY_DEFAULT_CUES = ['Straight', 'Left', 'Right', 'Back', 'Turn around'];

export const matchesCueList = (left: string[], right: string[]) =>
  left.length === right.length && left.every((cue, index) => cue === right[index]);
