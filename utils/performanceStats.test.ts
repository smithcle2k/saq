import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  CueEventStatus,
  CueOutputMode,
  DrillType,
  RepOutcome,
  RoundCondition,
  SessionCueEventRecord,
  SessionRoundRecord,
  WorkoutHistoryItem,
} from '../types.ts';
import {
  classifyDelay,
  compareConditions,
  compareEarlyLate,
  extractRepObservations,
  getWeekKey,
  MIN_SAMPLE_SIZE,
  perCueBreakdown,
  summarizeCleanTimes,
  summarizeFakeOuts,
  summarizeOutcomes,
  weeklyConditionGaps,
} from './performanceStats.ts';

interface RoundSpec {
  condition?: RoundCondition;
  label?: string;
  offsetMs?: number;
  outcome?: RepOutcome;
  timeMs?: number;
  delivered?: boolean;
  fakeOut?: 'delivered' | 'skipped';
  chain?: boolean;
}

test('two-cue reactive rounds count under the final target only after both cues arrive', () => {
  const item = session([{ label: 'Left', outcome: 'CLEAN' }], {
    drillType: 'OPEN_REACTIVE',
    workTime: 8,
  });
  const round = item.session!.rounds[0];
  round.condition = 'OPEN_REACTIVE';
  round.events.push({
    id: `${round.id}-e2`,
    label: 'Right',
    offsetMs: 3500,
    role: 'CHANGE',
    status: 'DELIVERED',
  });

  const [rep] = extractRepObservations([item]);
  assert.equal(rep.targetLabel, 'Right');
  assert.equal(rep.targetDelivered, true);
  assert.equal(perCueBreakdown([rep], 'ALL')[0].label, 'Right');

  round.events[0].status = 'SKIPPED';
  assert.equal(extractRepObservations([item])[0].targetDelivered, false);
});

let sessionCounter = 0;

const session = (
  rounds: RoundSpec[],
  {
    drillType = 'REACTIVE',
    date = new Date(2026, 8, 23, 10),
    workTime = 5,
    restTime = 55,
    stoppingInstruction = '',
    cueOutputMode = 'BOTH',
  }: {
    drillType?: DrillType;
    date?: Date;
    workTime?: number;
    restTime?: number;
    stoppingInstruction?: string;
    cueOutputMode?: CueOutputMode;
  } = {}
): WorkoutHistoryItem => {
  const id = `s${++sessionCounter}`;
  return {
    id,
    date: date.toISOString(),
    duration: 60,
    drillType,
    session: {
      planVersion: 1,
      drillType,
      stoppingInstruction,
      config: {
        timerConfig: { prepTime: 10, workTime, restTime, rounds: rounds.length, coolDownTime: 0 },
        enabledCues: ['Left', 'Right'],
        cueSettings: { delayMinMs: 500, delayMaxMs: 2500, cueWeights: {} as never },
        drillSettings: {
          drillType,
          fakeOutProbability: 0.25,
          correctionGapMs: 800,
          chainCueCount: 2,
          stoppingInstruction,
        },
        cueOutputMode,
      },
      rounds: rounds.map((spec, index): SessionRoundRecord => {
        const roundId = `${id}-r${index + 1}`;
        const status: CueEventStatus = spec.delivered === false ? 'SKIPPED' : 'DELIVERED';
        const ev = (
          n: number,
          role: SessionCueEventRecord['role'],
          offsetMs: number,
          eventStatus = status
        ): SessionCueEventRecord => ({
          id: `${roundId}-e${n}`,
          label: spec.label ?? 'Left',
          offsetMs,
          role,
          status: eventStatus,
        });
        const condition = spec.chain
          ? 'CHAIN'
          : spec.fakeOut
            ? 'FAKE_OUT'
            : (spec.condition ?? (drillType === 'FAKE_OUT' ? 'FAKE_OUT' : 'REACTIVE'));
        const events = spec.chain
          ? [ev(1, 'CHAIN_STEP', 1000), ev(2, 'CHAIN_STEP', 2000)]
          : spec.fakeOut
            ? [
                ev(1, 'INITIAL', 1000),
                ev(2, 'CORRECTION', 1800, spec.fakeOut === 'delivered' ? 'DELIVERED' : 'SKIPPED'),
              ]
            : [ev(1, 'TARGET', condition === 'PLANNED' ? 0 : (spec.offsetMs ?? 1200))];
        return {
          id: roundId,
          roundNumber: index + 1,
          condition,
          fakeOut: Boolean(spec.fakeOut),
          events,
          ...(spec.outcome ? { outcome: spec.outcome } : {}),
          ...(spec.timeMs !== undefined ? { selfReportedTimeMs: spec.timeMs } : {}),
        };
      }),
    },
  };
};

