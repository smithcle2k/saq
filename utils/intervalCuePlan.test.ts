import { describe, expect, it, vi } from 'vitest';
import { buildIntervalCuePlan } from './intervalCuePlan';

describe('buildIntervalCuePlan', () => {
  it('returns an immediate route announcement when slow mode is off', () => {
    expect(buildIntervalCuePlan('Shuffle Left', false)).toEqual({
      announcement: 'Go. Shuffle Left',
      currentExercise: 'Shuffle Left',
      cuePlan: [],
    });
  });

  it('queues break and the route announcement when add break is on', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(buildIntervalCuePlan('Shuffle Left', true)).toEqual({
      announcement: 'Go',
      currentExercise: 'Go',
      cuePlan: [
        { id: 1, label: 'Break', offsetMs: 1550, interrupt: false },
        {
          id: 2,
          label: 'Shuffle Left',
          offsetMs: 1600,
          interrupt: false,
          afterPreviousEndMs: 50,
        },
      ],
    });

    vi.restoreAllMocks();
  });

  it('randomizes the break cue from 0.3s to 2.8s after go', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(buildIntervalCuePlan('Shuffle Left', true).cuePlan[0]?.offsetMs).toBe(300);

    vi.spyOn(Math, 'random').mockReturnValue(1);
    expect(buildIntervalCuePlan('Shuffle Left', true).cuePlan[0]?.offsetMs).toBe(2800);

    vi.restoreAllMocks();
  });
});
