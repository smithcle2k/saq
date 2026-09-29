import assert from 'node:assert/strict';
import test from 'node:test';
import { TimerPhase } from '../types.ts';
import type { TimerConfig } from '../types.ts';
import {
  buildSessionPlan,
  DEFAULT_DRILL_SETTINGS,
  getDueRoundPreview,
  isPreviewSecond,
  normalizeDrillSettings,
  toIntervalCuePlan,
  validateDrillSession,
} from './drillPlan.ts';
import type { DrillSettingsInput } from './drillPlan.ts';
import { normalizeCueSettings } from './cueSettings.ts';

const config: TimerConfig = { prepTime: 10, workTime: 8, restTime: 20, rounds: 4, coolDownTime: 0 };
const cueSettings = normalizeCueSettings(undefined);
const allCues = ['Left', 'Right', 'Run', 'Come Back'];

const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

const plan = (
  drill: DrillSettingsInput,
  overrides: Partial<Parameters<typeof buildSessionPlan>[0]> = {}
) =>
  buildSessionPlan({
    sessionId: 's1',
    drillSettings: normalizeDrillSettings(drill),
    cueSettings,
    enabledCues: allCues,
    config,
    random: sequence(0.5),
    ...overrides,
  });

const movementLabels = (sessionPlan: ReturnType<typeof plan>) =>
  sessionPlan.rounds.flatMap((round) => round.events.map((event) => event.label));

const assertNoTripleRepeats = (labels: string[]) => {
  for (let index = 2; index < labels.length; index += 1) {
    assert.ok(
      !(labels[index] === labels[index - 1] && labels[index] === labels[index - 2]),
      `three identical cues at ${index}: ${labels.join(',')}`
    );
  }
};

test('normalizes drill settings, clamping options and trimming the stopping instruction', () => {
  assert.deepEqual(normalizeDrillSettings(undefined), DEFAULT_DRILL_SETTINGS);
  assert.deepEqual(
    normalizeDrillSettings({
      drillType: 'NOPE',
      fakeOutProbability: 3,
      correctionGapMs: 100,
      chainCueCount: 9,
      stoppingInstruction: `  ${'x'.repeat(100)}  `,
    }),
    {
      drillType: 'REACTIVE',
      fakeOutProbability: 1,
      correctionGapMs: 600,
      chainCueCount: 3,
      stoppingInstruction: 'x'.repeat(60),
    }
  );
  assert.equal(normalizeDrillSettings({ fakeOutProbability: Number.NaN }).fakeOutProbability, 0.25);
  assert.equal(normalizeDrillSettings({ chainCueCount: 1 }).chainCueCount, 2);
  assert.equal(
    normalizeDrillSettings({ stoppingInstruction: 'Stop ' }).stoppingInstruction,
    'Stop '
  );
  assert.equal(
    plan({ drillType: 'REACTIVE', stoppingInstruction: 'Cut and continue  ' }).stoppingInstruction,
    'Cut and continue'
  );
});

test('open reactive plans give two timed cues with a changed target and no preview', () => {
  const sessionPlan = plan(
    { drillType: 'OPEN_REACTIVE' },
    { random: sequence(0.5, 0.5, 0, 0.5, 0.5) }
  );
  assert.equal(sessionPlan.planVersion, 1);
  assert.equal(sessionPlan.rounds.length, 4);
  sessionPlan.rounds.forEach((round, index) => {
    assert.equal(round.id, `s1-r${index + 1}`);
    assert.equal(round.condition, 'OPEN_REACTIVE');
    assert.equal(round.preview, undefined);
    assert.equal(round.events.length, 2);
    assert.equal(round.events[0].id, `s1-r${index + 1}-e1`);
    assert.equal(round.events[0].role, 'TARGET');
    assert.equal(round.events[0].offsetMs, 1500);
    assert.equal(round.events[0].label, 'Run');
    assert.equal(round.events[1].id, `s1-r${index + 1}-e2`);
    assert.equal(round.events[1].role, 'CHANGE');
    assert.equal(round.events[1].offsetMs, 3500);
    assert.equal(round.events[1].label, 'Right');
  });
});

