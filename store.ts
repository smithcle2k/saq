import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { TimerConfig, TimerMode, WorkoutHistoryItem } from './types';
import { DEFAULT_CUES, LEGACY_DEFAULT_CUES, matchesCueList } from './utils/defaultCues';

// IndexedDB storage for Zustand to prevent UI freezes on large payloads
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

type ModeConfigMap = Record<TimerMode, Omit<TimerConfig, 'mode'>>;

interface PersistedAppState {
  mode?: TimerMode;
  modeConfigs?: Partial<Record<TimerMode, Partial<Omit<TimerConfig, 'mode'>>>>;
  exercises?: string[];
  history?: WorkoutHistoryItem[];
  tutorialSeen?: boolean;
}

interface AppState {
  mode: TimerMode;
  modeConfigs: ModeConfigMap;
  exercises: string[];
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
  },
  SAQ: {
    prepTime: 10,
    workTime: 4,
    restTime: 55,
    rounds: 5,
    coolDownTime: 0,
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

  if (
    mode === 'SAQ' &&
    version < 3 &&
    (persistedConfig?.workTime === 5 || persistedConfig?.workTime === 3)
  ) {
    nextConfig.workTime = 4;
  }

  return nextConfig;
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      mode: 'INTERVAL',
      modeConfigs: DEFAULT_CONFIGS,
      exercises: DEFAULT_CUES,
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
        set((state) => ({
          exercises: typeof updater === 'function' ? updater(state.exercises) : updater,
        })),
      addHistoryItem: (item) =>
        set((state) => ({
          history: [item, ...state.history],
        })),
      setHistory: (history) => set({ history }),
      setTutorialSeen: (seen) => set({ tutorialSeen: seen }),
    }),
    {
      name: 'interval-trainer-storage',
      version: 4,
      storage: createJSONStorage(() => idbStorage),
      migrate: (persistedState: unknown, version) => {
        const state = (persistedState ?? {}) as PersistedAppState;
        const modeConfigs = state.modeConfigs ?? {};
        const exercises =
          version < 4 && state.exercises && matchesCueList(state.exercises, LEGACY_DEFAULT_CUES)
            ? DEFAULT_CUES
            : state.exercises;

        return {
          ...state,
          exercises,
          modeConfigs: {
            INTERVAL: mergeModeConfig('INTERVAL', modeConfigs.INTERVAL, version),
            SAQ: mergeModeConfig('SAQ', modeConfigs.SAQ, version),
          },
        };
      },
    }
  )
);
