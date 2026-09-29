import assert from 'node:assert/strict';
import test from 'node:test';
import type { SessionConfigSnapshot, WorkoutHistoryItem } from '../types.ts';
import { normalizeCueSettings } from './cueSettings.ts';
import { buildSessionPlan, normalizeDrillSettings } from './drillPlan.ts';
import type { DrillType } from '../types.ts';
import { buildCompletedHistoryItem } from './sessionHistory.ts';
import { attachRoundLogs, applySessionNotes } from './repLogging.ts';
import { buildReplaySession, checkReplay } from './sessionReplay.ts';

const snapshotFor = (drillType: DrillType): SessionConfigSnapshot => ({
  timerConfig: { prepTime: 10, workTime: 8, restTime: 20, rounds: 4, coolDownTime: 0 },
  enabledCues: ['Left', 'Right', 'Run'],
  cueSettings: normalizeCueSettings({ delayMinMs: 500, delayMaxMs: 2000 }),
  drillSettings: normalizeDrillSettings({
    drillType,
    fakeOutProbability: 0.5,
    chainCueCount: 3,
    stoppingInstruction: 'Cut and continue',
  }),
  cueOutputMode: 'BOTH',
});

let seed = 0;
const seeded = () => {
  let s = (seed += 7);
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const savedSession = (drillType: DrillType, id = `orig-${drillType}`): WorkoutHistoryItem => {
  const snapshot = snapshotFor(drillType);
  const plan = buildSessionPlan({
    sessionId: id,
    drillSettings: snapshot.drillSettings,
    cueSettings: snapshot.cueSettings,
    enabledCues: snapshot.enabledCues,
    config: snapshot.timerConfig,
    random: seeded(),
  });
  const deliveredEvents = new Map(
    plan.rounds.flatMap((round) => round.events.map((event) => [event.id, event.offsetMs + 3]))
  );
  const item = buildCompletedHistoryItem({
    plan,
    snapshot,
    log: { deliveredEvents, deliveredPreviews: new Set(plan.rounds.map((r) => r.id)) },
    completedAt: new Date('2026-09-20T10:00:00.000Z'),
  });
  const logged = attachRoundLogs(
    item,
    new Map([[`${id}-r1`, { outcome: 'CLEAN' as const, selfReportedTimeMs: 1500 }]])
  );
  return applySessionNotes([logged], id, { text: 'felt fast' })[0];
};

const eventShape = (item: WorkoutHistoryItem) =>
  item.session!.rounds.map((round) => ({
    condition: round.condition,
    fakeOut: round.fakeOut,
    events: round.events.map(({ label, offsetMs, role }) => ({ label, offsetMs, role })),
    preview: round.preview && {
      phase: round.preview.phase,
      offsetMs: round.preview.offsetMs,
      label: round.preview.label,
    },
  }));

test('every drill type replays the exact stored events, roles, conditions and previews', () => {
  for (const drillType of [
    'REACTIVE',
    'OPEN_REACTIVE',
    'PLANNED',
    'ALTERNATING',
    'FAKE_OUT',
    'CHAIN',
  ] as const) {
    const original = savedSession(drillType);
    const replay = buildReplaySession(original, 'new1');
    assert.equal(replay.ok, true, drillType);
    if (!replay.ok) continue;

    const planShape = replay.plan.rounds.map((round) => ({
      condition: round.condition,
      fakeOut: round.fakeOut,
      events: round.events.map(({ label, offsetMs, role }) => ({ label, offsetMs, role })),
      preview: round.preview && {
        phase: round.preview.phase,
        offsetMs: round.preview.offsetMs,
        label: round.preview.label,
      },
    }));
    assert.deepEqual(planShape, eventShape(original), drillType);
    assert.equal(replay.plan.sessionId, 'new1');
    assert.equal(replay.plan.drillType, drillType);
    assert.equal(replay.plan.stoppingInstruction, 'Cut and continue');
    assert.ok(replay.plan.rounds.every((round) => round.id.startsWith('new1-')));
    assert.ok(
      replay.plan.rounds.every((round) => round.events.every((e) => e.id.startsWith(round.id)))
    );
    assert.deepEqual(replay.snapshot, original.session!.config);
  }
});

test('the replay record gets a new id, a replay link and no copied outcomes, times or notes', () => {
  const original = savedSession('FAKE_OUT', 'orig-x');
  const replay = buildReplaySession(original, 'new2');
  assert.ok(replay.ok);
  if (!replay.ok) return;
  assert.equal(replay.replayOfSessionId, 'orig-x');

  const record = buildCompletedHistoryItem({
    plan: replay.plan,
    snapshot: replay.snapshot,
    log: { deliveredEvents: new Map(), deliveredPreviews: new Set() },
    completedAt: new Date('2026-09-21T10:00:00.000Z'),
    replayOfSessionId: replay.replayOfSessionId,
  });
  assert.equal(record.id, 'new2');
  assert.equal(record.replayOfSessionId, 'orig-x');
  assert.equal(record.notes, undefined);
  assert.ok(
    record.session!.rounds.every(
      (round) => round.outcome === undefined && round.selfReportedTimeMs === undefined
    )
  );
  assert.equal(original.session!.rounds[0].outcome, 'CLEAN');
});

test('the replay configuration is frozen and independent of the saved record', () => {
  const original = savedSession('REACTIVE', 'orig-f');
  const replay = buildReplaySession(original, 'new3');
  assert.ok(replay.ok);
  if (!replay.ok) return;
  assert.ok(Object.isFrozen(replay.snapshot));
  assert.ok(Object.isFrozen(replay.snapshot.cueSettings.cueWeights));
  assert.throws(() => {
    (replay.snapshot.timerConfig as { workTime: number }).workTime = 99;
  });
  original.session!.config.timerConfig.workTime = 42;
  assert.equal(replay.snapshot.timerConfig.workTime, 8);
});

test('summary-only and id-less records report replay unavailable', () => {
  const legacy: WorkoutHistoryItem = { date: '2025-01-01T00:00:00.000Z', duration: 300 };
  const check = checkReplay(legacy);
  assert.equal(check.replayable, false);
  if (!check.replayable) assert.match(check.reason, /cue plan/);

  const noId = savedSession('REACTIVE', 'orig-n');
  delete noId.id;
  assert.equal(checkReplay(noId).replayable, false);
});

test('corrupted plans are refused with a reason, never silently changed', () => {
  const corruptions: Array<[string, (item: WorkoutHistoryItem) => void]> = [
    ['plan version', (item) => ((item.session as { planVersion: number }).planVersion = 2)],
    ['round count', (item) => item.session!.rounds.pop()],
    ['round order', (item) => (item.session!.rounds[1].roundNumber = 3)],
    ['unknown cue', (item) => (item.session!.rounds[0].events[0].label = 'Jump')],
    ['disabled cue', (item) => (item.session!.rounds[0].events[0].label = 'Come Back')],
    ['offset past work', (item) => (item.session!.rounds[0].events[0].offsetMs = 7600)],
    ['negative offset', (item) => (item.session!.rounds[0].events[0].offsetMs = -1)],
    ['non-integer offset', (item) => (item.session!.rounds[0].events[0].offsetMs = 1.5)],
    ['wrong role', (item) => (item.session!.rounds[0].events[0].role = 'CHAIN_STEP')],
    ['no events', (item) => (item.session!.rounds[0].events = [])],
    ['condition', (item) => (item.session!.rounds[0].condition = 'PLANNED')],
    ['drill mismatch', (item) => (item.session!.drillType = 'CHAIN')],
    ['config', (item) => (item.session!.config.timerConfig.rounds = 0)],
    [
      'stray preview',
      (item) => {
        item.session!.rounds[0].preview = {
          phase: 'PREP',
          offsetMs: 0,
          label: 'Left',
          status: 'DELIVERED',
        };
      },
    ],
  ];
  for (const [name, corrupt] of corruptions) {
    const item = savedSession('REACTIVE', `orig-c-${name}`);
    item.session!.rounds.forEach((round) => (round.events[0].label = 'Left'));
    assert.equal(checkReplay(item).replayable, true, `baseline ${name}`);
    corrupt(item);
    const check = checkReplay(item);
    assert.equal(check.replayable, false, name);
    if (!check.replayable) assert.ok(check.reason.length > 0);
  }
});

test('multi-event and planned corruptions are refused', () => {
  const fake = savedSession('FAKE_OUT', 'orig-fk');
  const corrected = fake.session!.rounds.find((round) => round.fakeOut);
  assert.ok(corrected, 'seed should draw at least one correction');
  corrected!.events[1].label = corrected!.events[0].label;
  assert.equal(checkReplay(fake).replayable, false);

  const chain = savedSession('CHAIN', 'orig-ch');
  chain.session!.rounds[0].events.pop();
  assert.equal(checkReplay(chain).replayable, false);

  const chainOrder = savedSession('CHAIN', 'orig-ch2');
  const [a, b] = chainOrder.session!.rounds[0].events;
  [a.offsetMs, b.offsetMs] = [b.offsetMs, a.offsetMs];
  assert.equal(checkReplay(chainOrder).replayable, false);

  const planned = savedSession('PLANNED', 'orig-pl');
  planned.session!.rounds[1].preview!.label =
    'Run' === planned.session!.rounds[1].events[0].label ? 'Left' : 'Run';
  assert.equal(checkReplay(planned).replayable, false);

  const noPreview = savedSession('PLANNED', 'orig-pl2');
  delete noPreview.session!.rounds[0].preview;
  assert.equal(checkReplay(noPreview).replayable, false);
});