const repeat = (count: number, spec: RoundSpec) => Array.from({ length: count }, () => spec);

test('clean percentage excludes not-logged rounds and reports coverage', () => {
  const reps = extractRepObservations([
    session([
      { outcome: 'CLEAN' },
      { outcome: 'CLEAN' },
      { outcome: 'CLEAN' },
      { outcome: 'WRONG_FIRST_STEP' },
      { outcome: 'MISSED_STOPPED' },
      {},
      {},
      {},
    ]),
  ]);
  const summary = summarizeOutcomes(reps);
  assert.equal(summary.eligible, 8);
  assert.equal(summary.logged, 5);
  assert.equal(summary.clean, 3);
  assert.equal(summary.wrongFirstStep, 1);
  assert.equal(summary.missedStopped, 1);
  assert.equal(summary.cleanPct, 60); // 3 / 5
  assert.equal(summary.coveragePct, 62.5); // 5 / 8
  assert.equal(summary.sufficient, true);
});

test('four logged reps are not enough; five are', () => {
  assert.equal(MIN_SAMPLE_SIZE, 5);
  const four = summarizeOutcomes(
    extractRepObservations([session(repeat(4, { outcome: 'CLEAN' }))])
  );
  assert.equal(four.sufficient, false);
  assert.equal(four.cleanPct, 100); // value still computed; UI hides it below threshold
  const five = summarizeOutcomes(
    extractRepObservations([session(repeat(5, { outcome: 'CLEAN' }))])
  );
  assert.equal(five.sufficient, true);
});

test('empty, legacy and unlogged history produce no percentages and no invented data', () => {
  const legacy: WorkoutHistoryItem[] = [
    { date: '2025-01-01T00:00:00.000Z', duration: 60 },
    { date: '2025-01-02T00:00:00.000Z', duration: 60, mode: 'INTERVAL', rounds: 8 },
  ];
  assert.deepEqual(extractRepObservations(legacy), []);
  const empty = summarizeOutcomes([]);
  assert.equal(empty.eligible, 0);
  assert.equal(empty.cleanPct, null);
  assert.equal(empty.coveragePct, null);

  const unlogged = summarizeOutcomes(extractRepObservations([session(repeat(6, {}))]));
  assert.equal(unlogged.eligible, 6);
  assert.equal(unlogged.logged, 0);
  assert.equal(unlogged.cleanPct, null);
  assert.equal(unlogged.coveragePct, 0);
  assert.equal(unlogged.sufficient, false);
});

test('average time uses only finite positive times on clean reps, with its own n', () => {
  const reps = extractRepObservations([
    session([
      { outcome: 'CLEAN', timeMs: 1000 },
      { outcome: 'CLEAN', timeMs: 2000 },
      { outcome: 'CLEAN', timeMs: 1500 },
      { outcome: 'CLEAN', timeMs: 1200 },
      { outcome: 'CLEAN', timeMs: 1300 },
      { outcome: 'CLEAN' }, // clean but untimed
      { outcome: 'WRONG_FIRST_STEP', timeMs: 900 }, // unsuccessful: excluded
      { timeMs: 800 }, // not logged: excluded
      { outcome: 'CLEAN', timeMs: 0 },
      { outcome: 'CLEAN', timeMs: -5 },
      { outcome: 'CLEAN', timeMs: Number.NaN },
    ]),
  ]);
  const times = summarizeCleanTimes(reps);
  assert.equal(times.timedN, 5);
  assert.equal(times.meanMs, 1400); // (1000+2000+1500+1200+1300)/5
  assert.equal(times.sufficient, true);
  assert.equal(summarizeCleanTimes(reps.slice(0, 4)).sufficient, false);
});

test('per-cue breakdown counts delivered single-target Planned/Reactive reps only', () => {
  const reps = extractRepObservations([
    session(
      [
        { condition: 'PLANNED', label: 'Left', outcome: 'CLEAN' },
        { condition: 'REACTIVE', label: 'Left', outcome: 'WRONG_FIRST_STEP' },
        { condition: 'PLANNED', label: 'Right', outcome: 'CLEAN' },
        { condition: 'REACTIVE', label: 'Right', outcome: 'CLEAN', delivered: false },
      ],
      { drillType: 'ALTERNATING' }
    ),
    session([{ chain: true, outcome: 'CLEAN' }], { drillType: 'CHAIN' }),
    session(
      [
        { fakeOut: 'delivered', outcome: 'CLEAN' },
        { label: 'Left', outcome: 'CLEAN' },
      ],
      {
        drillType: 'FAKE_OUT',
      }
    ),
  ]);

  const all = perCueBreakdown(reps, 'ALL');
  assert.deepEqual(
    all.map((row) => [row.label, row.outcomes.eligible, row.outcomes.logged, row.outcomes.clean]),
    [
      ['Left', 2, 2, 1],
      ['Right', 1, 1, 1],
    ]
  );
  const reactiveOnly = perCueBreakdown(reps, 'REACTIVE');
  assert.deepEqual(
    reactiveOnly.map((row) => [row.label, row.outcomes.eligible]),
    [['Left', 1]]
  );
});

