export type TimerMode = 'INTERVAL' | 'SAQ';

export interface TimerConfig {
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
  /** Absent on records saved before mode/rounds tracking was added. */
  mode?: TimerMode;
  rounds?: number;
}

export type View = 'SETUP' | 'TIMER' | 'SETTINGS' | 'STATS';
