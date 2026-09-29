import type {
  DrillType,
  ProgressionSettings,
  ProgressionStage,
  SessionConfigSnapshot,
  WorkoutHistoryItem,
} from '../types.ts';
import { CUE_DELAY_PRESETS, WORK_END_MARGIN_MS } from './cueSettings.ts';
import { validateDrillSession } from './drillPlan.ts';
import { cloneSessionConfig } from './sessionHistory.ts';

export const PROGRESSION_STAGE_LIST: readonly ProgressionStage[] = [1, 2, 3, 4];

export interface ProgressionStageDefinition {
  label: string;
  drillType: DrillType;
  delay: { minMs: number; maxMs: number };
}

export const PROGRESSION_STAGES: Record<ProgressionStage, ProgressionStageDefinition> = {
  1: { label: 'Planned + Early', drillType: 'PLANNED', delay: CUE_DELAY_PRESETS.Early },
  2: { label: 'Reactive + Early', drillType: 'REACTIVE', delay: CUE_DELAY_PRESETS.Early },
  3: { label: 'Reactive + Late', drillType: 'REACTIVE', delay: CUE_DELAY_PRESETS.Late },
  4: { label: 'Fake-outs', drillType: 'FAKE_OUT', delay: CUE_DELAY_PRESETS.Late },
};

/** Evidence floor per session, so one clean tap cannot qualify an unlogged workout. */
export const ADVANCE_MIN_LOGGED = 5;
export const ADVANCE_MIN_COVERAGE_PCT = 80;
export const ADVANCE_MIN_CLEAN_PCT = 80;
export const ADVANCE_REQUIRED_RUN = 3;

export type StageApplication =
  | { isValid: true; config: SessionConfigSnapshot }
  | { isValid: false; message: string };

/**
 * Returns a new configuration for the stage; the input is never changed.
 * Stage 4 raises work time, if needed, to fit the longest correction schedule.
 */
export const applyProgressionStage = (
  stage: ProgressionStage,
  current: SessionConfigSnapshot
): StageApplication => {
  const definition = PROGRESSION_STAGES[stage];
  const config = cloneSessionConfig(current);
  config.drillSettings.drillType = definition.drillType;
  config.cueSettings.delayMinMs = definition.delay.minMs;
  config.cueSettings.delayMaxMs = definition.delay.maxMs;

  if (definition.drillType === 'FAKE_OUT') {
    const neededMs =
      definition.delay.maxMs + config.drillSettings.correctionGapMs + WORK_END_MARGIN_MS;
    config.timerConfig.workTime = Math.max(config.timerConfig.workTime, Math.ceil(neededMs / 1000));
  }

  const validation = validateDrillSession({
    drillSettings: config.drillSettings,
    cueSettings: config.cueSettings,
    enabledCues: config.enabledCues,
    config: config.timerConfig,
  });
  return validation.isValid ? { isValid: true, config } : validation;
};

export const matchesProgressionStage = (config: SessionConfigSnapshot, stage: ProgressionStage) => {
  const definition = PROGRESSION_STAGES[stage];
  return (
    config.drillSettings.drillType === definition.drillType &&
    config.cueSettings.delayMinMs === definition.delay.minMs &&
    config.cueSettings.delayMaxMs === definition.delay.maxMs
  );
};

/** Stage recorded on a new session; replays and non-matching setups never count. */
export const getSessionProgressionStage = (
  progression: ProgressionSettings,
  config: SessionConfigSnapshot,
  isReplay: boolean
): ProgressionStage | undefined =>
  progression.enabled && !isReplay && matchesProgressionStage(config, progression.stage)
    ? progression.stage
    : undefined;

export interface StageSessionEvaluation {
  sessionId: string;
  date: string;
  eligible: number;
  logged: number;
  clean: number;
  cleanPct: number | null;
  coveragePct: number | null;
  qualifies: boolean;
  /** Plain-language explanation shown next to the session. */
  reason: string;
}

