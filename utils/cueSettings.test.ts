import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_CUE_SETTINGS,
  normalizeCueSettings,
  validateCueSettingsForWorkTime,
} from './cueSettings.ts';

test('normalizes missing, invalid, reversed, and out-of-range cue settings', () => {
  assert.deepEqual(normalizeCueSettings(undefined), DEFAULT_CUE_SETTINGS);

  assert.deepEqual(
    normalizeCueSettings({
      delayMinMs: Number.NaN,
      delayMaxMs: Infinity,
      cueWeights: { Left: 0, Right: 2.8, Run: 99, 'Come Back': -1 },
    }),
    {
      delayMinMs: 500,
      delayMaxMs: 2500,
      cueWeights: { Left: 1, Right: 3, Run: 10, 'Come Back': 1 },
    }
  );

  assert.deepEqual(normalizeCueSettings({ delayMinMs: 2400.7, delayMaxMs: 300.2 }), {
    delayMinMs: 300,
    delayMaxMs: 2401,
    cueWeights: { Left: 1, Right: 1, Run: 1, 'Come Back': 1 },
  });
});

test('caps the effective range to fit work time and rejects impossible work durations', () => {
  assert.deepEqual(validateCueSettingsForWorkTime({ delayMinMs: 1500, delayMaxMs: 2500 }, 2), {
    isValid: true,
    settings: {
      delayMinMs: 1500,
      delayMaxMs: 2500,
      cueWeights: { Left: 1, Right: 1, Run: 1, 'Come Back': 1 },
    },
    effectiveDelayRange: { minMs: 1500, maxMs: 1500 },
    maxAllowedDelayMs: 1500,
  });

  assert.deepEqual(validateCueSettingsForWorkTime(undefined, 0.5), {
    isValid: false,
    settings: DEFAULT_CUE_SETTINGS,
    maxAllowedDelayMs: 0,
    error: 'WORK_TIME_TOO_SHORT',
  });
});
