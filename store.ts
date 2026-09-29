import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  CueOutputMode,
  DrillSettings,
  ProgressionSettings,
  ProgressionStage,
  SessionConfigSnapshot,
  SessionPreset,
  TimerConfig,
  WorkoutHistoryItem,
} from './types';
import { normalizeDrillSettings } from './utils/drillPlan';
import type { DrillSettingsInput } from './utils/drillPlan';
import { addCompletedSession, createSessionId } from './utils/sessionHistory';
import {
  createUserPreset,
  deletePreset,
  getCurrentSessionConfig,
  renamePreset,
  validateSessionConfig,
} from './utils/sessionPresets';
import { applyProgressionStage, DEFAULT_PROGRESSION } from './utils/progression';
import { applySessionNotes } from './utils/repLogging';
import type { SessionNotesInput } from './utils/repLogging';
import { DEFAULT_CUES, normalizeIntervalEnabledCues } from './utils/defaultCues';
import { normalizeCueSettings } from './utils/cueSettings';
import type { CueSettings, CueSettingsInput } from './utils/cueSettings';
import {
  DEFAULT_TIMER_CONFIG,
  migratePersistedAppState,
  normalizeHydratedAppState,
} from './utils/storeMigrations';

interface AppState {
  timerConfig: TimerConfig;
  exercises: string[];
  history: WorkoutHistoryItem[];
  tutorialSeen: boolean;
  soundEffectsEnabled: boolean;
  hapticsEnabled: boolean;
  cueSettings: CueSettings;
  cueOutputMode: CueOutputMode;
  drillSettings: DrillSettings;
  savedPresets: SessionPreset[];
  warmupEnabled: boolean;
  progression: ProgressionSettings;

  setSoundEffectsEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setCueSettings: (updater: CueSettingsInput | ((prev: CueSettings) => CueSettingsInput)) => void;
  setCueOutputMode: (mode: CueOutputMode) => void;
  setDrillSettings: (
    updater: DrillSettingsInput | ((prev: DrillSettings) => DrillSettingsInput)
  ) => void;
  setTimerConfig: (updater: TimerConfig | ((prev: TimerConfig) => TimerConfig)) => void;
  setExercises: (exercises: string[] | ((prev: string[]) => string[])) => void;
  addHistoryItem: (item: WorkoutHistoryItem) => void;
  /** Saves a completed session once; repeated calls with the same id are ignored. */
  saveCompletedSession: (item: WorkoutHistoryItem) => void;
  /** Adds optional notes to an already-saved session by id; never adds a row. */
  updateSessionNotes: (sessionId: string, notes: SessionNotesInput) => void;
  setHistory: (history: WorkoutHistoryItem[]) => void;
  setTutorialSeen: (seen: boolean) => void;
  /** Replaces every setup field in one update, or nothing if the config is invalid. */
  applySessionConfig: (config: SessionConfigSnapshot) => ActionResult;
  saveCurrentAsPreset: (name: string) => ActionResult;
  renameSavedPreset: (id: string, name: string) => ActionResult;
  deleteSavedPreset: (id: string) => void;
  setWarmupEnabled: (enabled: boolean) => void;
  setProgressionEnabled: (enabled: boolean) => void;
  /** User action: moves setup (and, if different, the opted-in stage) to this stage. */
  applyStage: (stage: ProgressionStage) => ActionResult;
}

export type ActionResult = { ok: true } | { ok: false; message: string };

const configFields = (config: SessionConfigSnapshot) => ({
  timerConfig: config.timerConfig,
  exercises: config.enabledCues,
  cueSettings: config.cueSettings,
  drillSettings: config.drillSettings,
  cueOutputMode: config.cueOutputMode,
});

