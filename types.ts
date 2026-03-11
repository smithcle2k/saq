export type TimerMode = 'INTERVAL' | 'SAQ';

export interface TimerConfig {
  mode: TimerMode;
  prepTime: number; // in seconds
  workTime: number; // in seconds
  restTime: number; // in seconds
  rounds: number;
  coolDownTime: number; // in seconds
}

export enum TimerPhase {
  PREP = 'PREP',
  WORK = 'WORK',
  REST = 'REST',
  COOL_DOWN = 'COOL_DOWN',
  FINISHED = 'FINISHED',
}

export interface WorkoutHistoryItem {
  date: string; // ISO string
  duration: number; // in seconds
}

export type View = 'SETUP' | 'TIMER' | 'SETTINGS' | 'STATS';

// Screen Wake Lock API types
declare global {
  interface Navigator {
    wakeLock?: {
      request(type: 'screen'): Promise<WakeLockSentinel>;
    };
  }

  interface WakeLockSentinel extends EventTarget {
    readonly released: boolean;
    readonly type: 'screen';
    release(): Promise<void>;
  }
}
