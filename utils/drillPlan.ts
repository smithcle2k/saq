import { TimerPhase } from '../types.ts';
import type {
  CueEventRole,
  DrillSettings,
  DrillType,
  RoundCondition,
  TimerConfig,
} from '../types.ts';
import { normalizeIntervalEnabledCues } from './defaultCues.ts';
import { validateCueSettingsForWorkTime, WORK_END_MARGIN_MS } from './cueSettings.ts';
import type { CueSettings, IntervalCueLabel } from './cueSettings.ts';
import { getEligibleCues, getRandomIntInclusive, pickWeightedCue } from './intervalCuePlan.ts';
import type { IntervalCuePlan } from './intervalCuePlan.ts';

export const DRILL_TYPES: readonly DrillType[] = [
  'REACTIVE',
  'OPEN_REACTIVE',
  'PLANNED',
  'ALTERNATING',
  'FAKE_OUT',
  'CHAIN',
];

export const MIN_CORRECTION_GAP_MS = 600;
export const MAX_CORRECTION_GAP_MS = 1500;
export const MIN_CHAIN_WORK_SECONDS = 8;
export const ONE_CUE_WORK_SECONDS = 5;
export const TWO_CUE_WORK_SECONDS = 8;
export const MIN_REACTIVE_WORK_SECONDS = TWO_CUE_WORK_SECONDS;
export const MIN_REACTIVE_CHANGE_GAP_MS = 1500;
export const MAX_REACTIVE_CHANGE_GAP_MS = 2500;
export const MAX_STOPPING_INSTRUCTION_LENGTH = 60;
/** Planned cues are revealed in the final seconds of the preceding PREP/REST. */
export const PREVIEW_LEAD_SECONDS = 3;

export const DEFAULT_DRILL_SETTINGS: DrillSettings = {
  drillType: 'REACTIVE',
  fakeOutProbability: 0.25,
  correctionGapMs: 800,
  chainCueCount: 2,
  stoppingInstruction: '',
};

export type DrillSettingsInput = Partial<Record<keyof DrillSettings, unknown>>;

const clampNumber = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;

export const normalizeDrillSettings = (input: DrillSettingsInput | undefined): DrillSettings => {
  const drillType = DRILL_TYPES.includes(input?.drillType as DrillType)
    ? (input?.drillType as DrillType)
    : DEFAULT_DRILL_SETTINGS.drillType;
  const stoppingInstruction =
    typeof input?.stoppingInstruction === 'string'
      ? // Trailing space is kept while typing; the session snapshot trims fully at Start.
        input.stoppingInstruction.replace(/^\s+/, '').slice(0, MAX_STOPPING_INSTRUCTION_LENGTH)
      : DEFAULT_DRILL_SETTINGS.stoppingInstruction;

  return {
    drillType,
    fakeOutProbability:
      Math.round(
        clampNumber(input?.fakeOutProbability, DEFAULT_DRILL_SETTINGS.fakeOutProbability, 0, 1) *
          100
      ) / 100,
    correctionGapMs: Math.round(
      clampNumber(
        input?.correctionGapMs,
        DEFAULT_DRILL_SETTINGS.correctionGapMs,
        MIN_CORRECTION_GAP_MS,
        MAX_CORRECTION_GAP_MS
      )
    ),
    chainCueCount:
      clampNumber(input?.chainCueCount, DEFAULT_DRILL_SETTINGS.chainCueCount, 2, 3) >= 2.5 ? 3 : 2,
    stoppingInstruction,
  };
};

export type DrillValidationError =
  | 'WORK_TIME_TOO_SHORT'
  | 'REACTIVE_NEEDS_THREE_CUES'
  | 'REACTIVE_WORK_TOO_SHORT'
  | 'REACTIVE_CHANGE_DOES_NOT_FIT'
  | 'PREVIEW_WINDOW_EMPTY'
  | 'FAKE_OUT_NEEDS_TWO_CUES'
  | 'FAKE_OUT_DOES_NOT_FIT'
  | 'CHAIN_WORK_TOO_SHORT'
  | 'CHAIN_DOES_NOT_FIT';

export type DrillValidation =
  | { isValid: true }
  | { isValid: false; error: DrillValidationError; message: string };

export interface DrillSessionInput {
  drillSettings: DrillSettings;
  cueSettings: CueSettings;
  enabledCues: string[];
  config: TimerConfig;
}

const invalid = (error: DrillValidationError, message: string): DrillValidation => ({
  isValid: false,
  error,
  message,
});

