import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { TimerConfig, TimerMode, WorkoutHistoryItem } from './types';

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

const DEFAULT_CONFIGS: ModeConfigMap = {
  INTERVAL: {
    prepTime: 10,
    workTime: 5,
    restTime: 55,
    rounds: 8,
    coolDownTime: 60,
  },
  SAQ: {
    prepTime: 10,
    workTime: 5,
    restTime: 55,
    rounds: 5,
    coolDownTime: 60,
  },
};

const DEFAULT_EXERCISES = ['Straight', 'Left', 'Right', 'Back', 'Turn around'];

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      mode: 'INTERVAL',
      modeConfigs: DEFAULT_CONFIGS,
      exercises: DEFAULT_EXERCISES,
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
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
