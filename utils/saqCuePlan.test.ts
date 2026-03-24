import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSaqCuePlan } from './saqCuePlan';

describe('buildSaqCuePlan', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates five cues at the start of each second in a SAQ work window', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const cuePlan = buildSaqCuePlan(['Left', 'Right', 'Back']);

    expect(cuePlan).toHaveLength(5);
    expect(cuePlan.map((cue) => cue.offsetMs)).toEqual([0, 1000, 2000, 3000, 4000]);
    expect(cuePlan[0].offsetMs).toBeLessThan(cuePlan[1].offsetMs);
    expect(cuePlan[1].offsetMs).toBeLessThan(cuePlan[2].offsetMs);
    expect(cuePlan[2].offsetMs).toBeLessThan(cuePlan[3].offsetMs);
    expect(cuePlan[3].offsetMs).toBeLessThan(cuePlan[4].offsetMs);
    expect(cuePlan[0].label).not.toBe(cuePlan[1].label);
    expect(cuePlan[1].label).not.toBe(cuePlan[2].label);
    expect(cuePlan[2].label).not.toBe(cuePlan[3].label);
    expect(cuePlan[3].label).not.toBe(cuePlan[4].label);
  });

  it('falls back to SAQ default cues when no custom exercise list exists', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const cuePlan = buildSaqCuePlan([]);

    expect(cuePlan).toHaveLength(5);
    expect(cuePlan[0].label).toBe('Forward');
  });

  it('uses custom cues as-is when a non-empty list is provided', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const cuePlan = buildSaqCuePlan(['Hop', 'Skip', 'Jump']);

    expect(cuePlan).toHaveLength(5);
    expect(['Hop', 'Skip', 'Jump']).toContain(cuePlan[0].label);
  });
});
