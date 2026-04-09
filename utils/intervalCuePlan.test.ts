import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIntervalCuePlan } from './intervalCuePlan.ts';
import { INTERVAL_SINGLE_CUES } from './defaultCues.ts';

const FULL_INTERVAL_POOL = [...INTERVAL_SINGLE_CUES];

const withMockedRandom = (values: number[], run: () => void) => {
  const originalRandom = Math.random;
  let index = 0;

  Math.random = () => {
    const nextValue = values[index];
    index += 1;
    return nextValue ?? values[values.length - 1] ?? 0;
  };

  try {
    run();
  } finally {
    Math.random = originalRandom;
  }
};

test('interval work phase announces Go and schedules Run at 500ms', () => {
  withMockedRandom([0.6], () => {
    const plan = buildIntervalCuePlan(FULL_INTERVAL_POOL);

    assert.equal(plan.announcement, 'Go');
    assert.equal(plan.currentExercise, 'Run');
    assert.deepEqual(plan.cuePlan, [{ id: 1, label: 'Run', offsetMs: 500 }]);
  });
});

test('interval work phase schedules Left and Right inside the lateral timing bucket', () => {
  withMockedRandom([0, 0], () => {
    const leftPlan = buildIntervalCuePlan(FULL_INTERVAL_POOL);

    assert.equal(leftPlan.announcement, 'Go');
    assert.equal(leftPlan.currentExercise, 'Left');
    assert.deepEqual(leftPlan.cuePlan, [{ id: 1, label: 'Left', offsetMs: 1200 }]);
  });

  withMockedRandom([0.3, 0.9995], () => {
    const rightPlan = buildIntervalCuePlan(FULL_INTERVAL_POOL);

    assert.equal(rightPlan.announcement, 'Go');
    assert.equal(rightPlan.currentExercise, 'Right');
    assert.deepEqual(rightPlan.cuePlan, [{ id: 1, label: 'Right', offsetMs: 2200 }]);
  });
});

test('interval work phase schedules Come Back inside the comeback timing bucket', () => {
  withMockedRandom([0.9, 0], () => {
    const minPlan = buildIntervalCuePlan(FULL_INTERVAL_POOL);

    assert.equal(minPlan.announcement, 'Go');
    assert.equal(minPlan.currentExercise, 'Come Back');
    assert.deepEqual(minPlan.cuePlan, [{ id: 1, label: 'Come Back', offsetMs: 2300 }]);
  });

  withMockedRandom([0.9, 0.999], () => {
    const maxPlan = buildIntervalCuePlan(FULL_INTERVAL_POOL);

    assert.equal(maxPlan.announcement, 'Go');
    assert.equal(maxPlan.currentExercise, 'Come Back');
    assert.deepEqual(maxPlan.cuePlan, [{ id: 1, label: 'Come Back', offsetMs: 2500 }]);
  });
});

test('interval currentExercise always stays aligned with the selected cue', () => {
  INTERVAL_SINGLE_CUES.forEach((cue, index) => {
    withMockedRandom([(index + 0.1) / INTERVAL_SINGLE_CUES.length, 0.5], () => {
      const plan = buildIntervalCuePlan(FULL_INTERVAL_POOL);
      assert.equal(plan.currentExercise, cue);
      assert.equal(plan.cuePlan[0]?.label, cue);
    });
  });
});
