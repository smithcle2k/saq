import { TimerPhase } from '../types.ts';
import type {
  SessionConfigSnapshot,
  SessionRecord,
  SessionRoundRecord,
  WorkoutHistoryItem,
} from '../types.ts';
import type { IntervalCueLabel } from './cueSettings.ts';
import { WORK_END_MARGIN_MS } from './cueSettings.ts';
import { getPreviewPhaseDuration, getRoundCondition } from './drillPlan.ts';
import type { RoundPlan, SessionPlan } from './drillPlan.ts';
import { cloneSessionConfig } from './sessionHistory.ts';
import { validateSessionConfig } from './sessionPresets.ts';

export type ReplayCheck =
  | { replayable: true; config: SessionConfigSnapshot; session: SessionRecord }
  | { replayable: false; reason: string };

const unavailable = (reason: string): ReplayCheck => ({ replayable: false, reason });

const isOffset = (value: unknown, maxMs: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= maxMs;

/** Why one stored round cannot be replayed exactly, or null when it can. */
const checkRound = (
  round: SessionRoundRecord,
  index: number,
  config: SessionConfigSnapshot
): string | null => {
  const roundNumber = index + 1;
  const { drillSettings, timerConfig, enabledCues } = config;
  const maxOffsetMs = timerConfig.workTime * 1000 - WORK_END_MARGIN_MS;
  const expectedCondition = getRoundCondition(drillSettings.drillType, roundNumber);

  if (round.roundNumber !== roundNumber) return `Round ${roundNumber} is out of order.`;
  if (round.condition !== expectedCondition) {
    return `Round ${roundNumber} condition does not match the saved drill.`;
  }
  const { events } = round;
  if (!Array.isArray(events) || events.length === 0) return `Round ${roundNumber} has no cues.`;
  if (!events.every((event) => enabledCues.includes(event.label))) {
    return `Round ${roundNumber} uses a cue that was not enabled.`;
  }
  if (!events.every((event) => isOffset(event.offsetMs, maxOffsetMs))) {
    return `Round ${roundNumber} has a cue time outside the work interval.`;
  }
  const roles = events.map((event) => event.role).join(',');
  if (expectedCondition !== 'FAKE_OUT' && round.fakeOut) {
    return `Round ${roundNumber} is marked as a fake-out in a non-fake-out drill.`;
  }

  switch (expectedCondition) {
    case 'PLANNED': {
      if (roles !== 'TARGET' || events[0].offsetMs !== 0) {
        return `Round ${roundNumber} planned cue is malformed.`;
      }
      const { preview } = round;
      const phase = roundNumber === 1 ? TimerPhase.PREP : TimerPhase.REST;
      const phaseMs = getPreviewPhaseDuration(timerConfig, roundNumber) * 1000;
      if (
        !preview ||
        preview.phase !== phase ||
        preview.label !== events[0].label ||
        !isOffset(preview.offsetMs, phaseMs - 1)
      ) {
        return `Round ${roundNumber} preview is missing or does not match its cue.`;
      }
      return null;
    }
    case 'REACTIVE':
      if (roles !== 'TARGET') return `Round ${roundNumber} reactive cue is malformed.`;
      break;
    case 'OPEN_REACTIVE':
      if (roles !== 'TARGET' && roles !== 'TARGET,CHANGE') {
        return `Round ${roundNumber} reactive cue sequence is malformed.`;
      }
      if (
        roles === 'TARGET,CHANGE' &&
        (events[1].label === events[0].label || events[1].offsetMs <= events[0].offsetMs)
      ) {
        return `Round ${roundNumber} reactive change is malformed.`;
      }
      break;
    case 'FAKE_OUT':
      if (round.fakeOut) {
        if (
          roles !== 'INITIAL,CORRECTION' ||
          events[1].label === events[0].label ||
          events[1].offsetMs <= events[0].offsetMs
        ) {
          return `Round ${roundNumber} fake-out correction is malformed.`;
        }
      } else if (roles !== 'TARGET') {
        return `Round ${roundNumber} fake-out cue is malformed.`;
      }
      break;
    case 'CHAIN':
      if (
        events.length !== drillSettings.chainCueCount ||
        !events.every(
          (event, i) =>
            event.role === 'CHAIN_STEP' && (i === 0 || event.offsetMs > events[i - 1].offsetMs)
        )
      ) {
        return `Round ${roundNumber} chain is malformed.`;
      }
      break;
  }
  return round.preview ? `Round ${roundNumber} has an unexpected preview.` : null;
};

/**
 * Only a complete, self-consistent saved plan can replay. Anything inconsistent
 * is reported rather than repaired, so a replay never changes cues or timing.
 */
export const checkReplay = (item: WorkoutHistoryItem): ReplayCheck => {
  const session = item.session;
  if (!session) return unavailable('Saved before cue plans were recorded.');
  if (!item.id) return unavailable('This workout has no session id.');
  if (session.planVersion !== 1) return unavailable('This saved plan version is not supported.');

  const validation = validateSessionConfig(session.config);
  if (!validation.isValid) return unavailable(`Saved setup is invalid: ${validation.message}`);
  const { config } = validation;

  if (
    session.drillType !== config.drillSettings.drillType ||
    session.stoppingInstruction !== config.drillSettings.stoppingInstruction
  ) {
    return unavailable('Saved drill does not match its setup.');
  }
  if (!Array.isArray(session.rounds) || session.rounds.length !== config.timerConfig.rounds) {
    return unavailable('Saved rounds do not match the round count.');
  }
  for (let index = 0; index < session.rounds.length; index += 1) {
    const problem = checkRound(session.rounds[index], index, config);
    if (problem) return unavailable(problem);
  }
  return { replayable: true, config, session };
};

const deepFreeze = <T>(value: T): T => {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

export type ReplaySession =
  | {
      ok: true;
      plan: SessionPlan;
      /** Frozen copy: later setup or preset changes cannot alter what replays. */
      snapshot: SessionConfigSnapshot;
      replayOfSessionId: string;
    }
  | { ok: false; reason: string };

/** Rebuilds the stored events under a new session id; no random draw happens. */
export const buildReplaySession = (
  item: WorkoutHistoryItem,
  newSessionId: string
): ReplaySession => {
  const check = checkReplay(item);
  if (!check.replayable) return { ok: false, reason: check.reason };
  const { session, config } = check;

  const rounds = session.rounds.map((round): RoundPlan => {
    const id = `${newSessionId}-r${round.roundNumber}`;
    return {
      id,
      roundNumber: round.roundNumber,
      condition: round.condition,
      fakeOut: round.fakeOut,
      events: round.events.map((event, index) => ({
        id: `${id}-e${index + 1}`,
        label: event.label as IntervalCueLabel,
        offsetMs: event.offsetMs,
        role: event.role,
      })),
      ...(round.preview
        ? {
            preview: {
              phase: round.preview.phase as TimerPhase.PREP | TimerPhase.REST,
              offsetMs: round.preview.offsetMs,
              label: round.preview.label as IntervalCueLabel,
            },
          }
        : {}),
    };
  });

  return {
    ok: true,
    plan: {
      planVersion: 1,
      sessionId: newSessionId,
      drillType: session.drillType,
      stoppingInstruction: session.stoppingInstruction,
      rounds,
    },
    snapshot: deepFreeze(cloneSessionConfig(config)),
    replayOfSessionId: item.id as string,
  };
};
