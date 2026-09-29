import assert from 'node:assert/strict';
import test from 'node:test';
import { TimerPhase } from '../types.ts';
import type { TimerConfig } from '../types.ts';
import { createInitialSnapshot, getNextSnapshot } from './timerEngine.ts';

const config: TimerConfig = {
  prepTime: 10,
  workTime: 5,
  restTime: 55,
  rounds: 2,
  coolDownTime: 0,
};

const nextPlan = () => ({
  announcement: 'Go',
  currentExercise: 'Left',
  cuePlan: [{ id: 1, label: 'Left', offsetMs: 500 }],
});

test('keeps the existing prep, work, rest, and final finish sequence', () => {
  const workOne = getNextSnapshot(createInitialSnapshot(config), config, nextPlan);
  const restOne = getNextSnapshot(workOne, config, nextPlan);
  const workTwo = getNextSnapshot(restOne, config, nextPlan);
  const finalRest = getNextSnapshot(workTwo, config, nextPlan);
  const finished = getNextSnapshot(finalRest, config, nextPlan);

  assert.equal(workOne.phase, TimerPhase.WORK);
  assert.equal(restOne.phase, TimerPhase.REST);
  assert.equal(workTwo.currentRound, 2);
  assert.equal(finalRest.phase, TimerPhase.REST);
  assert.equal(finished.phase, TimerPhase.FINISHED);
  assert.equal(finished.shouldFinish, true);
});

test('enters cool-down only after the final rest when configured', () => {
  const coolDownConfig = { ...config, rounds: 1, coolDownTime: 30 };
  const work = getNextSnapshot(createInitialSnapshot(coolDownConfig), coolDownConfig, nextPlan);
  const rest = getNextSnapshot(work, coolDownConfig, nextPlan);
  const coolDown = getNextSnapshot(rest, coolDownConfig, nextPlan);
  const finished = getNextSnapshot(coolDown, coolDownConfig, nextPlan);

  assert.equal(coolDown.phase, TimerPhase.COOL_DOWN);
  assert.equal(finished.phase, TimerPhase.FINISHED);
});

test('asks for the pre-generated plan of the round being entered, once per WORK entry', () => {
  const requested: number[] = [];
  const planFor = (roundNumber: number) => {
    requested.push(roundNumber);
    return { ...nextPlan(), currentExercise: `cue-${roundNumber}` };
  };
  const workOne = getNextSnapshot(createInitialSnapshot(config), config, planFor);
  const restOne = getNextSnapshot(workOne, config, planFor);
  const workTwo = getNextSnapshot(restOne, config, planFor);
  const finalRest = getNextSnapshot(workTwo, config, planFor);
  getNextSnapshot(finalRest, config, planFor);

  assert.deepEqual(requested, [1, 2]);
  assert.equal(workTwo.currentExercise, 'cue-2');
});

test('uses each round plan to set one-cue and two-cue work durations', () => {
  const reactiveConfig = { ...config, workTime: 8 };
  const planFor = (roundNumber: number) => ({
    ...nextPlan(),
    workDurationSeconds: roundNumber === 1 ? 5 : 8,
  });
  const workOne = getNextSnapshot(createInitialSnapshot(reactiveConfig), reactiveConfig, planFor);
  const restOne = getNextSnapshot(workOne, reactiveConfig, planFor);
  const workTwo = getNextSnapshot(restOne, reactiveConfig, planFor);

  assert.equal(workOne.timeRemaining, 5);
  assert.equal(workTwo.timeRemaining, 8);
});
