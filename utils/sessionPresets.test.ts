import assert from 'node:assert/strict';
import test from 'node:test';
import type { SessionConfigSnapshot, SessionPreset } from '../types.ts';
import { normalizeCueSettings } from './cueSettings.ts';
import { normalizeDrillSettings, validateDrillSession } from './drillPlan.ts';
import {
  BUILT_IN_PRESETS,
  createUserPreset,
  deletePreset,
  normalizeSavedPresets,
  renamePreset,
  sessionConfigsEqual,
  validateSessionConfig,
} from './sessionPresets.ts';

const config = (): SessionConfigSnapshot => ({
  timerConfig: { prepTime: 10, workTime: 6, restTime: 40, rounds: 6, coolDownTime: 0 },
  enabledCues: ['Left', 'Right', 'Run'],
  cueSettings: normalizeCueSettings({
    delayMinMs: 300,
    delayMaxMs: 900,
    cueWeights: { Left: 2, Right: 2, Run: 1, 'Come Back': 5 },
  }),
  drillSettings: normalizeDrillSettings({
    drillType: 'FAKE_OUT',
    fakeOutProbability: 0.4,
    correctionGapMs: 700,
    stoppingInstruction: 'Stop within 2 strides',
  }),
  cueOutputMode: 'VISUAL_ONLY',
});

test('built-ins state every value, start valid, and match their drill intent', () => {
  const byId = Object.fromEntries(BUILT_IN_PRESETS.map((preset) => [preset.id, preset]));
  assert.deepEqual(Object.keys(byId).sort(), [
    'builtin-decel-focus',
    'builtin-planned-baseline',
    'builtin-reactive-cuts',
  ]);

  for (const preset of BUILT_IN_PRESETS) {
    assert.equal(preset.builtIn, true);
    assert.equal(validateSessionConfig(preset.config).isValid, true, preset.name);
    const { config: c } = preset;
    assert.equal(
      validateDrillSession({
        drillSettings: c.drillSettings,
        cueSettings: c.cueSettings,
        enabledCues: c.enabledCues,
        config: c.timerConfig,
      }).isValid,
      true
    );
    assert.deepEqual(Object.keys(c.timerConfig).sort(), [
      'coolDownTime',
      'prepTime',
      'restTime',
      'rounds',
      'workTime',
    ]);
  }

  const cuts = byId['builtin-reactive-cuts'].config;
  assert.equal(cuts.drillSettings.drillType, 'REACTIVE');
  assert.deepEqual(cuts.enabledCues, ['Left', 'Right', 'Run']);
  assert.deepEqual([cuts.cueSettings.delayMinMs, cuts.cueSettings.delayMaxMs], [500, 2500]);

  const decel = byId['builtin-decel-focus'].config;
  assert.equal(decel.drillSettings.drillType, 'REACTIVE');
  assert.ok(decel.cueSettings.cueWeights['Come Back'] > decel.cueSettings.cueWeights.Left);

  const planned = byId['builtin-planned-baseline'].config;
  assert.equal(planned.drillSettings.drillType, 'PLANNED');
  assert.deepEqual(new Set(Object.values(planned.cueSettings.cueWeights)), new Set([1]));
});

test('a user preset round-trips every setting and is a deep copy', () => {
  const source = config();
  const result = createUserPreset([], { id: 'p1', name: '  Turf day  ', config: source });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.preset.name, 'Turf day');
  assert.deepEqual(result.preset.config, source);
  assert.equal(sessionConfigsEqual(result.preset.config, source), true);

  source.cueSettings.cueWeights.Left = 9;
  source.enabledCues.push('Come Back');
  assert.equal(result.preset.config.cueSettings.cueWeights.Left, 2);
  assert.deepEqual(result.preset.config.enabledCues, ['Left', 'Right', 'Run']);

  // Survives a JSON persistence round trip unchanged.
  const [restored] = normalizeSavedPresets(JSON.parse(JSON.stringify(result.presets)));
  assert.deepEqual(restored, result.preset);
});

test('save rejects blank, too-long and duplicate names without changing the list', () => {
  const existing: SessionPreset[] = [{ id: 'a', name: 'Mine', config: config() }];
  for (const name of ['   ', 'x'.repeat(41), 'mine', 'Reactive cuts']) {
    const result = createUserPreset(existing, { id: 'b', name, config: config() });
    assert.equal(result.ok, false, name);
  }
  assert.equal(existing.length, 1);
});

test('save and apply reject configurations that cannot start, with a reason', () => {
  const tooShort = config();
  tooShort.timerConfig.workTime = 6; // Chains need 8 s.
  tooShort.drillSettings = normalizeDrillSettings({ drillType: 'CHAIN' });
  const saved = createUserPreset([], { id: 'c', name: 'Chain', config: tooShort });
  assert.equal(saved.ok, false);
  if (!saved.ok) assert.match(saved.message, /8s work/);

  const bad = [
    { ...config(), timerConfig: { ...config().timerConfig, rounds: 0 } },
    { ...config(), timerConfig: { ...config().timerConfig, workTime: 4.5 } },
    { ...config(), enabledCues: [] },
    { ...config(), enabledCues: ['Left', 'Sideways'] },
    { ...config(), cueOutputMode: 'LOUD' },
    { ...config(), cueSettings: { ...config().cueSettings, delayMinMs: 3000 } },
    { ...config(), drillSettings: { ...config().drillSettings, drillType: 'SPIN' } },
    null,
  ];
  for (const candidate of bad) {
    const validation = validateSessionConfig(candidate);
    assert.equal(validation.isValid, false, JSON.stringify(candidate));
    if (!validation.isValid) assert.ok(validation.message.length > 0);
  }
});

test('rename and delete affect only the targeted user preset', () => {
  const presets: SessionPreset[] = [
    { id: 'a', name: 'One', config: config() },
    { id: 'b', name: 'Two', config: config() },
  ];
  const renamed = renamePreset(presets, 'a', ' Uno ');
  assert.equal(renamed.ok, true);
  if (renamed.ok) {
    assert.deepEqual(
      renamed.presets.map((p) => p.name),
      ['Uno', 'Two']
    );
    assert.equal(renamed.presets[0].config, presets[0].config);
  }
  assert.equal(renamePreset(presets, 'a', 'two').ok, false);
  assert.equal(renamePreset(presets, 'a', 'One').ok, true);
  assert.equal(renamePreset(presets, 'builtin-reactive-cuts', 'X').ok, false);
  assert.equal(renamePreset(presets, 'missing', 'X').ok, false);

  assert.deepEqual(
    deletePreset(presets, 'a').map((p) => p.id),
    ['b']
  );
  assert.equal(deletePreset(presets, 'missing'), presets);
});

test('persisted presets drop corrupted entries and duplicate ids', () => {
  const good = { id: 'a', name: 'Good', config: config() };
  const restored = normalizeSavedPresets([
    good,
    { id: 'a', name: 'Duplicate', config: config() },
    { id: 'b', name: '', config: config() },
    { id: 'c', name: 'Broken', config: { ...config(), enabledCues: 'Left' } },
    { name: 'No id', config: config() },
    'junk',
  ]);
  assert.deepEqual(restored, [good]);
  assert.deepEqual(normalizeSavedPresets(undefined), []);
  assert.deepEqual(normalizeSavedPresets({}), []);
});

test('built-in timer values match the app defaults', async () => {
  const { DEFAULT_TIMER_CONFIG } = await import('./storeMigrations.ts');
  for (const preset of BUILT_IN_PRESETS) {
    assert.deepEqual(preset.config.timerConfig, DEFAULT_TIMER_CONFIG);
  }
});
