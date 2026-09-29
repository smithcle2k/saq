import type { CueSettings } from './utils/cueSettings.ts';

export type TimerMode = 'INTERVAL' | 'SAQ';
export type CueOutputMode = 'VOICE_ONLY' | 'VISUAL_ONLY' | 'BOTH';

export interface TimerConfig {
  prepTime: number;
  workTime: number;
  restTime: number;
  rounds: number;
  coolDownTime: number;
}

export enum TimerPhase {
  PREP = 'PREP',
  WORK = 'WORK',
  REST = 'REST',
  COOL_DOWN = 'COOL_DOWN',
  FINISHED = 'FINISHED',
}

/** Session-level drill. Separate from the legacy `mode` field on history records. */
export type DrillType =
  | 'REACTIVE'
  | 'OPEN_REACTIVE'
  | 'PLANNED'
  | 'ALTERNATING'
  | 'FAKE_OUT'
  | 'CHAIN';
/** What actually ran in one round (Alternating sessions mix Planned and Reactive). */
export type RoundCondition = 'REACTIVE' | 'OPEN_REACTIVE' | 'PLANNED' | 'FAKE_OUT' | 'CHAIN';
/** TARGET: sole cue. INITIAL/CORRECTION: fake-out pair, the correction is the target. */
export type CueEventRole = 'TARGET' | 'INITIAL' | 'CORRECTION' | 'CHANGE' | 'CHAIN_STEP';
/** Whether the app dispatched an event; not a measure of acoustic onset or movement. */
export type CueEventStatus = 'DELIVERED' | 'SKIPPED';

export interface DrillSettings {
  drillType: DrillType;
  /** Independent per-round chance of a correction, 0–1. */
  fakeOutProbability: number;
  correctionGapMs: number;
  chainCueCount: 2 | 3;
  /** Text-only session context; never used to infer braking success. */
  stoppingInstruction: string;
}

export interface SessionCueEventRecord {
  id: string;
  label: string;
  /** Scheduled offset from WORK entry, in ms. */
  offsetMs: number;
  role: CueEventRole;
  status: CueEventStatus;
  /** Active (unpaused) WORK time at app dispatch, in ms. */
  observedOffsetMs?: number;
}

export interface SessionRoundPreviewRecord {
  phase: 'PREP' | 'REST';
  /** Offset from the start of the preceding phase, in ms. */
  offsetMs: number;
  label: string;
  status: CueEventStatus;
}

/** Self-reported during REST. Absent means not logged — never assume clean or failed. */
export type RepOutcome = 'CLEAN' | 'WRONG_FIRST_STEP' | 'MISSED_STOPPED';

export interface SessionRoundRecord {
  id: string;
  roundNumber: number;
  condition: RoundCondition;
  fakeOut: boolean;
  events: SessionCueEventRecord[];
  preview?: SessionRoundPreviewRecord;
  outcome?: RepOutcome;
  /** Self-entered external time in integer ms; not an app-measured reaction time. */
  selfReportedTimeMs?: number;
}

export interface SessionConfigSnapshot {
  timerConfig: TimerConfig;
  enabledCues: string[];
  cueSettings: CueSettings;
  drillSettings: DrillSettings;
  cueOutputMode: CueOutputMode;
}

export interface SessionRecord {
  planVersion: 1;
  drillType: DrillType;
  stoppingInstruction: string;
  config: SessionConfigSnapshot;
  rounds: SessionRoundRecord[];
}

export type TrainingSurface = 'GRASS' | 'TURF' | 'TRACK' | 'COURT' | 'HARD' | 'OTHER';

/** Optional finish-screen notes; every field may be absent. */
export interface SessionNotes {
  surface?: TrainingSurface;
  /** Integer 1–5. */
  energy?: number;
  pain?: boolean;
  /** Only kept when pain is true. */
  painLocation?: string;
  text?: string;
}

/** A named, complete setup. Built-ins are code constants; user presets are persisted. */
export interface SessionPreset {
  id: string;
  name: string;
  builtIn?: boolean;
  config: SessionConfigSnapshot;
}

/** Opt-in progression: 1 Planned+Early, 2 Reactive+Early, 3 Reactive+Late, 4 Fake-out. */
export type ProgressionStage = 1 | 2 | 3 | 4;

export interface ProgressionSettings {
  enabled: boolean;
  stage: ProgressionStage;
  /** ISO time the current stage was chosen; only later sessions count toward advancing. */
  stageSetAt: string;
}

export interface WorkoutHistoryItem {
  /** Stable session id; absent on records saved before Phase 3. */
  id?: string;
  date: string;
  duration: number;
  /** Absent on records saved before mode/rounds tracking was added. */
  mode?: TimerMode;
  rounds?: number;
  drillType?: DrillType;
  session?: SessionRecord;
  notes?: SessionNotes;
  /** Guided warm-up time actually run before round 1, in s; not part of `duration`. */
  warmupSeconds?: number;
  /** Set when this session replayed another's exact cue sequence (repeated exposure). */
  replayOfSessionId?: string;
  /** Progression stage this session counted toward; absent when not opted in or not matching. */
  progressionStage?: ProgressionStage;
}

export type View = 'SETUP' | 'TIMER' | 'SETTINGS' | 'STATS';
