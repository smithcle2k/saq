import { format, startOfWeek } from 'date-fns';
import type {
  CueOutputMode,
  DrillType,
  RepOutcome,
  RoundCondition,
  WorkoutHistoryItem,
} from '../types.ts';
import { getRoundWorkSeconds } from './drillPlan.ts';

/**
 * All figures here are descriptive summaries of self-reported outcomes and
 * self-entered times. None of them is an app-measured reaction time.
 */

/** Minimum observations per group per metric before a value or comparison is shown. */
export const MIN_SAMPLE_SIZE = 5;
/** Reactive scheduled delays at or below this are Early. */
export const EARLY_MAX_DELAY_MS = 900;
/** Reactive scheduled delays at or above this are Late. */
export const LATE_MIN_DELAY_MS = 1500;

export interface ProtocolDescriptor {
  workTime: number;
  restTime: number;
  stoppingInstruction: string;
  cueOutputMode: CueOutputMode;
}

/** One round from a saved session record, flattened for aggregation. */
export interface RepObservation {
  sessionId: string;
  date: Date;
  drillType: DrillType;
  condition: RoundCondition;
  fakeOut: boolean;
  /** Label of the sole TARGET event (Planned/Reactive/no-correction Fake-out rounds). */
  targetLabel?: string;
  targetDelivered: boolean;
  /** Scheduled WORK-relative offset of the TARGET event. */
  targetOffsetMs?: number;
  correctionDelivered: boolean;
  outcome?: RepOutcome;
  selfReportedTimeMs?: number;
  protocol: ProtocolDescriptor;
}

/**
 * Replays repeat a known cue sequence (familiar exposure), so they are split out
 * before any new-reaction comparison. Their count is reported, not hidden.
 */
export const splitReplays = (history: WorkoutHistoryItem[]) => ({
  fresh: history.filter((item) => !item.replayOfSessionId),
  replayCount: history.filter((item) => item.replayOfSessionId).length,
});

/** Legacy summary-only records have no rounds, so they contribute nothing here. */
export const extractRepObservations = (history: WorkoutHistoryItem[]): RepObservation[] =>
  history.flatMap((item) => {
    const session = item.session;
    if (!session) return [];
    const baseProtocol = {
      restTime: session.config.timerConfig.restTime,
      stoppingInstruction: session.stoppingInstruction,
      cueOutputMode: session.config.cueOutputMode,
    };
    const date = new Date(item.date);
    return session.rounds.map((round): RepObservation => {
      const protocol: ProtocolDescriptor = {
        ...baseProtocol,
        workTime: getRoundWorkSeconds(round, session.config.timerConfig.workTime),
      };
      const firstTarget = round.events.find((event) => event.role === 'TARGET');
      const change = round.events.find((event) => event.role === 'CHANGE');
      const target = change ?? firstTarget;
      const correction = round.events.find((event) => event.role === 'CORRECTION');
      return {
        sessionId: item.id ?? item.date,
        date,
        drillType: session.drillType,
        condition: round.condition,
        fakeOut: round.fakeOut,
        targetLabel: target?.label,
        targetDelivered:
          target?.status === 'DELIVERED' && (!change || firstTarget?.status === 'DELIVERED'),
        targetOffsetMs: target?.offsetMs,
        correctionDelivered: correction?.status === 'DELIVERED',
        outcome: round.outcome,
        selfReportedTimeMs: round.selfReportedTimeMs,
        protocol,
      };
    });
  });

export interface OutcomeSummary {
  /** Rounds in the population, logged or not. */
  eligible: number;
  logged: number;
  clean: number;
  wrongFirstStep: number;
  missedStopped: number;
  /** clean / logged × 100; null when nothing is logged. */
  cleanPct: number | null;
  /** logged / eligible × 100; null for an empty population. */
  coveragePct: number | null;
  /** logged ≥ MIN_SAMPLE_SIZE. */
  sufficient: boolean;
}

export const summarizeOutcomes = (reps: RepObservation[]): OutcomeSummary => {
  const count = (outcome: RepOutcome) => reps.filter((rep) => rep.outcome === outcome).length;
  const clean = count('CLEAN');
  const wrongFirstStep = count('WRONG_FIRST_STEP');
  const missedStopped = count('MISSED_STOPPED');
  const logged = clean + wrongFirstStep + missedStopped;
  return {
    eligible: reps.length,
    logged,
    clean,
    wrongFirstStep,
    missedStopped,
    cleanPct: logged > 0 ? (clean / logged) * 100 : null,
    coveragePct: reps.length > 0 ? (logged / reps.length) * 100 : null,
    sufficient: logged >= MIN_SAMPLE_SIZE,
  };
};

