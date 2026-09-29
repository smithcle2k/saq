export interface WarmupStep {
  id: string;
  title: string;
  instruction: string;
  durationSeconds: number;
}

export const MIN_WARMUP_STEP_SECONDS = 5;
export const MAX_WARMUP_STEP_SECONDS = 600;

export type WarmupStepsValidation = { isValid: true } | { isValid: false; message: string };

/** Checks the editable warm-up file so a typo there cannot break the timer. */
export const validateWarmupSteps = (steps: readonly WarmupStep[]): WarmupStepsValidation => {
  if (steps.length === 0) return { isValid: false, message: 'Warm-up has no steps.' };
  const ids = new Set<string>();
  for (const step of steps) {
    if (!step.id || ids.has(step.id)) {
      return { isValid: false, message: `Warm-up step id "${step.id}" is missing or repeated.` };
    }
    ids.add(step.id);
    if (!step.title.trim()) return { isValid: false, message: 'Warm-up step has no title.' };
    if (
      !Number.isInteger(step.durationSeconds) ||
      step.durationSeconds < MIN_WARMUP_STEP_SECONDS ||
      step.durationSeconds > MAX_WARMUP_STEP_SECONDS
    ) {
      return {
        isValid: false,
        message: `"${step.title}" needs a whole-second duration of ${MIN_WARMUP_STEP_SECONDS}–${MAX_WARMUP_STEP_SECONDS} s.`,
      };
    }
  }
  return { isValid: true };
};

export const getWarmupTotalSeconds = (steps: readonly WarmupStep[]) =>
  steps.reduce((sum, step) => sum + step.durationSeconds, 0);

export type WarmupStatus = 'RUNNING' | 'PAUSED' | 'DONE';

export interface WarmupState {
  stepIndex: number;
  remainingSeconds: number;
  status: WarmupStatus;
  /** Unpaused seconds actually run; skipped remainders are not counted. */
  activeSeconds: number;
  skippedStepIds: string[];
  skippedAll: boolean;
}

export type WarmupAction =
  | { type: 'TICK'; seconds: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SKIP_STEP' }
  | { type: 'SKIP_ALL' };

export const createWarmupState = (steps: readonly WarmupStep[]): WarmupState => ({
  stepIndex: 0,
  remainingSeconds: steps[0]?.durationSeconds ?? 0,
  status: steps.length > 0 ? 'RUNNING' : 'DONE',
  activeSeconds: 0,
  skippedStepIds: [],
  skippedAll: false,
});

const moveToStep = (state: WarmupState, steps: readonly WarmupStep[], index: number) =>
  index >= steps.length
    ? { ...state, stepIndex: steps.length - 1, remainingSeconds: 0, status: 'DONE' as const }
    : { ...state, stepIndex: index, remainingSeconds: steps[index].durationSeconds };

/** Pure warm-up state machine; the component owns the clock and speech side effects. */
export const warmupReducer = (
  state: WarmupState,
  action: WarmupAction,
  steps: readonly WarmupStep[]
): WarmupState => {
  if (state.status === 'DONE') return state;

  switch (action.type) {
    case 'PAUSE':
      return state.status === 'RUNNING' ? { ...state, status: 'PAUSED' } : state;
    case 'RESUME':
      return state.status === 'PAUSED' ? { ...state, status: 'RUNNING' } : state;
    case 'SKIP_ALL':
      return { ...state, remainingSeconds: 0, status: 'DONE', skippedAll: true };
    case 'SKIP_STEP':
      return moveToStep(
        {
          ...state,
          skippedStepIds: [...state.skippedStepIds, steps[state.stepIndex].id],
        },
        steps,
        state.stepIndex + 1
      );
    case 'TICK': {
      if (state.status !== 'RUNNING' || !(action.seconds > 0)) return state;
      let next = state;
      let seconds = Math.floor(action.seconds);
      // A throttled tick may span several steps; carry the remainder forward.
      while (seconds > 0 && next.status !== 'DONE') {
        const used = Math.min(seconds, next.remainingSeconds);
        seconds -= used;
        next = {
          ...next,
          remainingSeconds: next.remainingSeconds - used,
          activeSeconds: next.activeSeconds + used,
        };
        if (next.remainingSeconds === 0) next = moveToStep(next, steps, next.stepIndex + 1);
      }
      return next;
    }
  }
};
