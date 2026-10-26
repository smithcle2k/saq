import assert from 'node:assert/strict';
import test from 'node:test';
import { getReactiveSessionConfig, getReactiveSetupError } from './reactiveSession.ts';
import { buildSessionPlan, getRoundWorkSeconds } from './drillPlan.ts';

const setup = {
  timerConfig: { prepTime: 3, workTime: 5, restTime: 55, rounds: 8, coolDownTime: 60 },
  cueOutputMode: 'BOTH' as const,
};

test('new sessions use fixed safe timings and cue odds despite older setup values', () => {
  const snapshot = getReactiveSessionConfig(setup);
  assert.equal(snapshot.drillSettings.drillType, 'OPEN_REACTIVE');
  assert.equal(snapshot.drillSettings.stoppingInstruction, '');
  assert.deepEqual(snapshot.timerConfig, {
    prepTime: 10,
    workTime: 5,
    restTime: 55,
    rounds: 8,
    coolDownTime: 0,
  });
  assert.deepEqual(snapshot.enabledCues, ['Left', 'Right', 'Run', 'Come Back']);
  assert.deepEqual(Object.values(snapshot.cueSettings.cueWeights), [1, 1, 1, 1]);
  assert.deepEqual([snapshot.cueSettings.delayMinMs, snapshot.cueSettings.delayMaxMs], [500, 2500]);
  assert.equal(getReactiveSetupError(snapshot), null);
});

test('selected call count reaches every round with matching safe work timing', () => {
  for (const reactiveCueCount of [1, 2] as const) {
    const snapshot = getReactiveSessionConfig({ ...setup, reactiveCueCount });
    const workTime = reactiveCueCount === 1 ? 5 : 8;
    assert.equal(snapshot.drillSettings.reactiveCueCount, reactiveCueCount);
    assert.equal(snapshot.timerConfig.workTime, workTime);
    assert.equal(getReactiveSetupError(snapshot), null);
    for (const random of [() => 0, () => 0.999]) {
      const plan = buildSessionPlan({
        sessionId: 'selected-calls',
        config: snapshot.timerConfig,
        enabledCues: snapshot.enabledCues,
        cueSettings: snapshot.cueSettings,
        drillSettings: snapshot.drillSettings,
        random,
      });
      for (const round of plan.rounds) {
        assert.equal(round.events.length, reactiveCueCount);
        assert.equal(getRoundWorkSeconds(round, workTime), workTime);
        assert.ok(round.events.every((event) => event.offsetMs < workTime * 1000));
      }
    }
  }
});

test('only rounds and rest can make the simplified setup invalid', () => {
  const noRounds = getReactiveSessionConfig({
    ...setup,
    timerConfig: { ...setup.timerConfig, rounds: 0 },
  });
  assert.match(getReactiveSetupError(noRounds) ?? '', /at least one round/);

  const shortRest = getReactiveSessionConfig({
    ...setup,
    timerConfig: { ...setup.timerConfig, restTime: 10 },
  });
  assert.match(getReactiveSetupError(shortRest) ?? '', /at least 15 seconds/);
});