export interface TimeSummary {
  /** Clean reps with a finite positive self-entered time. */
  timedN: number;
  meanMs: number | null;
  /** timedN ≥ MIN_SAMPLE_SIZE. */
  sufficient: boolean;
}

const isValidTime = (timeMs: number | undefined): timeMs is number =>
  typeof timeMs === 'number' && Number.isFinite(timeMs) && timeMs > 0;

/** Mean self-entered time on clean reps only; unsuccessful reps never enter the average. */
export const summarizeCleanTimes = (reps: RepObservation[]): TimeSummary => {
  const times = reps
    .filter((rep) => rep.outcome === 'CLEAN')
    .map((rep) => rep.selfReportedTimeMs)
    .filter(isValidTime);
  return {
    timedN: times.length,
    meanMs: times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : null,
    sufficient: times.length >= MIN_SAMPLE_SIZE,
  };
};

export interface GroupStats {
  outcomes: OutcomeSummary;
  times: TimeSummary;
}

const groupStats = (reps: RepObservation[]): GroupStats => ({
  outcomes: summarizeOutcomes(reps),
  times: summarizeCleanTimes(reps),
});

/** b − a in percentage points, only when both sides have enough logged reps. */
const cleanGap = (a: GroupStats, b: GroupStats) =>
  a.outcomes.sufficient && b.outcomes.sufficient
    ? (b.outcomes.cleanPct as number) - (a.outcomes.cleanPct as number)
    : null;

/** b − a in seconds, only when both sides have enough timed clean reps. */
const timeGap = (a: GroupStats, b: GroupStats) =>
  a.times.sufficient && b.times.sufficient
    ? ((b.times.meanMs as number) - (a.times.meanMs as number)) / 1000
    : null;

export type SingleTargetFilter = 'ALL' | 'PLANNED' | 'REACTIVE';

/**
 * Per-cue population: delivered Planned or Reactive reps. A two-cue reactive
 * round is attributed to its final changed target, and needs both cues delivered.
 */
const isSingleTargetRep = (rep: RepObservation) =>
  (rep.condition === 'PLANNED' ||
    rep.condition === 'REACTIVE' ||
    rep.condition === 'OPEN_REACTIVE') &&
  rep.targetDelivered &&
  rep.targetLabel !== undefined;

export interface CueBreakdownRow extends GroupStats {
  label: string;
}

export const perCueBreakdown = (
  reps: RepObservation[],
  filter: SingleTargetFilter
): CueBreakdownRow[] => {
  const byLabel = new Map<string, RepObservation[]>();
  reps
    .filter(isSingleTargetRep)
    .filter((rep) => filter === 'ALL' || rep.condition === filter)
    .forEach((rep) => {
      const label = rep.targetLabel as string;
      byLabel.set(label, [...(byLabel.get(label) ?? []), rep]);
    });
  return Array.from(byLabel.entries()).map(([label, group]) => ({
    label,
    ...groupStats(group),
  }));
};

export type ComparisonSource = 'ALL' | 'ALTERNATING_ONLY';

export interface ConditionProtocol extends ProtocolDescriptor {
  cue: string;
}

export interface ConditionComparison {
  key: string;
  protocol: ConditionProtocol;
  planned: GroupStats;
  reactive: GroupStats;
  /** Reactive clean % − planned clean %, in percentage points. */
  cleanGapPp: number | null;
  /** Reactive mean − planned mean, in seconds. */
  timeGapSeconds: number | null;
}

const protocolKey = (protocol: ProtocolDescriptor) =>
  JSON.stringify([
    protocol.workTime,
    protocol.restTime,
    protocol.stoppingInstruction,
    protocol.cueOutputMode,
  ]);

const conditionKey = (rep: RepObservation) =>
  JSON.stringify([rep.targetLabel, protocolKey(rep.protocol)]);

const conditionReps = (reps: RepObservation[], source: ComparisonSource) =>
  reps
    .filter(isSingleTargetRep)
    .filter((rep) => source === 'ALL' || rep.drillType === 'ALTERNATING');

const groupBy = <T>(items: T[], key: (item: T) => string) => {
  const groups = new Map<string, T[]>();
  items.forEach((item) => {
    const k = key(item);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  });
  return groups;
};

const byLoggedDesc = (a: { total: number }, b: { total: number }) => b.total - a.total;

const compareConditionGroup = (key: string, group: RepObservation[]): ConditionComparison => {
  const planned = groupStats(group.filter((rep) => rep.condition === 'PLANNED'));
  const reactive = groupStats(group.filter((rep) => rep.condition === 'REACTIVE'));
  return {
    key,
    protocol: { ...group[0].protocol, cue: group[0].targetLabel as string },
    planned,
    reactive,
    cleanGapPp: cleanGap(planned, reactive),
    timeGapSeconds: timeGap(planned, reactive),
  };
};

