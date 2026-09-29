import assert from 'node:assert/strict';
import test from 'node:test';
import { getCueScheduleActions, getRecentCuesAfterSelection } from './cueScheduler.ts';

const cuePlan = [
  { id: 1, label: 'Left', offsetMs: 500 },
  { id: 2, label: 'Right', offsetMs: 1500 },
];

test('schedules only undelivered cues with their remaining delay', () => {
  assert.deepEqual(getCueScheduleActions(cuePlan, 700, new Set([1])), [
    { cue: cuePlan[1], delayMs: 800 },
  ]);
});

test('dispatches overdue undelivered cues immediately after resuming', () => {
  assert.deepEqual(getCueScheduleActions(cuePlan, 700, new Set()), [
    { cue: cuePlan[0], delayMs: 0 },
    { cue: cuePlan[1], delayMs: 800 },
  ]);
});

test('retains only the two latest selected cues for anti-streak planning', () => {
  assert.deepEqual(getRecentCuesAfterSelection(['Left', 'Right'], 'Run'), ['Right', 'Run']);
  assert.deepEqual(getRecentCuesAfterSelection([], 'Left'), ['Left']);
});
