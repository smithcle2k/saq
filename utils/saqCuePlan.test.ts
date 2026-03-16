import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSaqCuePlan } from './saqCuePlan';

describe('buildSaqCuePlan', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates three cues at the start of each second in a SAQ work window', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const cuePlan = buildSaqCuePlan(['Left', 'Right', 'Back']);

    expect(cuePlan).toHaveLength(3);
    expect(cuePlan.map((cue) => cue.offsetMs)).toEqual([0, 1000, 2000]);
    expect(cuePlan[0].offsetMs).toBeLessThan(cuePlan[1].offsetMs);
    expect(cuePlan[1].offsetMs).toBeLessThan(cuePlan[2].offsetMs);
    expect(cuePlan[0].label).not.toBe(cuePlan[1].label);
    expect(cuePlan[1].label).not.toBe(cuePlan[2].label);
  });

  it('falls back to default cues when no custom exercise list exists', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const cuePlan = buildSaqCuePlan([]);

    expect(cuePlan).toHaveLength(3);
    expect(cuePlan[0].label).toBe('Left');
  });

  it('drops Straight from the stock default cue pool in SAQ mode', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const cuePlan = buildSaqCuePlan(['Straight', 'Left', 'Right', 'Come Back']);

    expect(cuePlan).toHaveLength(3);
    expect(cuePlan.every((cue) => cue.label !== 'Straight')).toBe(true);
  });
});
