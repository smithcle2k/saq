import type {
  SessionConfigSnapshot,
  SessionRecord,
  SessionRoundRecord,
  WorkoutHistoryItem,
} from '../types.ts';
import { calculatePlannedSessionDuration } from './drillPlan.ts';
import type { SessionPlan } from './drillPlan.ts';

/** What the runtime actually dispatched; keyed by event id / round id. */
export interface SessionDeliveryLog {
  /** Event id → active WORK ms at dispatch. */
  deliveredEvents: ReadonlyMap<string, number>;
  deliveredPreviews: ReadonlySet<string>;
}

export const createSessionId = (now = Date.now(), random: () => number = Math.random) =>
  `${now.toString(36)}-${Math.floor(random() * 36 ** 4)
    .toString(36)
    .padStart(4, '0')}`;

/** Deep copy, so later setup or preset changes never reach a saved or running session. */
export const cloneSessionConfig = (snapshot: SessionConfigSnapshot): SessionConfigSnapshot => ({
  timerConfig: { ...snapshot.timerConfig },
  enabledCues: [...snapshot.enabledCues],
  cueSettings: { ...snapshot.cueSettings, cueWeights: { ...snapshot.cueSettings.cueWeights } },
  drillSettings: { ...snapshot.drillSettings },
  cueOutputMode: snapshot.cueOutputMode,
});

export const buildSessionRecord = (
  plan: SessionPlan,
  snapshot: SessionConfigSnapshot,
  log: SessionDeliveryLog
): SessionRecord => ({
  planVersion: plan.planVersion,
  drillType: plan.drillType,
  stoppingInstruction: plan.stoppingInstruction,
  config: cloneSessionConfig(snapshot),
  rounds: plan.rounds.map(
    (round): SessionRoundRecord => ({
      id: round.id,
      roundNumber: round.roundNumber,
      condition: round.condition,
      fakeOut: round.fakeOut,
      events: round.events.map((event) => {
        const observedOffsetMs = log.deliveredEvents.get(event.id);
        return observedOffsetMs === undefined
          ? { ...event, status: 'SKIPPED' as const }
          : { ...event, status: 'DELIVERED' as const, observedOffsetMs };
      }),
      ...(round.preview
        ? {
            preview: {
              ...round.preview,
              status: log.deliveredPreviews.has(round.id) ? 'DELIVERED' : 'SKIPPED',
            },
          }
        : {}),
    })
  ),
});

export const buildCompletedHistoryItem = ({
  plan,
  snapshot,
  log,
  completedAt,
  warmupSeconds,
  replayOfSessionId,
  progressionStage,
}: {
  plan: SessionPlan;
  snapshot: SessionConfigSnapshot;
  log: SessionDeliveryLog;
  completedAt: Date;
} & Pick<
  WorkoutHistoryItem,
  'warmupSeconds' | 'replayOfSessionId' | 'progressionStage'
>): WorkoutHistoryItem => ({
  id: plan.sessionId,
  date: completedAt.toISOString(),
  // Planned phase time only; a warm-up is stored separately below.
  duration: calculatePlannedSessionDuration(plan, snapshot.timerConfig),
  mode: 'INTERVAL',
  rounds: snapshot.timerConfig.rounds,
  drillType: plan.drillType,
  session: buildSessionRecord(plan, snapshot, log),
  ...(warmupSeconds ? { warmupSeconds } : {}),
  ...(replayOfSessionId ? { replayOfSessionId } : {}),
  ...(progressionStage ? { progressionStage } : {}),
});

/** Idempotent: a session id already in history is never added again. */
export const addCompletedSession = (history: WorkoutHistoryItem[], item: WorkoutHistoryItem) =>
  item.id && history.some((existing) => existing.id === item.id) ? history : [item, ...history];
