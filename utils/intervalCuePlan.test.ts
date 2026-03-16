import { describe, expect, it } from 'vitest';
import { buildIntervalCuePlan } from './intervalCuePlan';

describe('buildIntervalCuePlan', () => {
  it('returns an immediate route announcement when slow mode is off', () => {
    expect(buildIntervalCuePlan('Shuffle Left', false)).toEqual({
      announcement: 'Go. Shuffle Left',
      currentExercise: 'Shuffle Left',
      cuePlan: [],
    });
  });

  it('delays the route announcement when slow mode is on', () => {
    expect(buildIntervalCuePlan('Shuffle Left', true)).toEqual({
      announcement: 'Go',
      currentExercise: 'Go',
      cuePlan: [
        { id: 1, label: 'Slow Down', offsetMs: 1000 },
        { id: 2, label: 'Shuffle Left', offsetMs: 2000 },
      ],
    });
  });
});
