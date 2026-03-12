import { DEFAULT_CUES } from './defaultCues';

interface SaqCue {
  id: number;
  label: string;
  offsetMs: number;
}

const getCuePool = (exercises: string[]) => (exercises.length > 0 ? exercises : DEFAULT_CUES);

const getDesiredCueCount = (workDurationMs: number) => {
  if (workDurationMs <= 4000) return 2;
  return Math.min(3, Math.max(1, Math.floor(workDurationMs / 1500)));
};

export const buildSaqCuePlan = (exercises: string[], workTime: number): SaqCue[] => {
  const cuePool = getCuePool(exercises);
  const workDurationMs = workTime * 1000;
  const desiredCueCount = getDesiredCueCount(workDurationMs);
  const minOffsetMs = Math.max(500, Math.round(workDurationMs * 0.22));
  const endBufferMs = Math.max(450, Math.round(workDurationMs * 0.2));
  const maxOffsetMs = Math.max(minOffsetMs, workDurationMs - endBufferMs);
  const minGapMs = Math.max(600, Math.round((maxOffsetMs - minOffsetMs) / desiredCueCount));
  const offsets: number[] = [];
  let attempts = 0;

  while (offsets.length < desiredCueCount && attempts < 200) {
    attempts += 1;
    const candidate = Math.round(
      minOffsetMs + Math.random() * Math.max(0, maxOffsetMs - minOffsetMs)
    );
    const isFarEnough = offsets.every((offset) => Math.abs(offset - candidate) >= minGapMs);

    if (isFarEnough) {
      offsets.push(candidate);
    }
  }

  if (offsets.length < desiredCueCount) {
    for (let index = offsets.length; index < desiredCueCount; index += 1) {
      const ratio = (index + 1) / (desiredCueCount + 1);
      offsets.push(
        Math.min(maxOffsetMs, Math.max(minOffsetMs, Math.round(workDurationMs * ratio)))
      );
    }
  }

  offsets.sort((left, right) => left - right);

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
