import assert from 'node:assert/strict';
import test from 'node:test';
import type { WorkoutHistoryItem } from '../types.ts';
import {
  applyRoundLogEdit,
  applySessionNotes,
  attachRoundLogs,
  createRoundLogBook,
  formatSelfReportedTime,
  getOpenLogRoundId,
  MAX_NOTES_TEXT_LENGTH,
  MAX_PAIN_LOCATION_LENGTH,
  normalizeSessionNotes,
  parseSelfReportedTime,
} from './repLogging.ts';
import { TimerPhase } from '../types.ts';

const target = { sessionId: 's1', roundId: 's1-r2' };
const open = { sessionId: 's1', openRoundId: 's1-r2' };

test('one tap sets an outcome, another replaces it, and clear returns to not logged', () => {
  let book = createRoundLogBook();
  book = applyRoundLogEdit(book, { ...target, type: 'SET_OUTCOME', outcome: 'CLEAN' }, open);
  assert.equal(book.get('s1-r2')?.outcome, 'CLEAN');

  book = applyRoundLogEdit(
    book,
    { ...target, type: 'SET_OUTCOME', outcome: 'WRONG_FIRST_STEP' },
    open
  );
  assert.equal(book.get('s1-r2')?.outcome, 'WRONG_FIRST_STEP');

  book = applyRoundLogEdit(book, { ...target, type: 'CLEAR_OUTCOME' }, open);
  assert.equal(book.get('s1-r2'), undefined);
});

test('clearing an outcome keeps a separately entered time', () => {
  let book = createRoundLogBook();
  book = applyRoundLogEdit(book, { ...target, type: 'SET_TIME', timeMs: 1520 }, open);
  book = applyRoundLogEdit(book, { ...target, type: 'SET_OUTCOME', outcome: 'CLEAN' }, open);
  book = applyRoundLogEdit(book, { ...target, type: 'CLEAR_OUTCOME' }, open);
  assert.deepEqual(book.get('s1-r2'), { selfReportedTimeMs: 1520 });

  book = applyRoundLogEdit(book, { ...target, type: 'CLEAR_TIME' }, open);
  assert.equal(book.get('s1-r2'), undefined);
});

test('committing a time does not choose an outcome', () => {
  const book = applyRoundLogEdit(
    createRoundLogBook(),
    { ...target, type: 'SET_TIME', timeMs: 2000 },
    open
  );
  assert.deepEqual(book.get('s1-r2'), { selfReportedTimeMs: 2000 });
});

test('late edits after REST closes, and edits for another round or session, are rejected', () => {
  const book = createRoundLogBook();
  const edit = { ...target, type: 'SET_OUTCOME' as const, outcome: 'CLEAN' as const };

  // Next WORK started: no round is open.
  assert.equal(applyRoundLogEdit(book, edit, { sessionId: 's1', openRoundId: null }), book);
  // The next REST is open for round 3; a stale round-2 touch is dropped.
  assert.equal(applyRoundLogEdit(book, edit, { sessionId: 's1', openRoundId: 's1-r3' }), book);
  // A different session never accepts the edit.
  assert.equal(applyRoundLogEdit(book, edit, { sessionId: 's2', openRoundId: 's1-r2' }), book);
});

test('invalid committed times are rejected, never stored as zero', () => {
  const book = createRoundLogBook();
  for (const timeMs of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 60_001]) {
    assert.equal(applyRoundLogEdit(book, { ...target, type: 'SET_TIME', timeMs }, open), book);
  }
  const rounded = applyRoundLogEdit(book, { ...target, type: 'SET_TIME', timeMs: 1234.6 }, open);
  assert.equal(rounded.get('s1-r2')?.selfReportedTimeMs, 1235);
});

test('only the round whose REST is running is open; final REST included', () => {
  const plan = { sessionId: 's1', rounds: [{ id: 's1-r1' }, { id: 's1-r2' }] };
  assert.equal(getOpenLogRoundId(plan, TimerPhase.REST, 1, 20), 's1-r1');
  assert.equal(getOpenLogRoundId(plan, TimerPhase.REST, 2, 20), 's1-r2');
  assert.equal(getOpenLogRoundId(plan, TimerPhase.WORK, 2, 20), null);
  assert.equal(getOpenLogRoundId(plan, TimerPhase.PREP, 1, 20), null);
  assert.equal(getOpenLogRoundId(plan, TimerPhase.COOL_DOWN, 2, 20), null);
  assert.equal(getOpenLogRoundId(plan, TimerPhase.FINISHED, 2, 20), null);
  // A zero-length rest has no logging window; the timer never pauses to add one.
  assert.equal(getOpenLogRoundId(plan, TimerPhase.REST, 1, 0), null);
});