export const DEFAULT_CONFIG = DEFAULT_TIMER_CONFIG;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      timerConfig: DEFAULT_CONFIG,
      exercises: DEFAULT_CUES,
      history: [],
      tutorialSeen: false,
      soundEffectsEnabled: true,
      hapticsEnabled: true,
      cueSettings: normalizeCueSettings(undefined),
      cueOutputMode: 'BOTH',
      drillSettings: normalizeDrillSettings(undefined),
      savedPresets: [],
      warmupEnabled: false,
      progression: DEFAULT_PROGRESSION,

      setSoundEffectsEnabled: (enabled) => set({ soundEffectsEnabled: enabled }),
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      setCueSettings: (updater) =>
        set((state) => ({
          cueSettings: normalizeCueSettings(
            typeof updater === 'function' ? updater(state.cueSettings) : updater
          ),
        })),
      setCueOutputMode: (cueOutputMode) => set({ cueOutputMode }),
      setDrillSettings: (updater) =>
        set((state) => ({
          drillSettings: normalizeDrillSettings(
            typeof updater === 'function' ? updater(state.drillSettings) : updater
          ),
        })),
      setTimerConfig: (updater) =>
        set((state) => ({
          timerConfig: typeof updater === 'function' ? updater(state.timerConfig) : updater,
        })),
      setExercises: (updater) =>
        set((state) => {
          const next = typeof updater === 'function' ? updater(state.exercises) : updater;
          return { exercises: normalizeIntervalEnabledCues(next) };
        }),
      addHistoryItem: (item) =>
        set((state) => ({
          history: [item, ...state.history],
        })),
      saveCompletedSession: (item) =>
        set((state) => {
          const history = addCompletedSession(state.history, item);
          return history === state.history ? state : { history };
        }),
      updateSessionNotes: (sessionId, notes) =>
        set((state) => {
          const history = applySessionNotes(state.history, sessionId, notes);
          return history === state.history ? state : { history };
        }),
      setHistory: (history) => set({ history }),
      setTutorialSeen: (seen) => set({ tutorialSeen: seen }),
      applySessionConfig: (config) => {
        const validation = validateSessionConfig(config);
        if (!validation.isValid) return { ok: false, message: validation.message };
        set(configFields(validation.config));
        return { ok: true };
      },
      saveCurrentAsPreset: (name) => {
        const state = get();
        const result = createUserPreset(state.savedPresets, {
          id: `preset-${createSessionId()}`,
          name,
          config: getCurrentSessionConfig(state),
        });
        if (!result.ok) return result;
        set({ savedPresets: result.presets });
        return { ok: true };
      },
      renameSavedPreset: (id, name) => {
        const result = renamePreset(get().savedPresets, id, name);
        if (!result.ok) return result;
        set({ savedPresets: result.presets });
        return { ok: true };
      },
      deleteSavedPreset: (id) =>
        set((state) => ({ savedPresets: deletePreset(state.savedPresets, id) })),
      setWarmupEnabled: (warmupEnabled) => set({ warmupEnabled }),
      setProgressionEnabled: (enabled) =>
        set((state) => ({
          // Re-opting in starts a fresh run: earlier sessions never count.
          progression: { ...state.progression, enabled, stageSetAt: new Date().toISOString() },
        })),
      applyStage: (stage) => {
        const state = get();
        const result = applyProgressionStage(stage, getCurrentSessionConfig(state));
        if (!result.isValid) return { ok: false, message: result.message };
        set({
          ...configFields(result.config),
          progression:
            state.progression.stage === stage
              ? state.progression
              : { ...state.progression, stage, stageSetAt: new Date().toISOString() },
        });
        return { ok: true };
      },
    }),
    {
      name: 'interval-trainer-storage',
      // 18: optional round outcomes/self-reported times and session notes (additive).
      // 19: saved presets, warm-up toggle and opt-in progression (additive).
      version: 19,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: migratePersistedAppState,
      merge: (persistedState, currentState) =>
        normalizeHydratedAppState({
          ...currentState,
          ...(persistedState as Partial<AppState>),
        }),
    }
  )
);
