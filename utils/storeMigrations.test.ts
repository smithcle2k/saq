import assert from 'node:assert/strict';
import test from 'node:test';
import { migratePersistedAppState, normalizeHydratedAppState } from './storeMigrations.ts';

test('migrates version 14 settings without changing existing history or preferences', () => {
  const history = [
    { date: '2026-09-01T12:00:00.000Z', duration: 600, mode: 'INTERVAL' as const, rounds: 8 },
  ];
  const migrated = migratePersistedAppState(
    {
      timerConfig: { prepTime: 15 },
      exercises: ['Left'],
      history,
      voiceEnabled: false,
      soundEffectsEnabled: false,
      hapticsEnabled: false,
    },
    14
  );

  assert.deepEqual(migrated.timerConfig, {
    prepTime: 15,
    workTime: 8,
    restTime: 55,
    rounds: 8,
    coolDownTime: 0,
  });
  assert.deepEqual(migrated.exercises, ['Left']);
  assert.equal(migrated.history, history);
  assert.equal(migrated.voiceEnabled, false);
  assert.equal(migrated.cueOutputMode, 'VISUAL_ONLY');
  assert.deepEqual(migrated.cueSettings, {
    delayMinMs: 500,
    delayMaxMs: 2500,
    cueWeights: { Left: 1, Right: 1, Run: 1, 'Come Back': 1 },
  });
});

test('preserves legacy mode configurations and normalizes malformed current cue settings', () => {
  const migrated = migratePersistedAppState(
    {
      mode: 'SAQ',
      modeConfigs: { SAQ: { workTime: 12 } },
      exercisesByMode: { INTERVAL: ['Right'] },
      history: [{ date: '2025-01-01T00:00:00.000Z', duration: 60 }],
      cueSettings: { delayMinMs: 2500, delayMaxMs: 500, cueWeights: { Run: 20 } },
    },
    13
  );

  assert.equal(migrated.timerConfig.workTime, 12);
  assert.deepEqual(migrated.exercises, ['Right']);
  assert.deepEqual(migrated.cueSettings, {
    delayMinMs: 500,
    delayMaxMs: 2500,
    cueWeights: { Left: 1, Right: 1, Run: 10, 'Come Back': 1 },
  });

  assert.deepEqual(
    normalizeHydratedAppState({
      cueSettings: { delayMinMs: Number.NaN, delayMaxMs: 1000, cueWeights: { Left: 0 } },
    }).cueSettings,
    {
      delayMinMs: 500,
      delayMaxMs: 1000,
      cueWeights: { Left: 1, Right: 1, Run: 1, 'Come Back': 1 },
    }
  );
});

test('migrates version 16 state to drill settings without rewriting history or output mode', () => {
  const history = [
    { date: '2025-01-01T00:00:00.000Z', duration: 60 },
    { date: '2026-09-01T12:00:00.000Z', duration: 600, mode: 'INTERVAL' as const, rounds: 8 },
  ];
  const migrated = migratePersistedAppState(
    {
      timerConfig: { prepTime: 10, workTime: 8, restTime: 30, rounds: 6, coolDownTime: 0 },
      exercises: ['Left', 'Right'],
      history,
      cueOutputMode: 'VOICE_ONLY',
    },
    16
  );

  assert.equal(migrated.history, history);
  assert.equal(migrated.cueOutputMode, 'VOICE_ONLY');
  assert.equal(migrated.timerConfig.workTime, 8);
  assert.deepEqual(migrated.drillSettings, {
    drillType: 'REACTIVE',
    fakeOutProbability: 0.25,
    correctionGapMs: 800,
    chainCueCount: 2,
    stoppingInstruction: '',
  });
});

test('normalizes partial or invalid drill settings on migration and current-version hydration', () => {
  const migrated = migratePersistedAppState(
    { drillSettings: { drillType: 'CHAIN', chainCueCount: 3, correctionGapMs: 5000 } },
    17
  );
  assert.equal(migrated.drillSettings.drillType, 'CHAIN');
  assert.equal(migrated.drillSettings.chainCueCount, 3);
  assert.equal(migrated.drillSettings.correctionGapMs, 1500);

  const hydrated = normalizeHydratedAppState({
    cueSettings: undefined,
    drillSettings: { drillType: 'BOGUS', fakeOutProbability: -1 },
  });
  assert.equal(hydrated.drillSettings.drillType, 'REACTIVE');
  assert.equal(hydrated.drillSettings.fakeOutProbability, 0);
});

