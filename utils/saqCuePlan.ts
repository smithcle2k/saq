import { DEFAULT_CUES, SAQ_DEFAULT_CUES, matchesCueList } from './defaultCues';

interface SaqCue {
  id: number;
  label: string;
  offsetMs: number;
}

const getCuePool = (exercises: string[]) => {
  if (exercises.length === 0 || matchesCueList(exercises, DEFAULT_CUES)) {
    return SAQ_DEFAULT_CUES;
  }

  return exercises;
};

export const buildSaqCuePlan = (exercises: string[]): SaqCue[] => {
  const cuePool = getCuePool(exercises);
  const offsets = [0, 1000, 2000];

  let previousCue = '';
  return offsets.map((offsetMs, index) => {
    const availableCues = cuePool.filter((cue) => cue !== previousCue);
    const selectionPool = availableCues.length > 0 ? availableCues : cuePool;
    const label = selectionPool[Math.floor(Math.random() * selectionPool.length)];
    previousCue = label;

    return {
      id: index + 1,
      label,
      offsetMs,
    };
  });
};
