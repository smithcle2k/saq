import type { CueOutputMode, SessionConfigSnapshot, TimerConfig } from '../types.ts';
import { DEFAULT_CUE_SETTINGS } from './cueSettings.ts';
import { DEFAULT_CUES } from './defaultCues.ts';
import {
  DEFAULT_DRILL_SETTINGS,
  MIN_REACTIVE_WORK_SECONDS,
  validateDrillSession,
} from './drillPlan.ts';

export const REACTIVE_PREP_SECONDS = 10;

export interface ReactiveSetup {
  timerConfig: TimerConfig;
  cueOutputMode: CueOutputMode;
}

/** Only rounds, rest, and output mode vary; older settings cannot steer cue generation. */
export const getReactiveSessionConfig = (setup: ReactiveSetup): SessionConfigSnapshot => ({
  timerConfig: {
    prepTime: REACTIVE_PREP_SECONDS,
    workTime: MIN_REACTIVE_WORK_SECONDS,
    restTime: setup.timerConfig.restTime,
    rounds: setup.timerConfig.rounds,
    coolDownTime: 0,
  },
  enabledCues: [...DEFAULT_CUES],
  cueSettings: {
    ...DEFAULT_CUE_SETTINGS,
    cueWeights: { ...DEFAULT_CUE_SETTINGS.cueWeights },
  },
  drillSettings: { ...DEFAULT_DRILL_SETTINGS, drillType: 'OPEN_REACTIVE' },
  cueOutputMode: setup.cueOutputMode,
});

export const getReactiveSetupError = (snapshot: SessionConfigSnapshot): string | null => {
  if (!Number.isInteger(snapshot.timerConfig.rounds) || snapshot.timerConfig.rounds < 1) {
    return 'Set at least one round.';
  }
  if (!Number.isInteger(snapshot.timerConfig.restTime) || snapshot.timerConfig.restTime < 15) {
    return 'Rest must be at least 15 seconds.';
  }
  const validation = validateDrillSession({
    drillSettings: snapshot.drillSettings,
    cueSettings: snapshot.cueSettings,
    enabledCues: snapshot.enabledCues,
    config: snapshot.timerConfig,
  });
  return validation.isValid ? null : validation.message;
};