const pct = (value: number) => `${Math.round(value)}%`;

export const evaluateStageSession = (item: WorkoutHistoryItem): StageSessionEvaluation => {
  const rounds = item.session?.rounds ?? [];
  const eligible = rounds.length;
  const logged = rounds.filter((round) => round.outcome).length;
  const clean = rounds.filter((round) => round.outcome === 'CLEAN').length;
  const cleanPct = logged > 0 ? (clean / logged) * 100 : null;
  const coveragePct = eligible > 0 ? (logged / eligible) * 100 : null;

  let reason: string;
  if (logged < ADVANCE_MIN_LOGGED) {
    reason = `${logged} logged reps; needs ${ADVANCE_MIN_LOGGED}`;
  } else if ((coveragePct ?? 0) < ADVANCE_MIN_COVERAGE_PCT) {
    reason = `${logged}/${eligible} logged (${pct(coveragePct ?? 0)}); needs ${ADVANCE_MIN_COVERAGE_PCT}% logged`;
  } else if ((cleanPct ?? 0) < ADVANCE_MIN_CLEAN_PCT) {
    reason = `${pct(cleanPct ?? 0)} clean; needs ${ADVANCE_MIN_CLEAN_PCT}%`;
  } else {
    reason = `${pct(cleanPct ?? 0)} clean, ${logged}/${eligible} logged`;
  }

  return {
    sessionId: item.id ?? item.date,
    date: item.date,
    eligible,
    logged,
    clean,
    cleanPct,
    coveragePct,
    qualifies:
      logged >= ADVANCE_MIN_LOGGED &&
      (coveragePct ?? 0) >= ADVANCE_MIN_COVERAGE_PCT &&
      (cleanPct ?? 0) >= ADVANCE_MIN_CLEAN_PCT,
    reason,
  };
};

export interface ProgressionStatus {
  /** Counted sessions at the current stage, newest first (at most the run length shown). */
  recent: StageSessionEvaluation[];
  /** Newest consecutive qualifying sessions. */
  run: StageSessionEvaluation[];
  /** Next stage to suggest; applying it is always the user's choice. */
  suggestedStage: ProgressionStage | null;
}

/**
 * Counts completed sessions recorded at the current stage since it was chosen.
 * Replays and other drills are ignored; a nonqualifying stage session breaks the run.
 */
export const getProgressionStatus = (
  history: WorkoutHistoryItem[],
  progression: ProgressionSettings
): ProgressionStatus => {
  if (!progression.enabled) return { recent: [], run: [], suggestedStage: null };
  const since = Date.parse(progression.stageSetAt);
  const counted = history
    .filter(
      (item) =>
        item.session &&
        !item.replayOfSessionId &&
        item.progressionStage === progression.stage &&
        !(Date.parse(item.date) < since)
    )
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .map(evaluateStageSession);

  const firstMiss = counted.findIndex((evaluation) => !evaluation.qualifies);
  const run = firstMiss < 0 ? counted : counted.slice(0, firstMiss);
  const suggestedStage =
    run.length >= ADVANCE_REQUIRED_RUN && progression.stage < 4
      ? ((progression.stage + 1) as ProgressionStage)
      : null;

  return { recent: counted.slice(0, ADVANCE_REQUIRED_RUN), run, suggestedStage };
};

const EPOCH = new Date(0).toISOString();

export const DEFAULT_PROGRESSION: ProgressionSettings = {
  enabled: false,
  stage: 1,
  stageSetAt: EPOCH,
};

export const normalizeProgressionSettings = (input: unknown): ProgressionSettings => {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  return {
    enabled: raw.enabled === true,
    stage: PROGRESSION_STAGE_LIST.includes(raw.stage as ProgressionStage)
      ? (raw.stage as ProgressionStage)
      : 1,
    stageSetAt:
      typeof raw.stageSetAt === 'string' && !Number.isNaN(Date.parse(raw.stageSetAt))
        ? raw.stageSetAt
        : EPOCH,
  };
};
