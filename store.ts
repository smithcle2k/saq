import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { TimerConfig, TimerMode, WorkoutHistoryItem } from './types';
import {
  DEFAULT_CUES,
  SAQ_DEFAULT_CUES,
  LEGACY_DEFAULT_CUES,
  PREVIOUS_DEFAULT_CUES,
  matchesCueList,
} from './utils/defaultCues';

type ModeConfigMap = Record<TimerMode, Omit<TimerConfig, 'mode'>>;

interface PersistedAppState {
  mode?: TimerMode;
  modeConfigs?: Partial<Record<TimerMode, Partial<Omit<TimerConfig, 'mode'>>>>;
  exercises?: string[];
  exercisesByMode?: Partial<Record<TimerMode, string[]>>;
  history?: WorkoutHistoryItem[];
  tutorialSeen?: boolean;
}

interface AppState {
  mode: TimerMode;
  modeConfigs: ModeConfigMap;
  exercisesByMode: Record<TimerMode, string[]>;
  history: WorkoutHistoryItem[];
  tutorialSeen: boolean;

  setMode: (mode: TimerMode) => void;
  setModeConfigs: (updater: ModeConfigMap | ((prev: ModeConfigMap) => ModeConfigMap)) => void;
  setConfigForMode: (mode: TimerMode, config: Omit<TimerConfig, 'mode'>) => void;
  setExercises: (exercises: string[] | ((prev: string[]) => string[])) => void;
  addHistoryItem: (item: WorkoutHistoryItem) => void;
  setHistory: (history: WorkoutHistoryItem[]) => void;
  setTutorialSeen: (seen: boolean) => void;
}

export const DEFAULT_CONFIGS: ModeConfigMap = {
  INTERVAL: {
    prepTime: 10,
    workTime: 5,
    restTime: 55,
    rounds: 8,
    coolDownTime: 0,
    slowMode: true,
  },
  SAQ: {
    prepTime: 10,
    workTime: 5,
    restTime: 55,
    rounds: 5,
    coolDownTime: 0,
    slowMode: false,
  },
};

const mergeModeConfig = (
  mode: TimerMode,
  persistedConfig: Partial<Omit<TimerConfig, 'mode'>> | undefined,
  version: number
) => {
  const defaults = DEFAULT_CONFIGS[mode];
  const nextConfig = {
    ...defaults,
    ...persistedConfig,
  };

  if (version < 1 && persistedConfig?.coolDownTime === 60) {
    nextConfig.coolDownTime = 0;
  }

  if (mode === 'SAQ' && version < 8) {
    nextConfig.workTime = 5;
  }

  return nextConfig;
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      mode: 'INTERVAL',
      modeConfigs: DEFAULT_CONFIGS,
      exercisesByMode: { INTERVAL: DEFAULT_CUES, SAQ: SAQ_DEFAULT_CUES },
      history: [],
      tutorialSeen: false,

      setMode: (mode) => set({ mode }),
      setModeConfigs: (updater) =>
        set((state) => ({
          modeConfigs: typeof updater === 'function' ? updater(state.modeConfigs) : updater,
        })),
      setConfigForMode: (mode, config) =>
        set((state) => ({
          modeConfigs: {
            ...state.modeConfigs,
            [mode]: config,
          },
        })),
      setExercises: (updater) =>
        set((state) => {
          const current = state.exercisesByMode[state.mode];
          const next = typeof updater === 'function' ? updater(current) : updater;
          return { exercisesByMode: { ...state.exercisesByMode, [state.mode]: next } };
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
      version: 8,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: unknown, version) => {
        const state = (persistedState ?? {}) as PersistedAppState;
        const modeConfigs = state.modeConfigs ?? {};

        const legacyExercises = state.exercises;
        const intervalExercises =
          (version < 4 &&
            legacyExercises &&
            matchesCueList(legacyExercises, LEGACY_DEFAULT_CUES)) ||
          (version < 7 && legacyExercises && matchesCueList(legacyExercises, PREVIOUS_DEFAULT_CUES))
            ? DEFAULT_CUES
            : (legacyExercises ?? DEFAULT_CUES);

        const exercisesByMode: Record<TimerMode, string[]> = {
          INTERVAL: state.exercisesByMode?.INTERVAL ?? intervalExercises,
          SAQ: SAQ_DEFAULT_CUES,
        };

        return {
          ...state,
          exercisesByMode,
          modeConfigs: {
            INTERVAL: mergeModeConfig('INTERVAL', modeConfigs.INTERVAL, version),
            SAQ: mergeModeConfig('SAQ', modeConfigs.SAQ, version),
          },
        };
      },
    }
  )
);