test('planned vs reactive compares matching cue and protocol, with signed gaps', () => {
  const alternating = (label: string, planned: RoundSpec, reactive: RoundSpec, count: number) =>
    session(
      Array.from({ length: count * 2 }, (_, i) =>
        i % 2 === 0
          ? { ...planned, condition: 'PLANNED' as const, label }
          : { ...reactive, condition: 'REACTIVE' as const, label }
      ),
      { drillType: 'ALTERNATING' }
    );
  const history = [
    // Left: planned 5/5 clean at 1.0 s; reactive 4/5 clean, clean reps at 1.3 s.
    alternating('Left', { outcome: 'CLEAN', timeMs: 1000 }, { outcome: 'CLEAN', timeMs: 1300 }, 4),
    session(
      [
        { condition: 'PLANNED', label: 'Left', outcome: 'CLEAN', timeMs: 1000 },
        { condition: 'REACTIVE', label: 'Left', outcome: 'MISSED_STOPPED', timeMs: 5000 },
      ],
      { drillType: 'ALTERNATING' }
    ),
    // Same cue but a different work time: its own group, never blended.
    session([{ condition: 'PLANNED', label: 'Left', outcome: 'CLEAN' }], {
      drillType: 'PLANNED',
      workTime: 8,
    }),
  ];

  const groups = compareConditions(extractRepObservations(history), 'ALL');
  assert.equal(groups.length, 2);
  const [main, other] = groups;
  assert.equal(main.protocol.cue, 'Left');
  assert.equal(main.protocol.workTime, 5);
  assert.equal(main.planned.outcomes.logged, 5);
  assert.equal(main.planned.outcomes.cleanPct, 100);
  assert.equal(main.reactive.outcomes.logged, 5);
  assert.equal(main.reactive.outcomes.cleanPct, 80);
  assert.equal(main.cleanGapPp, -20); // reactive − planned
  assert.equal(main.planned.times.timedN, 5);
  assert.equal(main.reactive.times.timedN, 4); // the missed rep's time is excluded
  assert.equal(main.timeGapSeconds, null); // reactive timed n = 4 < 5

  assert.equal(other.protocol.workTime, 8);
  assert.equal(other.cleanGapPp, null);
  assert.equal(other.reactive.outcomes.eligible, 0);
});

test('time gap is reactive mean minus planned mean in seconds when both sides have 5 timed', () => {
  const history = [
    session([
      ...repeat(5, { condition: 'PLANNED', outcome: 'CLEAN', timeMs: 1000 }),
      ...repeat(6, { condition: 'REACTIVE', outcome: 'CLEAN', timeMs: 1250 }),
    ]),
  ];
  const [group] = compareConditions(extractRepObservations(history), 'ALL');
  assert.equal(group.timeGapSeconds, 0.25);
  assert.equal(group.cleanGapPp, 0);
  assert.equal(group.reactive.outcomes.logged, 6); // unequal group sizes are fine
});

test('within-Alternating filter excludes planned or reactive reps from other drills', () => {
  const history = [
    session([{ condition: 'PLANNED', outcome: 'CLEAN' }], { drillType: 'PLANNED' }),
    session(
      [
        { condition: 'PLANNED', outcome: 'CLEAN' },
        { condition: 'REACTIVE', outcome: 'CLEAN' },
      ],
      { drillType: 'ALTERNATING' }
    ),
  ];
  const [all] = compareConditions(extractRepObservations(history), 'ALL');
  assert.equal(all.planned.outcomes.eligible, 2);
  const [alt] = compareConditions(extractRepObservations(history), 'ALTERNATING_ONLY');
  assert.equal(alt.planned.outcomes.eligible, 1);
});

