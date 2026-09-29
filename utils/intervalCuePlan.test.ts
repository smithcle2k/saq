import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIntervalCuePlan } from './intervalCuePlan.ts';
import { INTERVAL_SINGLE_CUES } from './defaultCues.ts';

const FULL_INTERVAL_POOL = [...INTERVAL_SINGLE_CUES];

const randomFrom = (values: number[]) => {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1] ?? 0;
};

test('every cue uses the same delay range at the same delay quantile', () => {
  INTERVAL_SINGLE_CUES.forEach((cue, index) => {
    const plan = buildIntervalCuePlan(FULL_INTERVAL_POOL, {
      random: randomFrom([(index + 0.1) / INTERVAL_SINGLE_CUES.length, 0.5]),
    });

    assert.equal(plan.announcement, 'Go');
    assert.equal(plan.currentExercise, cue);
    assert.deepEqual(plan.cuePlan, [{ id: 1, label: cue, offsetMs: 1500 }]);
  });
});

test('uses inclusive delay bounds regardless of selected cue', () => {
  const minPlan = buildIntervalCuePlan(FULL_INTERVAL_POOL, {
    random: randomFrom([0.6, 0]),
  });
  const maxPlan = buildIntervalCuePlan(FULL_INTERVAL_POOL, {
    random: randomFrom([0.6, 0.999999]),
  });

  assert.equal(minPlan.cuePlan[0]?.offsetMs, 500);
  assert.equal(maxPlan.cuePlan[0]?.offsetMs, 2500);
});

test('respects configured delay ranges and caps them to the work duration', () => {
  const plan = buildIntervalCuePlan(FULL_INTERVAL_POOL, {
    settings: { delayMinMs: 1500, delayMaxMs: 2500 },
    workTimeSeconds: 2,
    random: randomFrom([0, 0.999999]),
  });

  assert.equal(plan.cuePlan[0]?.offsetMs, 1500);
});

test('uses cue weights at cumulative boundaries', () => {
  const settings = { cueWeights: { Left: 5, Right: 1, Run: 1, 'Come Back': 1 } };

  assert.equal(
    buildIntervalCuePlan(FULL_INTERVAL_POOL, {
      settings,
      random: randomFrom([0.624, 0]),
    }).currentExercise,
    'Left'
  );
  assert.equal(
    buildIntervalCuePlan(FULL_INTERVAL_POOL, {
      settings,
      random: randomFrom([0.625, 0]),
    }).currentExercise,
    'Right'
  );
});

test('prevents a third matching cue when two or more cues are enabled', () => {
  const plan = buildIntervalCuePlan(['Left', 'Right'], {
    recentCues: ['Left', 'Left'],
    random: randomFrom([0, 0]),
  });

  assert.equal(plan.currentExercise, 'Right');
});

test('allows repeats when the athlete enabled only one cue', () => {
  const plan = buildIntervalCuePlan(['Left'], {
    recentCues: ['Left', 'Left'],
    random: randomFrom([0, 0]),
  });

  assert.equal(plan.currentExercise, 'Left');
});

test('weighted draws have the configured distribution when no anti-streak rule applies', () => {
  let state = 123456789;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const counts = Object.fromEntries(INTERVAL_SINGLE_CUES.map((cue) => [cue, 0])) as Record<
    (typeof INTERVAL_SINGLE_CUES)[number],
    number
  >;
  const total = 8000;

  for (let index = 0; index < total; index += 1) {
    const cue = buildIntervalCuePlan(FULL_INTERVAL_POOL, {
      settings: { cueWeights: { Left: 4, Right: 2, Run: 1, 'Come Back': 1 } },
      random,
    }).currentExercise as (typeof INTERVAL_SINGLE_CUES)[number];
    counts[cue] += 1;
  }

  assert.ok(Math.abs(counts.Left / total - 0.5) < 0.03);
  assert.ok(Math.abs(counts.Right / total - 0.25) < 0.03);
  assert.ok(Math.abs(counts.Run / total - 0.125) < 0.02);
  assert.ok(Math.abs(counts['Come Back'] / total - 0.125) < 0.02);
});