export const getRoundCondition = (drillType: DrillType, roundNumber: number): RoundCondition => {
  if (drillType === 'ALTERNATING') return roundNumber % 2 === 1 ? 'PLANNED' : 'REACTIVE';
  return drillType;
};

export const getPreviewPhaseDuration = (config: TimerConfig, roundNumber: number) =>
  roundNumber === 1 ? config.prepTime : config.restTime;

/** Validates the whole schedule before Start; nothing is silently truncated. */
export const validateDrillSession = ({
  drillSettings,
  cueSettings,
  enabledCues,
  config,
}: DrillSessionInput): DrillValidation => {
  const workMs = config.workTime * 1000;
  const available = workMs - WORK_END_MARGIN_MS;

  if (!validateCueSettingsForWorkTime(cueSettings, config.workTime).isValid) {
    return invalid('WORK_TIME_TOO_SHORT', 'Increase work time before starting this cue timing.');
  }

  const { drillType } = drillSettings;

  if (drillType === 'OPEN_REACTIVE') {
    if (normalizeIntervalEnabledCues(enabledCues).length < 3) {
      return invalid(
        'REACTIVE_NEEDS_THREE_CUES',
        'Enable at least three cues for an unpredictable change.'
      );
    }
    if (config.workTime < MIN_REACTIVE_WORK_SECONDS) {
      return invalid(
        'REACTIVE_WORK_TOO_SHORT',
        'Two reactive cues need at least 8 seconds of work.'
      );
    }
    if (cueSettings.delayMaxMs + MAX_REACTIVE_CHANGE_GAP_MS > available) {
      return invalid(
        'REACTIVE_CHANGE_DOES_NOT_FIT',
        'Increase work time or lower the maximum first-cue delay so both cues fit.'
      );
    }
  }

  if (drillType === 'PLANNED' || drillType === 'ALTERNATING') {
    for (let round = 1; round <= config.rounds; round += 1) {
      if (
        getRoundCondition(drillType, round) === 'PLANNED' &&
        getPreviewPhaseDuration(config, round) <= 0
      ) {
        return invalid(
          'PREVIEW_WINDOW_EMPTY',
          'Planned rounds need prep and rest time to show the upcoming cue.'
        );
      }
    }
  }

  if (drillType === 'FAKE_OUT') {
    if (normalizeIntervalEnabledCues(enabledCues).length < 2) {
      return invalid('FAKE_OUT_NEEDS_TWO_CUES', 'Fake-outs need at least two enabled cues.');
    }
    if (cueSettings.delayMaxMs + drillSettings.correctionGapMs > available) {
      return invalid(
        'FAKE_OUT_DOES_NOT_FIT',
        `Fake-outs need ${Math.ceil((cueSettings.delayMaxMs + drillSettings.correctionGapMs + WORK_END_MARGIN_MS) / 1000)}s work, or a shorter delay or correction gap.`
      );
    }
  }

  if (drillType === 'CHAIN') {
    if (config.workTime < MIN_CHAIN_WORK_SECONDS) {
      return invalid(
        'CHAIN_WORK_TOO_SHORT',
        `Chains need at least ${MIN_CHAIN_WORK_SECONDS}s work.`
      );
    }
    if (drillSettings.chainCueCount * cueSettings.delayMaxMs > available) {
      return invalid(
        'CHAIN_DOES_NOT_FIT',
        'Increase work time, lower the maximum delay, or use fewer chain cues.'
      );
    }
  }

  return { isValid: true };
};

export interface PlannedCueEvent {
  id: string;
  label: IntervalCueLabel;
  offsetMs: number;
  role: CueEventRole;
}

export interface RoundPreview {
  phase: TimerPhase.PREP | TimerPhase.REST;
  offsetMs: number;
  label: IntervalCueLabel;
}

export interface RoundPlan {
  id: string;
  roundNumber: number;
  condition: RoundCondition;
  fakeOut: boolean;
  events: PlannedCueEvent[];
  preview?: RoundPreview;
}

export interface SessionPlan {
  planVersion: 1;
  sessionId: string;
  drillType: DrillType;
  stoppingInstruction: string;
  rounds: RoundPlan[];
}

export const getRoundWorkSeconds = (
  round: Pick<RoundPlan, 'condition'> & { events: readonly unknown[] },
  fallbackWorkSeconds: number
) =>
  round.condition === 'OPEN_REACTIVE'
    ? round.events.length === 1
      ? ONE_CUE_WORK_SECONDS
      : TWO_CUE_WORK_SECONDS
    : fallbackWorkSeconds;

