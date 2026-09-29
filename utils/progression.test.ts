import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  ProgressionSettings,
  RepOutcome,
  SessionConfigSnapshot,
  WorkoutHistoryItem,
} from '../types.ts';
import { normalizeCueSettings } from './cueSettings.ts';
import { normalizeDrillSettings, validateDrillSession } from './drillPlan.ts';
import {
  applyProgressionStage,
  evaluateStageSession,
  getProgressionStatus,
  getSessionProgressionStage,
  matchesProgressionStage,
} from './progression.ts';

const baseConfig = (): SessionConfigSnapshot => ({
  timerConfig: { prepTime: 10, workTime: 3, restTime: 30, rounds: 8, coolDownTime: 0 },
  enabledCues: ['Left', 'Right'],
  cueSettings: normalizeCueSettings({ delayMinMs: 500, delayMaxMs: 2500 }),
  drillSettings: normalizeDrillSettings({ drillType: 'CHAIN', correctionGapMs: 800 }),
  cueOutputMode: 'BOTH',
});

test('stages set drill type and delay range, keeping cues, weights and timers', () => {
  const expected = {
    1: ['PLANNED', 300, 900],
    2: ['REACTIVE', 300, 900],
    3: ['REACTIVE', 1500, 2500],
    4: ['FAKE_OUT', 1500, 2500],
  } as const;
  for (const stage of [1, 2, 3, 4] as const) {
    const result = applyProgressionStage(stage, baseConfig());
    assert.equal(result.isValid, true, `stage ${stage}`);
    if (!result.isValid) continue;
    const { config } = result;
    assert.deepEqual(
      [
        config.drillSettings.drillType,
        config.cueSettings.delayMinMs,
        config.cueSettings.delayMaxMs,
      ],
      expected[stage]
    );
    assert.deepEqual(config.enabledCues, ['Left', 'Right']);
    assert.equal(config.timerConfig.rounds, 8);
    assert.equal(matchesProgressionStage(config, stage), true);
  }
});

test('stage 4 raises work time to fit the whole correction schedule', () => {
  const result = applyProgressionStage(4, baseConfig());
  assert.equal(result.isValid, true);
  if (!result.isValid) return;
  // 2500 ms max delay + 800 ms gap + 500 ms margin = 3.8 s → 4 s.
  assert.equal(result.config.timerConfig.workTime, 4);
  const c = result.config;
  assert.equal(
    validateDrillSession({
      drillSettings: c.drillSettings,
      cueSettings: c.cueSettings,
      enabledCues: c.enabledCues,
      config: c.timerConfig,
    }).isValid,
    true
  );

  const longer = baseConfig();
  longer.timerConfig.workTime = 7;
  const kept = applyProgressionStage(4, longer);
  assert.equal(kept.isValid && kept.config.timerConfig.workTime, 7);
});

test('stage 4 is refused with one enabled cue instead of enabling another', () => {
  const single = { ...baseConfig(), enabledCues: ['Left'] };
  const result = applyProgressionStage(4, single);
  assert.equal(result.isValid, false);
  if (!result.isValid) assert.match(result.message, /two enabled cues/);
});

test('applying a stage never mutates the input configuration', () => {
  const config = baseConfig();
  const before = JSON.stringify(config);
  applyProgressionStage(4, config);
  assert.equal(JSON.stringify(config), before);
});

const progression = (stage: 1 | 2 | 3 | 4 = 2): ProgressionSettings => ({
  enabled: true,
  stage,
  stageSetAt: '2026-09-01T00:00:00.000Z',
});

test('only opted-in, non-replay sessions matching the stage record a stage', () => {
  const stage2 = applyProgressionStage(2, baseConfig());
  assert.ok(stage2.isValid);
  if (!stage2.isValid) return;
  assert.equal(getSessionProgressionStage(progression(2), stage2.config, false), 2);
  assert.equal(getSessionProgressionStage(progression(2), stage2.config, true), undefined);
  assert.equal(
    getSessionProgressionStage({ ...progression(2), enabled: false }, stage2.config, false),
    undefined
  );
  assert.equal(getSessionProgressionStage(progression(3), stage2.config, false), undefined);
});

