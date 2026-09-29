import assert from 'node:assert/strict';
import test from 'node:test';
import type { SessionConfigSnapshot, WorkoutHistoryItem } from '../types.ts';
import { buildSessionPlan, normalizeDrillSettings } from './drillPlan.ts';
import { normalizeCueSettings } from './cueSettings.ts';
import {
  addCompletedSession,
  buildCompletedHistoryItem,
  buildSessionRecord,
  createSessionId,
} from './sessionHistory.ts';

const snapshot: SessionConfigSnapshot = {
  timerConfig: { prepTime: 10, workTime: 5, restTime: 20, rounds: 2, coolDownTime: 0 },
  enabledCues: ['Left', 'Right'],
  cueSettings: normalizeCueSettings(undefined),
  drillSettings: normalizeDrillSettings({
    drillType: 'ALTERNATING',
    stoppingInstruction: 'Stop within 2 strides',
  }),
  cueOutputMode: 'BOTH',
};

const plan = buildSessionPlan({
  sessionId: 'abc',
  drillSettings: snapshot.drillSettings,
  cueSettings: snapshot.cueSettings,
  enabledCues: snapshot.enabledCues,
  config: snapshot.timerConfig,
  random: () => 0.5,
});

test('records delivered and skipped events, observed offsets and previews separately', () => {
  const record = buildSessionRecord(plan, snapshot, {
    deliveredEvents: new Map([['abc-r1-e1', 12]]),
    deliveredPreviews: new Set(),
  });

  assert.equal(record.planVersion, 1);
  assert.equal(record.drillType, 'ALTERNATING');
  assert.equal(record.stoppingInstruction, 'Stop within 2 strides');
  assert.deepEqual(record.config, snapshot);
  assert.notEqual(record.config.timerConfig, snapshot.timerConfig);

  const [planned, reactive] = record.rounds;
  assert.equal(planned.condition, 'PLANNED');
  assert.deepEqual(planned.events[0], {
    id: 'abc-r1-e1',
    label: plan.rounds[0].events[0].label,
    offsetMs: 0,
    role: 'TARGET',
    status: 'DELIVERED',
    observedOffsetMs: 12,
  });
  assert.equal(planned.preview?.status, 'SKIPPED');
  assert.equal(planned.preview?.phase, 'PREP');
  assert.equal(reactive.condition, 'REACTIVE');
  assert.equal(reactive.preview, undefined);
  assert.equal(reactive.events[0].status, 'SKIPPED');
  assert.equal('observedOffsetMs' in reactive.events[0], false);
});

test('builds a completed history item keyed by the session id', () => {
  const item = buildCompletedHistoryItem({
    plan,
    snapshot,
    log: { deliveredEvents: new Map(), deliveredPreviews: new Set(['abc-r1']) },
    completedAt: new Date('2026-09-24T10:00:00.000Z'),
  });

  assert.equal(item.id, 'abc');
  assert.equal(item.date, '2026-09-24T10:00:00.000Z');
  assert.equal(item.duration, 10 + 5 * 2 + 20 * 2);
  assert.equal(item.mode, 'INTERVAL');
  assert.equal(item.rounds, 2);
  assert.equal(item.drillType, 'ALTERNATING');
  assert.equal(item.session?.rounds[0].preview?.status, 'DELIVERED');
});

test('stores the actual duration of mixed reactive rounds', () => {
  const reactiveSnapshot: SessionConfigSnapshot = {
    ...snapshot,
    timerConfig: { ...snapshot.timerConfig, workTime: 8 },
    enabledCues: ['Left', 'Right', 'Run', 'Come Back'],
    drillSettings: normalizeDrillSettings({ drillType: 'OPEN_REACTIVE' }),
  };
  const reactivePlan = buildSessionPlan({
    sessionId: 'mixed',
    drillSettings: reactiveSnapshot.drillSettings,
    cueSettings: reactiveSnapshot.cueSettings,
    enabledCues: reactiveSnapshot.enabledCues,
    config: reactiveSnapshot.timerConfig,
    random: (() => {
      const draws = [0, 0, 0.75, 0, 0, 0.25, 0, 0];
      let index = 0;
      return () => draws[index++] ?? 0;
    })(),
  });
  assert.deepEqual(
    reactivePlan.rounds.map((round) => round.events.length),
    [1, 2]
  );

  const item = buildCompletedHistoryItem({
    plan: reactivePlan,
    snapshot: reactiveSnapshot,
    log: { deliveredEvents: new Map(), deliveredPreviews: new Set() },
    completedAt: new Date('2026-09-24T10:00:00.000Z'),
  });
  assert.equal(item.duration, 10 + 5 + 8 + 20 * 2);
});

test('saves a completed session once even if completion is reported twice', () => {
  const legacy: WorkoutHistoryItem[] = [{ date: '2025-01-01T00:00:00.000Z', duration: 60 }];
  const item = { id: 'abc', date: '2026-09-24T10:00:00.000Z', duration: 70 };

  const once = addCompletedSession(legacy, item);
  assert.deepEqual(once, [item, ...legacy]);
  assert.equal(addCompletedSession(once, { ...item, duration: 999 }), once);
});

test('creates distinct session ids from the injected clock and random source', () => {
  assert.equal(
    createSessionId(0, () => 0),
    '0-0000'
  );
  assert.notEqual(
    createSessionId(1000, () => 0.1),
    createSessionId(1000, () => 0.2)
  );
});