export const calculatePlannedSessionDuration = (plan: SessionPlan, config: TimerConfig) =>
  config.prepTime +
  config.coolDownTime +
  config.restTime * config.rounds +
  plan.rounds.reduce((total, round) => total + getRoundWorkSeconds(round, config.workTime), 0);

export interface BuildSessionPlanInput extends DrillSessionInput {
  sessionId: string;
  random?: () => number;
}

export const getPreviewThresholdSeconds = (phaseDurationSeconds: number) =>
  Math.min(PREVIEW_LEAD_SECONDS, phaseDurationSeconds);

/**
 * Generates the immutable session plan at Start. Random draws happen in a fixed
 * order per round so a seeded sequence reproduces the same plan:
 * cue, delay[, change decision, change cue and gap, or fake-out decision and correction cue],
 * or, for chains, (cue, delay) per step.
 */
export const buildSessionPlan = (input: BuildSessionPlanInput): SessionPlan => {
  const validation = validateDrillSession(input);
  if (!validation.isValid) throw new Error(validation.message);

  const { sessionId, drillSettings, cueSettings, config } = input;
  const random = input.random ?? Math.random;
  const pool = normalizeIntervalEnabledCues(input.enabledCues) as IntervalCueLabel[];
  const weights = cueSettings.cueWeights;
  const cueTiming = validateCueSettingsForWorkTime(cueSettings, config.workTime);
  const singleCueRange = cueTiming.isValid
    ? cueTiming.effectiveDelayRange
    : { minMs: cueSettings.delayMinMs, maxMs: cueSettings.delayMaxMs };
  let recentCues: IntervalCueLabel[] = [];

  const pickCue = (exclude?: IntervalCueLabel) => {
    const eligible = getEligibleCues(pool, recentCues).filter((cue) => cue !== exclude);
    const cue = pickWeightedCue(eligible, weights, random);
    recentCues = [...recentCues, cue].slice(-2);
    return cue;
  };
  const drawDelay = (minMs: number, maxMs: number) => getRandomIntInclusive(minMs, maxMs, random);

  const rounds = Array.from({ length: config.rounds }, (_, index): RoundPlan => {
    const roundNumber = index + 1;
    const id = `${sessionId}-r${roundNumber}`;
    const condition = getRoundCondition(drillSettings.drillType, roundNumber);
    const event = (label: IntervalCueLabel, offsetMs: number, role: CueEventRole, n: number) => ({
      id: `${id}-e${n}`,
      label,
      offsetMs,
      role,
    });

    if (condition === 'PLANNED') {
      const label = pickCue();
      const phaseDuration = getPreviewPhaseDuration(config, roundNumber);
      return {
        id,
        roundNumber,
        condition,
        fakeOut: false,
        events: [event(label, 0, 'TARGET', 1)],
        preview: {
          phase: roundNumber === 1 ? TimerPhase.PREP : TimerPhase.REST,
          offsetMs: (phaseDuration - getPreviewThresholdSeconds(phaseDuration)) * 1000,
          label,
        },
      };
    }

    if (condition === 'FAKE_OUT') {
      const first = pickCue();
      const firstOffset = drawDelay(cueSettings.delayMinMs, cueSettings.delayMaxMs);
      const fakeOut = random() < drillSettings.fakeOutProbability;
      if (!fakeOut) {
        return {
          id,
          roundNumber,
          condition,
          fakeOut,
          events: [event(first, firstOffset, 'TARGET', 1)],
        };
      }
      const correction = pickCue(first);
      return {
        id,
        roundNumber,
        condition,
        fakeOut,
        events: [
          event(first, firstOffset, 'INITIAL', 1),
          event(correction, firstOffset + drillSettings.correctionGapMs, 'CORRECTION', 2),
        ],
      };
    }

    if (condition === 'CHAIN') {
      let offsetMs = 0;
      const events = Array.from({ length: drillSettings.chainCueCount }, (_, step) => {
        const label = pickCue();
        offsetMs += drawDelay(cueSettings.delayMinMs, cueSettings.delayMaxMs);
        return event(label, offsetMs, 'CHAIN_STEP', step + 1);
      });
      return { id, roundNumber, condition, fakeOut: false, events };
    }

    if (condition === 'OPEN_REACTIVE') {
      // The second cue is optional. Its presence, target, and timing remain unknown.
      const first = pool[getRandomIntInclusive(0, pool.length - 1, random)];
      const firstOffset = drawDelay(singleCueRange.minMs, singleCueRange.maxMs);
      if (random() >= 0.5) {
        return {
          id,
          roundNumber,
          condition,
          fakeOut: false,
          events: [event(first, firstOffset, 'TARGET', 1)],
        };
      }
      const alternatives = pool.filter((cue) => cue !== first);
      const change = alternatives[getRandomIntInclusive(0, alternatives.length - 1, random)];
      const changeOffset =
        firstOffset + drawDelay(MIN_REACTIVE_CHANGE_GAP_MS, MAX_REACTIVE_CHANGE_GAP_MS);
      return {
        id,
        roundNumber,
        condition,
        fakeOut: false,
        events: [event(first, firstOffset, 'TARGET', 1), event(change, changeOffset, 'CHANGE', 2)],
      };
    }

    const label = pickCue();
    return {
      id,
      roundNumber,
      condition,
      fakeOut: false,
      events: [event(label, drawDelay(singleCueRange.minMs, singleCueRange.maxMs), 'TARGET', 1)],
    };
  });

  return {
    planVersion: 1,
    sessionId,
    drillType: drillSettings.drillType,
    stoppingInstruction: drillSettings.stoppingInstruction.trim(),
    rounds,
  };
};

