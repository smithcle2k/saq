export interface TimerConfig {
  prepTime: number; // in seconds
  workTime: number; // in seconds
  restTime: number; // in seconds
  rounds: number;
  coolDownTime: number; // in seconds
}

export enum TimerPhase {
  IDLE = 'IDLE',
  PREP = 'PREP',
  WORK = 'WORK',
  REST = 'REST',
  COOL_DOWN = 'COOL_DOWN',
  FINISHED = 'FINISHED',
}

export interface WorkoutState {
  phase: TimerPhase;
  currentRound: number;
  timeRemaining: number;
  totalTimeElapsed: number;
  isRunning: boolean;
  isPaused: boolean;
  currentExercise: string | null;
}

export interface WorkoutHistoryItem {
  date: string; // ISO string
  duration: number; // in seconds
}

export type View = 'SETUP' | 'TIMER' | 'SETTINGS' | 'STATS';