test('parses decimal seconds drafts into integer milliseconds', () => {
  assert.equal(parseSelfReportedTime('1.52'), 1520);
  assert.equal(parseSelfReportedTime('2'), 2000);
  assert.equal(parseSelfReportedTime('0.8'), 800);
  assert.equal(parseSelfReportedTime('.75'), 750);
  assert.equal(parseSelfReportedTime('1,25'), 1250);
  assert.equal(parseSelfReportedTime('1.2345'), 1235);
  assert.equal(parseSelfReportedTime('60'), 60_000);
  for (const draft of ['', ' ', '.', '0', '0.0', '-1', '1.2.3', 'abc', '61', '1e3']) {
    assert.equal(parseSelfReportedTime(draft), null, draft);
  }
  assert.equal(formatSelfReportedTime(1520), '1.52 s');
  assert.equal(formatSelfReportedTime(2000), '2.00 s');
});

test('attaches logs to round records without fabricating observations', () => {
  const item: WorkoutHistoryItem = {
    id: 's1',
    date: '2026-09-25T10:00:00.000Z',
    duration: 60,
    session: {
      planVersion: 1,
      drillType: 'REACTIVE',
      stoppingInstruction: '',
      config: {} as never,
      rounds: [
        { id: 's1-r1', roundNumber: 1, condition: 'REACTIVE', fakeOut: false, events: [] },
        { id: 's1-r2', roundNumber: 2, condition: 'REACTIVE', fakeOut: false, events: [] },
      ],
    },
  };
  const book = applyRoundLogEdit(
    applyRoundLogEdit(
      createRoundLogBook(),
      { sessionId: 's1', roundId: 's1-r1', type: 'SET_OUTCOME', outcome: 'MISSED_STOPPED' },
      { sessionId: 's1', openRoundId: 's1-r1' }
    ),
    { sessionId: 's1', roundId: 's1-r1', type: 'SET_TIME', timeMs: 1800 },
    { sessionId: 's1', openRoundId: 's1-r1' }
  );

  const attached = attachRoundLogs(item, book);
  assert.equal(attached.session?.rounds[0].outcome, 'MISSED_STOPPED');
  assert.equal(attached.session?.rounds[0].selfReportedTimeMs, 1800);
  assert.equal('outcome' in (attached.session?.rounds[1] ?? {}), false);
  assert.equal('selfReportedTimeMs' in (attached.session?.rounds[1] ?? {}), false);
  // Legacy summary-only items pass through untouched.
  const legacy = { date: '2025-01-01T00:00:00.000Z', duration: 60 };
  assert.equal(attachRoundLogs(legacy, book), legacy);
});

test('normalizes optional session notes with bounded text', () => {
  assert.equal(normalizeSessionNotes({}), undefined);
  assert.equal(normalizeSessionNotes({ text: '   ', painLocation: 'knee' }), undefined);
  assert.deepEqual(normalizeSessionNotes({ energy: 3.6, surface: 'TURF' }), {
    energy: 4,
    surface: 'TURF',
  });
  assert.equal(normalizeSessionNotes({ energy: 9 })?.energy, 5);
  assert.equal(normalizeSessionNotes({ energy: 0 })?.energy, 1);
  assert.equal(normalizeSessionNotes({ energy: Number.NaN }), undefined);
  assert.equal(normalizeSessionNotes({ surface: 'LAVA' }), undefined);
  assert.deepEqual(normalizeSessionNotes({ pain: true, painLocation: '  left ankle ' }), {
    pain: true,
    painLocation: 'left ankle',
  });
  assert.deepEqual(normalizeSessionNotes({ pain: false, painLocation: 'ignored' }), {
    pain: false,
  });
  assert.equal(
    normalizeSessionNotes({ pain: true, painLocation: 'x'.repeat(100) })?.painLocation?.length,
    MAX_PAIN_LOCATION_LENGTH
  );
  assert.equal(
    normalizeSessionNotes({ text: 'y'.repeat(1000) })?.text?.length,
    MAX_NOTES_TEXT_LENGTH
  );
});

test('updates a saved session by id without adding rows; skip or unknown id changes nothing', () => {
  const history: WorkoutHistoryItem[] = [
    { id: 's2', date: '2026-09-25T10:00:00.000Z', duration: 60 },
    { date: '2025-01-01T00:00:00.000Z', duration: 30 },
  ];
  const once = applySessionNotes(history, 's2', { energy: 4 });
  assert.equal(once.length, 2);
  assert.deepEqual(once[0].notes, { energy: 4 });
  assert.equal(once[1], history[1]);

  // A double tap with the same notes is a no-op.
  assert.equal(applySessionNotes(once, 's2', { energy: 4 }), once);
  // Replacing notes updates in place.
  assert.deepEqual(applySessionNotes(once, 's2', { energy: 2 })[0].notes, { energy: 2 });
  // Empty notes (skip) leave the saved session untouched.
  assert.equal(applySessionNotes(history, 's2', {}), history);
  assert.equal(applySessionNotes(history, 'missing', { energy: 4 }), history);
});
