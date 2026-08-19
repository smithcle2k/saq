import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { TimerConfig, TimerMode, WorkoutHistoryItem } from './types';
import { DEFAULT_CUES, normalizeIntervalEnabledCues } from './utils/defaultCues';

interface PersistedAppState {
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
}

interface AppState {
  timerConfig: TimerConfig;
  exercises: string[];
  history: WorkoutHistoryItem[];
  tutorialSeen: boolean;
  soundEffectsEnabled: boolean;
  voiceEnabled: boolean;
  hapticsEnabled: boolean;

  setSoundEffectsEnabled: (enabled: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setTimerConfig: (updater: TimerConfig | ((prev: TimerConfig) => TimerConfig)) => void;
  setExercises: (exercises: string[] | ((prev: string[]) => string[])) => void;
  addHistoryItem: (item: WorkoutHistoryItem) => void;
  setHistory: (history: WorkoutHistoryItem[]) => void;
  setTutorialSeen: (seen: boolean) => void;
}

export const DEFAULT_CONFIG: TimerConfig = {
  prepTime: 10,
  workTime: 5,
  restTime: 55,
  rounds: 8,
  coolDownTime: 0,
};

const mergeTimerConfig = (persistedConfig: Partial<TimerConfig> | undefined, version: number) => {
  const nextConfig = {
    ...DEFAULT_CONFIG,
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

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      timerConfig: DEFAULT_CONFIG,
      exercises: DEFAULT_CUES,
      history: [],
      tutorialSeen: false,
      soundEffectsEnabled: true,
      voiceEnabled: true,
      hapticsEnabled: true,

      setSoundEffectsEnabled: (enabled) => set({ soundEffectsEnabled: enabled }),
      setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
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
      setHistory: (history) => set({ history }),
      setTutorialSeen: (seen) => set({ tutorialSeen: seen }),
    }),
    {
      name: 'interval-trainer-storage',
      version: 14,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: unknown, version) => {
        const state = (persistedState ?? {}) as PersistedAppState;
        const {
          mode,
          modeConfigs,
          exercisesByMode,
          timerConfig: persistedTimerConfig,
          exercises: persistedExercises,
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
        };
      },
    }
  )
);
