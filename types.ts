export type TimerMode = 'INTERVAL' | 'SAQ';

export interface TimerConfig {
  mode: TimerMode;
  prepTime: number;
  workTime: number;
  restTime: number;
  rounds: number;
  coolDownTime: number;
}

export enum TimerPhase {
  PREP = 'PREP',
  WORK = 'WORK',
  REST = 'REST',
  COOL_DOWN = 'COOL_DOWN',
  FINISHED = 'FINISHED',
}

export interface WorkoutHistoryItem {
  date: string;
  duration: number;
}

export type View = 'SETUP' | 'TIMER' | 'SETTINGS' | 'STATS';
