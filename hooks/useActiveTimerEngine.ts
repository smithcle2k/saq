import { useCallback, useEffect, useRef, useState } from 'react';
import { type SpeakOptions } from '../utils/tts';
import { CueEventRole, TimerConfig, TimerPhase } from '../types';
import {
  createInitialSnapshot,
  decrementSnapshot,
  getNextSnapshot,
  TimerSnapshot,
} from '../utils/timerEngine';
import { IntervalCue } from '../utils/intervalCuePlan';
import { getCueScheduleActions } from '../utils/cueScheduler';
import { getDueRoundPreview, toIntervalCuePlan } from '../utils/drillPlan';
import type { RoundPlan, SessionPlan } from '../utils/drillPlan';
import type { SessionDeliveryLog } from '../utils/sessionHistory';

export interface VisibleCue {
  /** Event identity, so consecutive identical labels still re-trigger presentation. */
  key: string;
  label: string;
  role: CueEventRole;
}

interface UseActiveTimerEngineParams {
  config: TimerConfig;
  plan: SessionPlan;
  onAnnounce: (message: string, options?: SpeakOptions) => void;
  onCueDelivered?: (cue: IntervalCue) => void;
  onPreview?: (round: RoundPlan) => void;
  onComplete: (log: SessionDeliveryLog) => void;
}

/**
 * Ticks 4x per second and derives elapsed whole seconds from wall-clock time,
 * so the countdown stays accurate even when the browser throttles timers in a
 * backgrounded tab and catches up as soon as the tab wakes.
 */
const TICK_INTERVAL_MS = 250;

