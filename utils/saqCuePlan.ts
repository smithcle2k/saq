import { SAQ_DEFAULT_CUES } from './defaultCues';

/** Faster than default so multi-word SAQ cues finish within the 1s cadence. */
export const SAQ_CUE_RATE = 1.75;

interface SaqCue {
  id: number;
  label: string;
  offsetMs: number;
  rate: number;
}

const getCuePool = (exercises: string[]) => (exercises.length === 0 ? SAQ_DEFAULT_CUES : exercises);

export const buildSaqCuePlan = (exercises: string[]): SaqCue[] => {
  const cuePool = getCuePool(exercises);
  const offsets = [0, 1000, 2000, 3000, 4000];

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
      rate: SAQ_CUE_RATE,
    };
  });
};
