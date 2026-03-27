import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIntervalCuePlan,
  optimizeIntervalCuePlanForAndroidChrome,
} from './intervalCuePlan.ts';

test('combines short-gap break and exercise speech for Android Chrome', () => {
  const plan = buildIntervalCuePlan('Burpees', true);

  const optimized = optimizeIntervalCuePlanForAndroidChrome(plan.cuePlan);

  assert.notStrictEqual(optimized, plan.cuePlan);
  assert.equal(optimized.length, 2);
  assert.equal(optimized[0]?.label, 'Break');
  assert.equal(optimized[0]?.announcement, 'Break. Burpees');
  assert.equal(optimized[0]?.speak, true);
  assert.equal(optimized[1]?.label, 'Burpees');
  assert.equal(optimized[1]?.speak, false);
});

test('leaves non-break interval cues unchanged', () => {
  const optimized = optimizeIntervalCuePlanForAndroidChrome([
    { id: 1, label: 'Left', offsetMs: 1000, interrupt: false },
    { id: 2, label: 'Right', offsetMs: 1050, interrupt: false },
  ]);

  assert.deepEqual(optimized, [
    { id: 1, label: 'Left', offsetMs: 1000, interrupt: false },
    { id: 2, label: 'Right', offsetMs: 1050, interrupt: false },
  ]);
});
