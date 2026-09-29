import { TimerPhase } from '../types.ts';
import type { RepOutcome, SessionNotes, TrainingSurface, WorkoutHistoryItem } from '../types.ts';

export const REP_OUTCOMES: readonly RepOutcome[] = ['CLEAN', 'WRONG_FIRST_STEP', 'MISSED_STOPPED'];

export const REP_OUTCOME_LABELS: Record<RepOutcome, string> = {
  CLEAN: 'Clean',
  WRONG_FIRST_STEP: 'Wrong first step',
  MISSED_STOPPED: 'Missed / stopped',
};

/** Upper bound for a self-entered time; anything longer is almost certainly a typo. */
export const MAX_SELF_REPORTED_TIME_MS = 60_000;

/** What the athlete logged for one round during its REST. */
export interface RoundLog {
  outcome?: RepOutcome;
  selfReportedTimeMs?: number;
}

/** Round id → log. Rounds never touched are absent, which means not logged. */
export type RoundLogBook = ReadonlyMap<string, RoundLog>;

export type RoundLogAction =
  | { type: 'SET_OUTCOME'; outcome: RepOutcome }
  | { type: 'CLEAR_OUTCOME' }
  | { type: 'SET_TIME'; timeMs: number }
  | { type: 'CLEAR_TIME' };

export type RoundLogEdit = { sessionId: string; roundId: string } & RoundLogAction;

export interface RoundLogWindow {
  sessionId: string;
  /** The only round currently accepting edits, or null outside REST. */
  openRoundId: string | null;
}

export const createRoundLogBook = (): RoundLogBook => new Map();

const isValidTimeMs = (timeMs: number) =>
  Number.isFinite(timeMs) && timeMs > 0 && timeMs <= MAX_SELF_REPORTED_TIME_MS;

/**
 * Applies an edit only while its round's REST is open in the same session.
 * Late touches (after REST ends) and stale rounds return the book unchanged.
 */
export const applyRoundLogEdit = (
  book: RoundLogBook,
  edit: RoundLogEdit,
  window: RoundLogWindow
): RoundLogBook => {
  if (edit.sessionId !== window.sessionId || edit.roundId !== window.openRoundId) return book;

  const current = book.get(edit.roundId) ?? {};
  let next: RoundLog;
  switch (edit.type) {
    case 'SET_OUTCOME':
      if (!REP_OUTCOMES.includes(edit.outcome)) return book;
      next = { ...current, outcome: edit.outcome };
      break;
    case 'CLEAR_OUTCOME':
      next = { ...current, outcome: undefined };
      break;
    case 'SET_TIME':
      if (!isValidTimeMs(edit.timeMs)) return book;
      next = { ...current, selfReportedTimeMs: Math.round(edit.timeMs) };
      break;
    case 'CLEAR_TIME':
      next = { ...current, selfReportedTimeMs: undefined };
      break;
  }

  // Drop cleared fields so a stored log only holds what was actually entered.
  const log: RoundLog = {
    ...(next.outcome ? { outcome: next.outcome } : {}),
    ...(next.selfReportedTimeMs !== undefined
      ? { selfReportedTimeMs: next.selfReportedTimeMs }
      : {}),
  };
  const updated = new Map(book);
  if (Object.keys(log).length === 0) updated.delete(edit.roundId);
  else updated.set(edit.roundId, log);
  return updated;
};

/**
 * REST belongs to the round just completed, including the final REST.
 * A zero-length rest gets no logging window rather than an added pause.
 */
export const getOpenLogRoundId = (
  plan: { rounds: ReadonlyArray<{ id: string }> },
  phase: TimerPhase,
  currentRound: number,
  restTime: number
): string | null => {
  if (phase !== TimerPhase.REST || restTime <= 0) return null;
  return plan.rounds[currentRound - 1]?.id ?? null;
};

const TIME_DRAFT_PATTERN = /^(\d{0,2})(?:[.,](\d*))?$/;

/** Decimal seconds typed on the pad → integer ms, or null. Blank/invalid is never zero. */
export const parseSelfReportedTime = (draft: string): number | null => {
  const match = TIME_DRAFT_PATTERN.exec(draft.trim());
  if (!match) return null;
  const [, whole, fraction = ''] = match;
  if (!whole && !fraction) return null;
  const ms = Math.round(Number(`${whole || '0'}.${fraction || '0'}`) * 1000);
  return isValidTimeMs(ms) ? ms : null;
};

export const formatSelfReportedTime = (timeMs: number) => `${(timeMs / 1000).toFixed(2)} s`;

/** Copies logged observations onto the saved round records; unlogged rounds get no fields. */
export const attachRoundLogs = (
  item: WorkoutHistoryItem,
  book: RoundLogBook
): WorkoutHistoryItem => {
  if (!item.session || book.size === 0) return item;
  return {
    ...item,
    session: {
      ...item.session,
      rounds: item.session.rounds.map((round) => {
        const log = book.get(round.id);
        if (!log) return round;
        return {
          ...round,
          ...(log.outcome ? { outcome: log.outcome } : {}),
          ...(log.selfReportedTimeMs !== undefined
            ? { selfReportedTimeMs: log.selfReportedTimeMs }
            : {}),
        };
      }),
    },
  };
};

export const TRAINING_SURFACES: readonly TrainingSurface[] = [
  'GRASS',
  'TURF',
  'TRACK',
  'COURT',
  'HARD',
  'OTHER',
];

export const TRAINING_SURFACE_LABELS: Record<TrainingSurface, string> = {
  GRASS: 'Grass',
  TURF: 'Turf',
  TRACK: 'Track',
  COURT: 'Court',
  HARD: 'Hard ground',
  OTHER: 'Other',
};

export const MAX_PAIN_LOCATION_LENGTH = 40;
export const MAX_NOTES_TEXT_LENGTH = 280;

export type SessionNotesInput = Partial<Record<keyof SessionNotes, unknown>>;

const trimmedText = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

/** Keeps only valid, non-empty fields; returns undefined when nothing was filled in. */
export const normalizeSessionNotes = (input: SessionNotesInput): SessionNotes | undefined => {
  const notes: SessionNotes = {};
  if (TRAINING_SURFACES.includes(input.surface as TrainingSurface)) {
    notes.surface = input.surface as TrainingSurface;
  }
  if (typeof input.energy === 'number' && Number.isFinite(input.energy)) {
    notes.energy = Math.min(5, Math.max(1, Math.round(input.energy)));
  }
  if (typeof input.pain === 'boolean') {
    notes.pain = input.pain;
    const location = input.pain ? trimmedText(input.painLocation, MAX_PAIN_LOCATION_LENGTH) : '';
    if (location) notes.painLocation = location;
  }
  const text = trimmedText(input.text, MAX_NOTES_TEXT_LENGTH);
  if (text) notes.text = text;
  return Object.keys(notes).length > 0 ? notes : undefined;
};

const sameNotes = (a: SessionNotes | undefined, b: SessionNotes) =>
  JSON.stringify(a ?? {}) === JSON.stringify(b);

/** Updates the saved session by id. Never adds rows; empty notes and repeats are no-ops. */
export const applySessionNotes = (
  history: WorkoutHistoryItem[],
  sessionId: string,
  input: SessionNotesInput
): WorkoutHistoryItem[] => {
  const notes = normalizeSessionNotes(input);
  if (!notes) return history;
  const index = history.findIndex((item) => item.id === sessionId);
  if (index === -1 || sameNotes(history[index].notes, notes)) return history;
  const updated = [...history];
  updated[index] = { ...history[index], notes };
  return updated;
};