test('open reactive cue and timing draws are independent of history and saved weights', () => {
  const sessionPlan = plan(
    { drillType: 'OPEN_REACTIVE' },
    {
      random: sequence(0.5, 0.5),
      // 0.5 for the change decision would yield a single-cue round.
      cueSettings: normalizeCueSettings({
        cueWeights: { Left: 1, Right: 10, Run: 1, 'Come Back': 1 },
      }),
    }
  );
  assert.deepEqual(movementLabels(sessionPlan), ['Run', 'Run', 'Run', 'Run']);
  assert.ok(sessionPlan.rounds.every((round) => round.events[0].offsetMs === 1500));
  assert.ok(sessionPlan.rounds.every((round) => round.events.length === 1));
});

test('cue count and second-cue timing both vary across open reactive rounds', () => {
  const sessionPlan = plan(
    { drillType: 'OPEN_REACTIVE' },
    { random: sequence(0.5, 0.5, 0.9, 0.5, 0.5, 0, 0.5, 0.5) }
  );
  assert.deepEqual(
    sessionPlan.rounds.map((round) => round.events.length),
    [1, 2, 1, 2]
  );
  assert.deepEqual(
    sessionPlan.rounds
      .filter((round) => round.events.length === 2)
      .map((round) => round.events[1].offsetMs),
    [3500, 3500]
  );

  const varied = plan(
    { drillType: 'OPEN_REACTIVE' },
    { config: { ...config, rounds: 2 }, random: sequence(0, 0, 0, 0, 0, 0.8, 0.9, 0, 0.5, 0.6) }
  );
  assert.deepEqual(
    varied.rounds.map((round) => round.events[1].offsetMs),
    [2000, 4400]
  );
});

test('open reactive changes need three cues and at least eight seconds of work', () => {
  const input = {
    drillSettings: normalizeDrillSettings({ drillType: 'OPEN_REACTIVE' }),
    cueSettings,
    enabledCues: allCues,
    config,
  };
  const short = validateDrillSession({ ...input, config: { ...config, workTime: 5 } });
  assert.equal(short.isValid ? '' : short.error, 'REACTIVE_WORK_TOO_SHORT');
  const twoCues = validateDrillSession({ ...input, enabledCues: ['Left', 'Right'] });
  assert.equal(twoCues.isValid ? '' : twoCues.error, 'REACTIVE_NEEDS_THREE_CUES');
});

test('both open reactive cues reach the runtime schedule and are spoken', () => {
  const round = plan({ drillType: 'OPEN_REACTIVE' }, { random: sequence(0.5, 0.5, 0, 0.5, 0.5) })
    .rounds[0];
  const runtime = toIntervalCuePlan(round);
  assert.deepEqual(
    runtime.cuePlan.map(({ label, offsetMs, role, speak }) => ({ label, offsetMs, role, speak })),
    [
      { label: 'Run', offsetMs: 1500, role: 'TARGET', speak: true },
      { label: 'Right', offsetMs: 3500, role: 'CHANGE', speak: true },
    ]
  );
});

test('earlier reactive drills retain their single-cue plan', () => {
  const sessionPlan = plan({ drillType: 'REACTIVE' }, { config: { ...config, workTime: 5 } });
  assert.ok(sessionPlan.rounds.every((round) => round.events.length === 1));
  assert.ok(sessionPlan.rounds.every((round) => round.events[0].role === 'TARGET'));
});

test('the same random sequence produces the identical plan', () => {
  const random = () => sequence(0.1, 0.7, 0.3, 0.9, 0.2);
  assert.deepEqual(
    plan({ drillType: 'FAKE_OUT', fakeOutProbability: 0.5 }, { random: random() }),
    plan({ drillType: 'FAKE_OUT', fakeOutProbability: 0.5 }, { random: random() })
  );
});

test('planned rounds put the cue at WORK entry and preview it in the final 3 s of the prior phase', () => {
  const sessionPlan = plan({ drillType: 'PLANNED' });
  const [first, second] = sessionPlan.rounds;
  assert.equal(first.condition, 'PLANNED');
  assert.equal(first.events[0].offsetMs, 0);
  assert.deepEqual(first.preview, {
    phase: TimerPhase.PREP,
    offsetMs: 7000,
    label: first.events[0].label,
  });
  assert.deepEqual(second.preview, {
    phase: TimerPhase.REST,
    offsetMs: 17000,
    label: second.events[0].label,
  });

  const shortRest = plan({ drillType: 'PLANNED' }, { config: { ...config, restTime: 2 } });
  assert.equal(shortRest.rounds[1].preview?.offsetMs, 0);
});

