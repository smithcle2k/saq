import type {
  CueOutputMode,
  DrillSettings,
  ProgressionSettings,
  SessionPreset,
  TimerConfig,
  TimerMode,
  WorkoutHistoryItem,
} from '../types.ts';
import { normalizeIntervalEnabledCues } from './defaultCues.ts';
import { normalizeCueSettings } from './cueSettings.ts';
import type { CueSettings, CueSettingsInput } from './cueSettings.ts';
import { normalizeDrillSettings } from './drillPlan.ts';
import type { DrillSettingsInput } from './drillPlan.ts';
import { normalizeSavedPresets } from './sessionPresets.ts';
import { normalizeProgressionSettings } from './progression.ts';

export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  prepTime: 10,
  workTime: 8,
  restTime: 55,
  rounds: 8,
  coolDownTime: 0,
};

export interface PersistedAppState {
  mode?: TimerMode;
  modeConfigs?: Partial<Record<TimerMode, Partial<TimerConfig>>>;
  timerConfig?: Partial<TimerConfig>;
  exercises?: string[];
  exercisesByMode?: Partial<Record<TimerMode, string[]>>;
  history?: WorkoutHistoryItem[];
  tutorialSeen?: boolean;
  soundEffectsEnabled?: boolean;
  voiceEnabled?: boolean;
  hapticsEnabled?: boolean;
  cueSettings?: CueSettingsInput;
  cueOutputMode?: CueOutputMode;
  drillSettings?: DrillSettingsInput;
  savedPresets?: unknown;
  warmupEnabled?: unknown;
  progression?: unknown;
}

const mergeTimerConfig = (persistedConfig: Partial<TimerConfig> | undefined, version: number) => {
  const nextConfig = {
    ...DEFAULT_TIMER_CONFIG,
    ...persistedConfig,
  };

  if (version < 1 && persistedConfig?.coolDownTime === 60) {
    nextConfig.coolDownTime = 0;
  }

  if (version < 9) {
    delete (nextConfig as { slowMode?: boolean }).slowMode;
  }

  if (version < 11) {
    nextConfig.workTime = 5;
  }

  if (version === 11 && nextConfig.workTime === 3) {
    nextConfig.workTime = 5;
  }

  return nextConfig;
};

export const migratePersistedAppState = (persistedState: unknown, version: number) => {
  const state = (persistedState ?? {}) as PersistedAppState;
  const {
    mode,
    modeConfigs,
    exercisesByMode,
    timerConfig: persistedTimerConfig,
    exercises: persistedExercises,
    cueSettings,
    cueOutputMode,
    drillSettings,
    savedPresets,
    warmupEnabled,
    progression,
    ...rest
  } = state;

  const sourceConfig =
    persistedTimerConfig ??
    (mode === 'SAQ' ? modeConfigs?.SAQ : undefined) ??
    modeConfigs?.INTERVAL;

  return {
    ...rest,
    timerConfig: mergeTimerConfig(sourceConfig, version),
    exercises: normalizeIntervalEnabledCues(persistedExercises ?? exercisesByMode?.INTERVAL),
    cueSettings: normalizeCueSettings(cueSettings),
    cueOutputMode: cueOutputMode ?? (state.voiceEnabled === false ? 'VISUAL_ONLY' : 'BOTH'),
    drillSettings: normalizeDrillSettings(drillSettings),
    // 19: saved presets, guided warm-up toggle and opt-in progression (additive).
    savedPresets: normalizeSavedPresets(savedPresets),
    warmupEnabled: warmupEnabled === true,
    progression: normalizeProgressionSettings(progression),
  };
};

/** Zustand skips migrate() for an already-current version, so hydration normalizes too. */
export const normalizeHydratedAppState = <
  T extends {
    cueSettings?: CueSettingsInput;
    drillSettings?: DrillSettingsInput;
    savedPresets?: unknown;
    warmupEnabled?: unknown;
    progression?: unknown;
  },
>(
  state: T
) =>
  ({
    ...state,
    cueSettings: normalizeCueSettings(state.cueSettings),
    drillSettings: normalizeDrillSettings(state.drillSettings),
    savedPresets: normalizeSavedPresets(state.savedPresets),
    warmupEnabled: state.warmupEnabled === true,
    progression: normalizeProgressionSettings(state.progression),
  }) as Omit<
    T,
    'cueSettings' | 'drillSettings' | 'savedPresets' | 'warmupEnabled' | 'progression'
  > & {
    cueSettings: CueSettings;
    drillSettings: DrillSettings;
    savedPresets: SessionPreset[];
    warmupEnabled: boolean;
    progression: ProgressionSettings;
  };
