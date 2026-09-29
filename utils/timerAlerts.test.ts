import assert from 'node:assert/strict';
import test from 'node:test';
import { TimerPhase } from '../types.ts';
import { isNearCueEvent, shouldPlayCountdownBeep } from './timerAlerts.ts';

test('keeps existing countdown beep rules', () => {
  assert.equal(shouldPlayCountdownBeep(TimerPhase.REST, 3, false), true);
  assert.equal(shouldPlayCountdownBeep(TimerPhase.WORK, 3, false, 5), false);
  assert.equal(shouldPlayCountdownBeep(TimerPhase.WORK, 3, false, 10), true);
});

test('detects WORK countdown beeps that would collide with a cue deadline', () => {
  const offsets = [2500, 5000, 7400];
  // 10 s work, 3 s remaining -> beep at 7000 ms elapsed
  assert.equal(isNearCueEvent(7000, offsets), true);
  assert.equal(isNearCueEvent(8200, offsets), false);
  assert.equal(isNearCueEvent(6300, offsets, 700), false);
  assert.equal(isNearCueEvent(6300, offsets, 1200), true);
  assert.equal(isNearCueEvent(7000, []), false);
});