test('rejects planned rounds that would have a zero-length preview window', () => {
  const result = validateDrillSession({
    drillSettings: normalizeDrillSettings({ drillType: 'PLANNED' }),
    cueSettings,
    enabledCues: allCues,
    config: { ...config, restTime: 0 },
  });
  assert.equal(result.isValid, false);
  assert.equal(result.isValid ? '' : result.error, 'PREVIEW_WINDOW_EMPTY');

  const singleRound = validateDrillSession({
    drillSettings: normalizeDrillSettings({ drillType: 'PLANNED' }),
    cueSettings,
    enabledCues: allCues,
    config: { ...config, restTime: 0, rounds: 1 },
  });
  assert.equal(singleRound.isValid, true);
});

test('alternating rounds are planned on odd rounds and reactive on even rounds', () => {
  const sessionPlan = plan({ drillType: 'ALTERNATING' });
  assert.equal(sessionPlan.drillType, 'ALTERNATING');
  assert.deepEqual(
    sessionPlan.rounds.map((round) => [round.condition, Boolean(round.preview)]),
    [
      ['PLANNED', true],
      ['REACTIVE', false],
      ['PLANNED', true],
      ['REACTIVE', false],
    ]
  );
  assert.equal(sessionPlan.rounds[1].events[0].offsetMs, 1500);
});

test('fake-out corrections use a different cue after the configured gap', () => {
  // pick 0.0 -> Left, delay 0.5 -> 1500, fake-out draw 0.0 < 1, correction pick 0.0 -> Right
  const sessionPlan = plan(
    { drillType: 'FAKE_OUT', fakeOutProbability: 1, correctionGapMs: 800 },
    { random: sequence(0, 0.5, 0, 0), config: { ...config, rounds: 1 } }
  );
  const [round] = sessionPlan.rounds;
  assert.equal(round.condition, 'FAKE_OUT');
  assert.equal(round.fakeOut, true);
  assert.deepEqual(
    round.events.map(({ label, offsetMs, role }) => ({ label, offsetMs, role })),
    [
      { label: 'Left', offsetMs: 1500, role: 'INITIAL' },
      { label: 'Right', offsetMs: 2300, role: 'CORRECTION' },
    ]
  );
});

test('fake-out probability 0 never corrects and each correction differs from its first cue', () => {
  const never = plan(
    { drillType: 'FAKE_OUT', fakeOutProbability: 0 },
    { random: sequence(0.3, 0.6, 0) }
  );
  assert.ok(never.rounds.every((round) => !round.fakeOut && round.events.length === 1));
  assert.ok(never.rounds.every((round) => round.events[0].role === 'TARGET'));

  const always = plan(
    { drillType: 'FAKE_OUT', fakeOutProbability: 1 },
    {
      random: sequence(0.9, 0.2, 0.4, 0.9, 0.1),
      enabledCues: ['Left', 'Right'],
      config: { ...config, rounds: 12 },
    }
  );
  always.rounds.forEach((round) => {
    assert.equal(round.fakeOut, true);
    assert.notEqual(round.events[0].label, round.events[1].label);
  });
  assertNoTripleRepeats(movementLabels(always));
});

test('validates the full fake-out schedule instead of truncating corrections', () => {
  const validate = (workTime: number, enabledCues = allCues) =>
    validateDrillSession({
      drillSettings: normalizeDrillSettings({ drillType: 'FAKE_OUT', correctionGapMs: 800 }),
      cueSettings,
      enabledCues,
      config: { ...config, workTime },
    });

  const tooShort = validate(3);
  assert.equal(tooShort.isValid ? '' : tooShort.error, 'FAKE_OUT_DOES_NOT_FIT');
  assert.equal(validate(4).isValid, true); // 2500 + 800 <= 3500
  const oneCue = validate(5, ['Left']);
  assert.equal(oneCue.isValid ? '' : oneCue.error, 'FAKE_OUT_NEEDS_TWO_CUES');
});

