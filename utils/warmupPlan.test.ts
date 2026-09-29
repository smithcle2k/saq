import assert from 'node:assert/strict';
import test from 'node:test';
import { WARMUP_STEPS } from '../data/warmup.ts';
import {
  createWarmupState,
  getWarmupTotalSeconds,
  validateWarmupSteps,
  warmupReducer,
} from './warmupPlan.ts';
import type { WarmupStep } from './warmupPlan.ts';

const steps: WarmupStep[] = [
  { id: 'a', title: 'A', instruction: 'Do A', durationSeconds: 10 },
  { id: 'b', title: 'B', instruction: 'Do B', durationSeconds: 5 },
  { id: 'c', title: 'C', instruction: 'Do C', durationSeconds: 20 },
];

test('the shipped warm-up is valid and about eight minutes', () => {
  assert.deepEqual(validateWarmupSteps(WARMUP_STEPS), { isValid: true });
  const total = getWarmupTotalSeconds(WARMUP_STEPS);
  assert.ok(total >= 7 * 60 && total <= 9 * 60, `${total}s`);
});

test('invalid step lists are rejected with a reason', () => {
  const cases: WarmupStep[][] = [
    [],
    [{ ...steps[0], title: ' ' }],
    [{ ...steps[0], durationSeconds: 4 }],
    [{ ...steps[0], durationSeconds: 7.5 }],
    [{ ...steps[0], durationSeconds: 601 }],
    [steps[0], { ...steps[1], id: 'a' }],
  ];
  for (const candidate of cases) {
    const result = validateWarmupSteps(candidate);
    assert.equal(result.isValid, false, JSON.stringify(candidate));
  }
});

test('ticks count down, cross step boundaries and finish with active time', () => {
  let state = createWarmupState(steps);
  assert.deepEqual([state.stepIndex, state.remainingSeconds, state.status], [0, 10, 'RUNNING']);

  state = warmupReducer(state, { type: 'TICK', seconds: 9 }, steps);
  assert.deepEqual([state.stepIndex, state.remainingSeconds], [0, 1]);

  // A throttled tick that spans a whole step carries over into the next ones.
  state = warmupReducer(state, { type: 'TICK', seconds: 7 }, steps);
  assert.deepEqual([state.stepIndex, state.remainingSeconds], [2, 19]);
  assert.equal(state.activeSeconds, 16);

  state = warmupReducer(state, { type: 'TICK', seconds: 60 }, steps);
  assert.equal(state.status, 'DONE');
  assert.equal(state.activeSeconds, 35);
  assert.equal(state.skippedAll, false);
});

test('pause freezes time; resume continues from the same second', () => {
  let state = warmupReducer(createWarmupState(steps), { type: 'TICK', seconds: 3 }, steps);
  state = warmupReducer(state, { type: 'PAUSE' }, steps);
  const paused = warmupReducer(state, { type: 'TICK', seconds: 30 }, steps);
  assert.equal(paused, state);
  assert.deepEqual([paused.stepIndex, paused.remainingSeconds, paused.activeSeconds], [0, 7, 3]);

  state = warmupReducer(paused, { type: 'RESUME' }, steps);
  state = warmupReducer(state, { type: 'TICK', seconds: 1 }, steps);
  assert.deepEqual([state.status, state.remainingSeconds, state.activeSeconds], ['RUNNING', 6, 4]);
});

test('skip step moves on without adding its unused time; skipping the last step finishes', () => {
  let state = warmupReducer(createWarmupState(steps), { type: 'TICK', seconds: 2 }, steps);
  state = warmupReducer(state, { type: 'SKIP_STEP' }, steps);
  assert.deepEqual([state.stepIndex, state.remainingSeconds, state.activeSeconds], [1, 5, 2]);
  assert.deepEqual(state.skippedStepIds, ['a']);

  // Skipping while paused stays paused on the new step.
  state = warmupReducer(state, { type: 'PAUSE' }, steps);
  state = warmupReducer(state, { type: 'SKIP_STEP' }, steps);
  assert.deepEqual([state.stepIndex, state.status], [2, 'PAUSED']);

  state = warmupReducer(state, { type: 'SKIP_STEP' }, steps);
  assert.equal(state.status, 'DONE');
  assert.deepEqual(state.skippedStepIds, ['a', 'b', 'c']);
});

test('skip warm-up ends immediately and later actions are ignored', () => {
  let state = warmupReducer(createWarmupState(steps), { type: 'TICK', seconds: 4 }, steps);
  state = warmupReducer(state, { type: 'SKIP_ALL' }, steps);
  assert.deepEqual([state.status, state.skippedAll, state.activeSeconds], ['DONE', true, 4]);
  for (const action of [
    { type: 'TICK', seconds: 5 },
    { type: 'RESUME' },
    { type: 'SKIP_STEP' },
    { type: 'PAUSE' },
  ] as const) {
    assert.equal(warmupReducer(state, action, steps), state);
  }
});