export const useActiveTimerEngine = ({
  config,
  plan,
  onAnnounce,
  onCueDelivered,
  onPreview,
  onComplete,
}: UseActiveTimerEngineParams) => {
  const [timerSnapshot, setTimerSnapshot] = useState<TimerSnapshot>(() =>
    createInitialSnapshot(config)
  );
  const [isPaused, setIsPaused] = useState(false);
  const [currentCue, setCurrentCue] = useState<VisibleCue | null>(null);
  const [previewCue, setPreviewCue] = useState<string>('');
  const timerSnapshotRef = useRef(timerSnapshot);
  const lastTickTimeRef = useRef(0);
  const cueTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const cueScheduleStartedAtRef = useRef<number | null>(null);
  const elapsedCueScheduleMsRef = useRef(0);
  const deliveredCueIdsRef = useRef<Set<number>>(new Set());
  const deliveredEventsRef = useRef<Map<string, number>>(new Map());
  const deliveredPreviewsRef = useRef<Set<string>>(new Set());
  const hasCompletedRef = useRef(false);
  const { phase, timeRemaining, currentRound } = timerSnapshot;

  useEffect(() => {
    timerSnapshotRef.current = timerSnapshot;
  }, [timerSnapshot]);

  const getIntervalPlan = useCallback(
    (roundNumber: number) => toIntervalCuePlan(plan.rounds[roundNumber - 1]),
    [plan]
  );

  const getActiveWorkElapsedMs = () =>
    elapsedCueScheduleMsRef.current +
    (cueScheduleStartedAtRef.current === null ? 0 : Date.now() - cueScheduleStartedAtRef.current);

  const clearCueTimeouts = useCallback(() => {
    cueTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    cueTimeoutsRef.current = [];
  }, []);

  const resetCueSchedule = useCallback(() => {
    clearCueTimeouts();
    cueScheduleStartedAtRef.current = null;
    elapsedCueScheduleMsRef.current = 0;
    deliveredCueIdsRef.current.clear();
  }, [clearCueTimeouts]);

  const scheduleCuePlan = useCallback(
    (cuePlan: IntervalCue[], roundNumber: number, elapsedMs = 0) => {
      clearCueTimeouts();

      cueTimeoutsRef.current = getCueScheduleActions(
        cuePlan,
        elapsedMs,
        deliveredCueIdsRef.current
      ).map(({ cue, delayMs }) =>
        setTimeout(() => {
          const snapshot = timerSnapshotRef.current;
          // Stale callbacks from an earlier round or phase never emit.
          if (snapshot.phase !== TimerPhase.WORK || snapshot.currentRound !== roundNumber) return;
          if (deliveredCueIdsRef.current.has(cue.id)) return;

          deliveredCueIdsRef.current.add(cue.id);
          const eventKey = cue.eventId ?? `${roundNumber}-${cue.id}`;
          deliveredEventsRef.current.set(eventKey, Math.round(getActiveWorkElapsedMs()));

          setCurrentCue({ key: eventKey, label: cue.label, role: cue.role ?? 'TARGET' });
          onCueDelivered?.(cue);
          if (cue.speak ?? true) {
            onAnnounce(cue.announcement ?? cue.label, {
              interrupt: cue.interrupt ?? true,
              afterPreviousEndMs: cue.afterPreviousEndMs,
              rate: cue.rate,
            });
          }
        }, delayMs)
      );
    },
    [clearCueTimeouts, onAnnounce, onCueDelivered]
  );

  const triggerPhaseTransition = useCallback(() => {
    if (timerSnapshot.phase === TimerPhase.WORK) {
      resetCueSchedule();
    }

    const next = getNextSnapshot(timerSnapshot, config, getIntervalPlan);
    const nextSnapshot: TimerSnapshot = {
      phase: next.phase,
      timeRemaining: next.timeRemaining,
      currentRound: next.currentRound,
      currentExercise: next.currentExercise,
      cuePlan: next.cuePlan,
    };
    // Update the ref synchronously so a 0 ms cue timeout sees the new phase.
    timerSnapshotRef.current = nextSnapshot;
    setTimerSnapshot(nextSnapshot);
    setCurrentCue(null);
    setPreviewCue('');

    if (next.announcement) {
      onAnnounce(next.announcement);
    }

    if (next.phase === TimerPhase.WORK && next.cuePlan.length > 0) {
      deliveredCueIdsRef.current.clear();
      elapsedCueScheduleMsRef.current = 0;
      cueScheduleStartedAtRef.current = Date.now();
      scheduleCuePlan(next.cuePlan, next.currentRound);
    }

    if (next.phase === TimerPhase.FINISHED && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete({
        deliveredEvents: new Map(deliveredEventsRef.current),
        deliveredPreviews: new Set(deliveredPreviewsRef.current),
      });
    }
  }, [
    timerSnapshot,
    config,
    getIntervalPlan,
    onAnnounce,
    onComplete,
    resetCueSchedule,
    scheduleCuePlan,
  ]);

  const tick = useCallback(() => {
    const now = Date.now();
    if (lastTickTimeRef.current === 0) {
      lastTickTimeRef.current = now;
    }

    if (isPaused) {
      lastTickTimeRef.current = now;
      return;
    }

    const elapsedMs = now - lastTickTimeRef.current;
    if (elapsedMs < 1000) return;

    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    lastTickTimeRef.current += elapsedSeconds * 1000;
    setTimerSnapshot((prev) => decrementSnapshot(prev, elapsedSeconds));
  }, [isPaused]);

  useEffect(() => {
    const timerId = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(timerId);
  }, [tick]);

  useEffect(() => {
    if (isPaused) return;
    if (phase === TimerPhase.FINISHED) return;
    if (timeRemaining === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      triggerPhaseTransition();
    }
  }, [timeRemaining, isPaused, phase, triggerPhaseTransition]);

  // Planned previews follow the countdown, so pausing freezes them with the timer.
  useEffect(() => {
    if (isPaused) return;
    const round = getDueRoundPreview(
      plan,
      config,
      phase,
      currentRound,
      timeRemaining,
      deliveredPreviewsRef.current
    );
    if (!round?.preview) return;
    deliveredPreviewsRef.current.add(round.id);
    setPreviewCue(round.preview.label);
    onPreview?.(round);
  }, [plan, config, phase, currentRound, timeRemaining, isPaused, onPreview]);

  useEffect(() => {
    return () => {
      resetCueSchedule();
    };
  }, [resetCueSchedule]);

  const togglePause = useCallback(() => {
    const nextPaused = !isPaused;
    const snapshot = timerSnapshotRef.current;

    if (!nextPaused) {
      lastTickTimeRef.current = Date.now();
    }

    if (snapshot.phase === TimerPhase.WORK && snapshot.cuePlan.length > 0) {
      if (nextPaused) {
        if (cueScheduleStartedAtRef.current !== null) {
          elapsedCueScheduleMsRef.current += Date.now() - cueScheduleStartedAtRef.current;
        }
        cueScheduleStartedAtRef.current = null;
        clearCueTimeouts();
      } else {
        cueScheduleStartedAtRef.current = Date.now();
        scheduleCuePlan(snapshot.cuePlan, snapshot.currentRound, elapsedCueScheduleMsRef.current);
      }
    }

    setIsPaused(nextPaused);
  }, [isPaused, clearCueTimeouts, scheduleCuePlan]);

  /** Latest committed snapshot, ahead of render; used to reject late REST input. */
  const getTimerSnapshot = useCallback(() => timerSnapshotRef.current, []);

  return {
    phase,
    timeRemaining,
    currentRound,
    currentCue,
    previewCue,
    cuePlan: timerSnapshot.cuePlan,
    isPaused,
    togglePause,
    getTimerSnapshot,
  };
};