test('chain rounds sample every interval from the shared range and must fit before Start', () => {
  const chainConfig = { ...config, workTime: 8 };
  const sessionPlan = plan(
    { drillType: 'CHAIN', chainCueCount: 3 },
    { config: chainConfig, random: sequence(0, 0.99999, 0.4, 0.99999, 0.8, 0.99999) }
  );
  sessionPlan.rounds.forEach((round) => {
    assert.equal(round.condition, 'CHAIN');
    assert.equal(round.events.length, 3);
    assert.deepEqual(
      round.events.map((event) => event.role),
      ['CHAIN_STEP', 'CHAIN_STEP', 'CHAIN_STEP']
    );
    assert.deepEqual(
      round.events.map((event) => event.offsetMs),
      [2500, 5000, 7500]
    );
  });

  const validate = (workTime: number, chainCueCount: number) =>
    validateDrillSession({
      drillSettings: normalizeDrillSettings({ drillType: 'CHAIN', chainCueCount }),
      cueSettings,
      enabledCues: allCues,
      config: { ...config, workTime },
    });
  assert.equal(validate(8, 3).isValid, true);
  const shortWork = validate(7, 2);
  assert.equal(shortWork.isValid ? '' : shortWork.error, 'CHAIN_WORK_TOO_SHORT');
});

test('anti-streak applies across chain cues in session order', () => {
  const sessionPlan = plan(
    { drillType: 'CHAIN', chainCueCount: 3 },
    {
      config: { ...config, workTime: 8, rounds: 6 },
      random: sequence(0),
      enabledCues: ['Left', 'Right'],
    }
  );
  const labels = movementLabels(sessionPlan);
  assert.equal(labels.length, 18);
  assertNoTripleRepeats(labels);
});

test('converts rounds into runtime cue plans that stay silent for planned WORK entry', () => {
  const planned = plan({ drillType: 'PLANNED' }).rounds[0];
  const runtime = toIntervalCuePlan(planned);
  assert.equal(runtime.announcement, 'Go');
  assert.equal(runtime.currentExercise, planned.events[0].label);
  assert.deepEqual(runtime.cuePlan, [
    {
      id: 1,
      eventId: 's1-r1-e1',
      label: planned.events[0].label,
      offsetMs: 0,
      role: 'TARGET',
      speak: false,
    },
  ]);

  const fakeOut = plan(
    { drillType: 'FAKE_OUT', fakeOutProbability: 1 },
    { random: sequence(0, 0.5, 0, 0) }
  ).rounds[0];
  const fakeOutRuntime = toIntervalCuePlan(fakeOut);
  assert.equal(fakeOutRuntime.currentExercise, 'Right');
  assert.deepEqual(
    fakeOutRuntime.cuePlan.map((cue) => [cue.id, cue.role, cue.speak]),
    [
      [1, 'INITIAL', true],
      [2, 'CORRECTION', true],
    ]
  );
});

test('finds a due preview only for an actual upcoming planned round, once', () => {
  const sessionPlan = plan({ drillType: 'ALTERNATING' });
  const due = (
    phase: TimerPhase,
    currentRound: number,
    timeRemaining: number,
    done = new Set<string>()
  ) => getDueRoundPreview(sessionPlan, config, phase, currentRound, timeRemaining, done)?.id;

  assert.equal(due(TimerPhase.PREP, 1, 4), undefined);
  assert.equal(due(TimerPhase.PREP, 1, 3), 's1-r1');
  assert.equal(due(TimerPhase.PREP, 1, 1), 's1-r1');
  assert.equal(due(TimerPhase.PREP, 1, 3, new Set(['s1-r1'])), undefined);
  assert.equal(due(TimerPhase.REST, 1, 3), undefined); // round 2 is reactive
  assert.equal(due(TimerPhase.REST, 2, 3), 's1-r3');
  assert.equal(due(TimerPhase.REST, 4, 3), undefined); // final rest
  assert.equal(due(TimerPhase.WORK, 2, 3), undefined);
  assert.equal(due(TimerPhase.REST, 2, 0), undefined);
});

test('identifies the countdown second that a preview replaces', () => {
  const sessionPlan = plan({ drillType: 'PLANNED' });
  assert.equal(isPreviewSecond(sessionPlan, config, TimerPhase.REST, 1, 3), true);
  assert.equal(isPreviewSecond(sessionPlan, config, TimerPhase.REST, 1, 2), false);
  assert.equal(isPreviewSecond(sessionPlan, config, TimerPhase.REST, 4, 3), false);
  assert.equal(
    isPreviewSecond(plan({ drillType: 'REACTIVE' }), config, TimerPhase.REST, 1, 3),
    false
  );
});