test('weeks start Monday, keys include the year, and missing weeks stay missing', () => {
  // Thu 1 Jan 2026 belongs to the week starting Mon 29 Dec 2025.
  assert.equal(getWeekKey(new Date(2026, 0, 1, 12)), '2025-12-29');
  assert.equal(getWeekKey(new Date(2025, 11, 29, 0, 0)), '2025-12-29');
  assert.equal(getWeekKey(new Date(2025, 11, 28, 23, 59)), '2025-12-22'); // Sunday
  // Same weekday label, different year → different key.
  assert.notEqual(getWeekKey(new Date(2025, 8, 22)), getWeekKey(new Date(2026, 8, 21)));

  const pair = (date: Date, reactiveOutcome: RepOutcome) =>
    session(
      [
        ...repeat(5, { condition: 'PLANNED', outcome: 'CLEAN' }),
        ...repeat(5, { condition: 'REACTIVE', outcome: reactiveOutcome }),
      ],
      { date }
    );
  const history = [
    pair(new Date(2026, 0, 1), 'CLEAN'),
    pair(new Date(2026, 0, 15), 'WRONG_FIRST_STEP'),
    // Week of 5 Jan has planned data only: plotted as insufficient, not zero.
    session(repeat(5, { condition: 'PLANNED', outcome: 'CLEAN' }), { date: new Date(2026, 0, 6) }),
  ];
  const reps = extractRepObservations(history);
  const [group] = compareConditions(reps, 'ALL');
  const weeks = weeklyConditionGaps(reps, group.key, 'ALL');
  assert.deepEqual(
    weeks.map((week) => [week.weekKey, week.cleanGapPp]),
    [
      ['2025-12-29', 0],
      ['2026-01-05', null],
      ['2026-01-12', -100],
    ]
  );
});

test('delay boundaries: ≤900 Early, ≥1500 Late, between is Middle', () => {
  assert.equal(classifyDelay(300), 'EARLY');
  assert.equal(classifyDelay(900), 'EARLY');
  assert.equal(classifyDelay(901), 'MIDDLE');
  assert.equal(classifyDelay(1499), 'MIDDLE');
  assert.equal(classifyDelay(1500), 'LATE');
  assert.equal(classifyDelay(2500), 'LATE');
});

test('early vs late uses recorded reactive delays; planned, skipped and middle are excluded', () => {
  const history = [
    session(
      [
        ...repeat(5, { offsetMs: 800, outcome: 'CLEAN', timeMs: 1000 }),
        ...repeat(5, { offsetMs: 2000, outcome: 'CLEAN', timeMs: 1400 }),
        { offsetMs: 2000, outcome: 'WRONG_FIRST_STEP' },
        ...repeat(2, { offsetMs: 1200, outcome: 'CLEAN' }),
        { offsetMs: 800, outcome: 'CLEAN', delivered: false },
        { condition: 'PLANNED', outcome: 'CLEAN' },
      ],
      { drillType: 'ALTERNATING' }
    ),
  ];
  const [group] = compareEarlyLate(extractRepObservations(history));
  assert.equal(group.early.outcomes.eligible, 5);
  assert.equal(group.late.outcomes.eligible, 6);
  assert.equal(group.middleCount, 2);
  assert.equal(group.early.outcomes.cleanPct, 100);
  assert.equal(Math.round((group.late.outcomes.cleanPct ?? 0) * 100) / 100, 83.33);
  assert.equal(Math.round((group.cleanGapPp ?? 0) * 100) / 100, -16.67); // late − early
  assert.equal(group.timeGapSeconds, 0.4);
});

test('fake-out success counts only logged rounds with a delivered correction', () => {
  const history = [
    session(
      [
        { fakeOut: 'delivered', outcome: 'CLEAN' },
        { fakeOut: 'delivered', outcome: 'CLEAN' },
        { fakeOut: 'delivered', outcome: 'WRONG_FIRST_STEP' },
        { fakeOut: 'delivered' }, // not logged
        { fakeOut: 'skipped', outcome: 'CLEAN' }, // correction not delivered
        { outcome: 'CLEAN' }, // no correction selected
        { outcome: 'CLEAN' },
      ],
      { drillType: 'FAKE_OUT' }
    ),
  ];
  const summary = summarizeFakeOuts(extractRepObservations(history));
  assert.equal(summary.outcomes.eligible, 4);
  assert.equal(summary.outcomes.logged, 3);
  assert.equal(Math.round((summary.outcomes.cleanPct ?? 0) * 100) / 100, 66.67);
  assert.equal(summary.outcomes.sufficient, false);
  assert.equal(summary.noCorrectionRounds, 2);
  assert.equal(summary.undeliveredCorrectionRounds, 1);
});

test('replays are split out of the comparison population and counted', async () => {
  const { splitReplays } = await import('./performanceStats.ts');
  const history = [
    { id: 'a', date: '2026-09-01T00:00:00.000Z', duration: 1 },
    { id: 'b', date: '2026-09-02T00:00:00.000Z', duration: 1, replayOfSessionId: 'a' },
    { date: '2025-01-01T00:00:00.000Z', duration: 1 },
  ];
  const { fresh, replayCount } = splitReplays(history);
  assert.deepEqual(
    fresh.map((item) => item.id),
    ['a', undefined]
  );
  assert.equal(replayCount, 1);
});