let counter = 0;
const session = (
  outcomes: Array<RepOutcome | undefined>,
  options: { stage?: 1 | 2 | 3 | 4; date?: string; replay?: boolean } = {}
): WorkoutHistoryItem => {
  counter += 1;
  const id = `s${counter}`;
  return {
    id,
    date: options.date ?? `2026-09-${String(10 + counter).padStart(2, '0')}T10:00:00.000Z`,
    duration: 100,
    progressionStage: 'stage' in options ? options.stage : 2,
    ...(options.replay ? { replayOfSessionId: 'orig' } : {}),
    session: {
      planVersion: 1,
      drillType: 'REACTIVE',
      stoppingInstruction: '',
      config: baseConfig(),
      rounds: outcomes.map((outcome, index) => ({
        id: `${id}-r${index + 1}`,
        roundNumber: index + 1,
        condition: 'REACTIVE',
        fakeOut: false,
        events: [],
        ...(outcome ? { outcome } : {}),
      })),
    },
  };
};

const C = 'CLEAN' as const;
const W = 'WRONG_FIRST_STEP' as const;

test('session evaluation thresholds: 5 logged, 80% coverage, 80% clean', () => {
  // 4 clean of 4 logged: too few logged reps.
  assert.equal(evaluateStageSession(session([C, C, C, C])).qualifies, false);
  // 5 clean of 5 logged, 5/5 coverage: qualifies exactly at the floor.
  assert.equal(evaluateStageSession(session([C, C, C, C, C])).qualifies, true);
  // 4/5 clean = 80%: qualifies at the boundary.
  const boundary = evaluateStageSession(session([C, C, C, C, W]));
  assert.equal(boundary.qualifies, true);
  assert.equal(boundary.cleanPct, 80);
  // 7/9 ≈ 77.8% clean: fails.
  assert.equal(evaluateStageSession(session([C, C, C, C, C, C, C, W, W])).qualifies, false);
  // 8 clean logged out of 10 rounds = 80% coverage: qualifies.
  assert.equal(
    evaluateStageSession(session([C, C, C, C, C, C, C, C, undefined, undefined])).qualifies,
    true
  );
  // 5 clean logged of 7 rounds ≈ 71% coverage: one clean tap cannot carry an unlogged workout.
  const lowCoverage = evaluateStageSession(session([C, C, C, C, C, undefined, undefined]));
  assert.equal(lowCoverage.qualifies, false);
  assert.match(lowCoverage.reason, /logged/);
});

test('suggests advancing after three consecutive qualifying sessions at the current stage', () => {
  counter = 0;
  const good = () => session([C, C, C, C, C]);
  const history = [good(), good(), good()].reverse(); // newest first, like the store
  const status = getProgressionStatus(history, progression(2));
  assert.equal(status.suggestedStage, 3);
  assert.equal(status.run.length, 3);
  assert.ok(status.run.every((evaluation) => evaluation.qualifies));

  assert.equal(getProgressionStatus(history.slice(0, 2), progression(2)).suggestedStage, null);
  // Stage 4 is the last stage; nothing further is suggested.
  const atFour = [1, 2, 3].map(() => session([C, C, C, C, C], { stage: 4 })).reverse();
  assert.equal(getProgressionStatus(atFour, progression(4)).suggestedStage, null);
});

test('a nonqualifying stage session breaks the run; other drills, replays and old sessions do not count', () => {
  counter = 0;
  const good = () => session([C, C, C, C, C]);
  const oldest = good();
  const broken = session([C, W, W, W, W]);
  const unrelated = session([W, W, W, W, W], { stage: undefined });
  const replay = session([W, W, W, W, W], { replay: true });
  const newer = [good(), good()];
  const history = [oldest, broken, newer[0], unrelated, replay, newer[1]].reverse();

  const status = getProgressionStatus(history, progression(2));
  assert.equal(status.suggestedStage, null);
  assert.deepEqual(
    status.run.map((e) => e.sessionId),
    [newer[1].id, newer[0].id]
  );
  assert.equal(status.recent[2].sessionId, broken.id);
  assert.equal(status.recent[2].qualifies, false);

  // Sessions before the stage was (re)chosen never count.
  const later = { ...progression(2), stageSetAt: '2026-09-30T00:00:00.000Z' };
  assert.equal(getProgressionStatus(history, later).recent.length, 0);
});

test('disabled progression never suggests anything', () => {
  counter = 0;
  const history = [1, 2, 3].map(() => session([C, C, C, C, C])).reverse();
  const status = getProgressionStatus(history, { ...progression(2), enabled: false });
  assert.equal(status.suggestedStage, null);
});