/** Runtime cue plan for one round. Planned cues are shown at WORK entry, already announced. */
export const toIntervalCuePlan = (round: RoundPlan): IntervalCuePlan => ({
  announcement: 'Go',
  currentExercise: round.events[round.events.length - 1]?.label ?? '',
  ...(round.condition === 'OPEN_REACTIVE'
    ? { workDurationSeconds: getRoundWorkSeconds(round, TWO_CUE_WORK_SECONDS) }
    : {}),
  cuePlan: round.events.map((event, index) => ({
    id: index + 1,
    eventId: event.id,
    label: event.label,
    offsetMs: event.offsetMs,
    role: event.role,
    speak: round.condition !== 'PLANNED',
  })),
});

const getRoundAwaitingPreview = (
  plan: SessionPlan,
  config: TimerConfig,
  phase: TimerPhase,
  currentRound: number
) => {
  const nextRoundNumber =
    phase === TimerPhase.PREP ? 1 : phase === TimerPhase.REST ? currentRound + 1 : 0;
  if (nextRoundNumber < 1 || nextRoundNumber > config.rounds) return undefined;
  const round = plan.rounds[nextRoundNumber - 1];
  return round?.preview ? round : undefined;
};

/** The upcoming planned round whose preview should be delivered now, if any. */
export const getDueRoundPreview = (
  plan: SessionPlan,
  config: TimerConfig,
  phase: TimerPhase,
  currentRound: number,
  timeRemaining: number,
  previewedRoundIds: ReadonlySet<string>
) => {
  const round = getRoundAwaitingPreview(plan, config, phase, currentRound);
  if (!round || previewedRoundIds.has(round.id) || timeRemaining <= 0) return undefined;
  const threshold = getPreviewThresholdSeconds(getPreviewPhaseDuration(config, round.roundNumber));
  return timeRemaining <= threshold ? round : undefined;
};

/** True on the countdown second where a preview is spoken, so its beep yields to speech. */
export const isPreviewSecond = (
  plan: SessionPlan,
  config: TimerConfig,
  phase: TimerPhase,
  currentRound: number,
  timeRemaining: number
) => {
  const round = getRoundAwaitingPreview(plan, config, phase, currentRound);
  if (!round) return false;
  return (
    timeRemaining === getPreviewThresholdSeconds(getPreviewPhaseDuration(config, round.roundNumber))
  );
};

export const DRILL_LABELS: Record<DrillType, string> = {
  REACTIVE: 'Reactive',
  OPEN_REACTIVE: 'Reactive Agility',
  PLANNED: 'Planned',
  ALTERNATING: 'Alternating',
  FAKE_OUT: 'Fake-out',
  CHAIN: 'Chain',
};

export const getDrillInstructions = (drillSettings: DrillSettings) => {
  switch (drillSettings.drillType) {
    case 'OPEN_REACTIVE':
      return 'Follow the cue. If another cue arrives, change direction.';
    case 'PLANNED':
      return 'Your cue is shown before each round. Move on Go.';
    case 'ALTERNATING':
      return 'Odd rounds show the cue first. Even rounds are reactive.';
    case 'FAKE_OUT':
      return 'Follow the latest cue. If it changes, change direction.';
    case 'CHAIN':
      return `Follow each of ${drillSettings.chainCueCount} cues in turn.`;
    default:
      return 'React to the cue after Go.';
  }
};