/**
 * Planned vs Reactive, grouped by matching cue, work/rest times, stopping
 * instruction and output mode. Groups are ordered by total logged reps.
 */
export const compareConditions = (
  reps: RepObservation[],
  source: ComparisonSource
): ConditionComparison[] =>
  Array.from(groupBy(conditionReps(reps, source), conditionKey).entries())
    .map(([key, group]) => compareConditionGroup(key, group))
    .map((comparison) => ({
      comparison,
      total: comparison.planned.outcomes.logged + comparison.reactive.outcomes.logged,
    }))
    .sort(byLoggedDesc)
    .map(({ comparison }) => comparison);

/** Monday-start local calendar week, keyed by its year-inclusive start date. */
export const getWeekKey = (date: Date) =>
  format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

export interface WeeklyConditionGap extends ConditionComparison {
  weekKey: string;
  weekStart: Date;
}

/** Only weeks with data for the group appear; gaps need enough data on both sides that week. */
export const weeklyConditionGaps = (
  reps: RepObservation[],
  groupKey: string,
  source: ComparisonSource
): WeeklyConditionGap[] => {
  const group = conditionReps(reps, source).filter((rep) => conditionKey(rep) === groupKey);
  return Array.from(groupBy(group, (rep) => getWeekKey(rep.date)).entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, weekReps]) => ({
      ...compareConditionGroup(groupKey, weekReps),
      weekKey,
      weekStart: startOfWeek(weekReps[0].date, { weekStartsOn: 1 }),
    }));
};

export type DelayBucket = 'EARLY' | 'MIDDLE' | 'LATE';

export const classifyDelay = (offsetMs: number): DelayBucket =>
  offsetMs <= EARLY_MAX_DELAY_MS ? 'EARLY' : offsetMs >= LATE_MIN_DELAY_MS ? 'LATE' : 'MIDDLE';

export interface EarlyLateComparison {
  key: string;
  protocol: ProtocolDescriptor;
  early: GroupStats;
  late: GroupStats;
  /** Delivered reactive reps between the boundaries, excluded from the comparison. */
  middleCount: number;
  /** Late clean % − early clean %, in percentage points. */
  cleanGapPp: number | null;
  /** Late mean − early mean, in seconds. */
  timeGapSeconds: number | null;
}

/**
 * Delivered single-target Reactive reps bucketed by their recorded scheduled
 * delay (not today's settings), grouped by protocol.
 */
export const compareEarlyLate = (reps: RepObservation[]): EarlyLateComparison[] => {
  const reactive = reps.filter(
    (rep) =>
      rep.condition === 'REACTIVE' && isSingleTargetRep(rep) && rep.targetOffsetMs !== undefined
  );
  return Array.from(groupBy(reactive, (rep) => protocolKey(rep.protocol)).entries())
    .map(([key, group]) => {
      const bucket = (b: DelayBucket) =>
        group.filter((rep) => classifyDelay(rep.targetOffsetMs as number) === b);
      const early = groupStats(bucket('EARLY'));
      const late = groupStats(bucket('LATE'));
      return {
        key,
        protocol: group[0].protocol,
        early,
        late,
        middleCount: bucket('MIDDLE').length,
        cleanGapPp: cleanGap(early, late),
        timeGapSeconds: timeGap(early, late),
      };
    })
    .map((comparison) => ({
      comparison,
      total: comparison.early.outcomes.logged + comparison.late.outcomes.logged,
    }))
    .sort(byLoggedDesc)
    .map(({ comparison }) => comparison);
};

export interface FakeOutSummary {
  /** Population: Fake-out rounds whose correction was delivered. */
  outcomes: OutcomeSummary;
  /** Fake-out drill rounds where no correction was drawn. */
  noCorrectionRounds: number;
  /** Rounds with a correction planned but not dispatched. */
  undeliveredCorrectionRounds: number;
}

/** Success = self-reported clean execution of the final (corrected) cue. */
export const summarizeFakeOuts = (reps: RepObservation[]): FakeOutSummary => {
  const fakeOutDrill = reps.filter((rep) => rep.condition === 'FAKE_OUT');
  const corrected = fakeOutDrill.filter((rep) => rep.fakeOut);
  return {
    outcomes: summarizeOutcomes(corrected.filter((rep) => rep.correctionDelivered)),
    noCorrectionRounds: fakeOutDrill.length - corrected.length,
    undeliveredCorrectionRounds: corrected.filter((rep) => !rep.correctionDelivered).length,
  };
};