test('migrates version 17 history to 18 without fabricating outcomes, times or notes', () => {
  const round = {
    id: 's1-r1',
    roundNumber: 1,
    condition: 'REACTIVE' as const,
    fakeOut: false,
    events: [
      {
        id: 's1-r1-e1',
        label: 'Left',
        offsetMs: 1200,
        role: 'TARGET' as const,
        status: 'DELIVERED' as const,
      },
    ],
  };
  const history = [
    {
      id: 's1',
      date: '2026-09-24T10:00:00.000Z',
      duration: 70,
      drillType: 'REACTIVE' as const,
      session: {
        planVersion: 1 as const,
        drillType: 'REACTIVE' as const,
        stoppingInstruction: '',
        config: {} as never,
        rounds: [round],
      },
    },
    { date: '2025-01-01T00:00:00.000Z', duration: 60 },
  ];
  const migrated = migratePersistedAppState({ history }, 17);

  assert.equal(migrated.history, history);
  const [saved] = migrated.history ?? [];
  assert.equal('notes' in saved, false);
  assert.equal('outcome' in (saved.session?.rounds[0] ?? {}), false);
  assert.equal('selfReportedTimeMs' in (saved.session?.rounds[0] ?? {}), false);
});

test('migrates version 18 to 19 with no presets, warm-up off and progression opted out', () => {
  const history = [
    { id: 's1', date: '2026-09-24T10:00:00.000Z', duration: 70 },
    { date: '2025-01-01T00:00:00.000Z', duration: 60 },
  ];
  const migrated = migratePersistedAppState(
    {
      timerConfig: { prepTime: 10, workTime: 8, restTime: 30, rounds: 6, coolDownTime: 0 },
      exercises: ['Left', 'Right'],
      history,
      cueOutputMode: 'VISUAL_ONLY',
      soundEffectsEnabled: false,
    },
    18
  );
  assert.equal(migrated.history, history);
  assert.equal(migrated.timerConfig.workTime, 8);
  assert.equal(migrated.cueOutputMode, 'VISUAL_ONLY');
  assert.equal(migrated.soundEffectsEnabled, false);
  assert.deepEqual(migrated.savedPresets, []);
  assert.equal(migrated.warmupEnabled, false);
  assert.deepEqual(migrated.progression, {
    enabled: false,
    stage: 1,
    stageSetAt: '1970-01-01T00:00:00.000Z',
  });
});

test('persisted presets and progression are normalized on migration and hydration', () => {
  const presetConfig = {
    timerConfig: { prepTime: 10, workTime: 8, restTime: 55, rounds: 8, coolDownTime: 0 },
    enabledCues: ['Left', 'Right', 'Run'],
    cueSettings: {
      delayMinMs: 300,
      delayMaxMs: 900,
      cueWeights: { Left: 1, Right: 1, Run: 1, 'Come Back': 1 },
    },
    drillSettings: {
      drillType: 'REACTIVE',
      fakeOutProbability: 0.25,
      correctionGapMs: 800,
      chainCueCount: 2,
      stoppingInstruction: '',
    },
    cueOutputMode: 'BOTH',
  };
  const input = {
    savedPresets: [
      { id: 'p1', name: 'Mine', config: presetConfig },
      { id: 'p2', name: 'Broken', config: { ...presetConfig, enabledCues: [] } },
    ],
    warmupEnabled: 'yes',
    progression: { enabled: true, stage: 7, stageSetAt: 'not a date' },
  };
  for (const state of [
    migratePersistedAppState(input, 19),
    normalizeHydratedAppState(input as never),
  ]) {
    assert.deepEqual(
      state.savedPresets.map((preset: { id: string }) => preset.id),
      ['p1']
    );
    assert.equal(state.warmupEnabled, false);
    assert.deepEqual(state.progression, {
      enabled: true,
      stage: 1,
      stageSetAt: '1970-01-01T00:00:00.000Z',
    });
  }

  const valid = normalizeHydratedAppState({
    progression: { enabled: true, stage: 3, stageSetAt: '2026-09-20T00:00:00.000Z' },
    warmupEnabled: true,
  } as never);
  assert.deepEqual(valid.progression, {
    enabled: true,
    stage: 3,
    stageSetAt: '2026-09-20T00:00:00.000Z',
  });
  assert.equal(valid.warmupEnabled, true);
});
