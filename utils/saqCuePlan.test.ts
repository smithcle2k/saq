import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSaqCuePlan } from './saqCuePlan';

describe('buildSaqCuePlan', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates two cues inside a three-second SAQ work window', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const cuePlan = buildSaqCuePlan(['Left', 'Right', 'Back'], 3);

    expect(cuePlan).toHaveLength(2);
    expect(cuePlan[0].offsetMs).toBeGreaterThanOrEqual(650);
    expect(cuePlan[1].offsetMs).toBeLessThanOrEqual(2400);
    expect(cuePlan[0].offsetMs).toBeLessThan(cuePlan[1].offsetMs);
    expect(cuePlan[0].label).not.toBe(cuePlan[1].label);
  });

  it('keeps four-second SAQ work windows at two cues', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const cuePlan = buildSaqCuePlan(['Left', 'Right', 'Back'], 4);

    expect(cuePlan).toHaveLength(2);
    expect(cuePlan[0].offsetMs).toBeLessThan(cuePlan[1].offsetMs);
  });

  it('falls back to default cues when no custom exercise list exists', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const cuePlan = buildSaqCuePlan([], 3);

    expect(cuePlan).toHaveLength(2);
    expect(cuePlan[0].label).toBe('Straight');
  });
});
