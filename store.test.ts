import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_CONFIGS, useStore } from './store';
import { DEFAULT_CUES, LEGACY_DEFAULT_CUES, PREVIOUS_DEFAULT_CUES } from './utils/defaultCues';

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({
      mode: 'INTERVAL',
      modeConfigs: DEFAULT_CONFIGS,
      exercises: DEFAULT_CUES,
      history: [],
      tutorialSeen: false,
    });
  });

  it('should initialize with default mode INTERVAL', () => {
    const state = useStore.getState();
    expect(state.mode).toBe('INTERVAL');
  });

  it('should update mode correctly', () => {
    useStore.getState().setMode('SAQ');
    expect(useStore.getState().mode).toBe('SAQ');
  });

  it('should initialize cooldown to zero for both modes', () => {
    const state = useStore.getState();

    expect(state.modeConfigs.INTERVAL.coolDownTime).toBe(0);
    expect(state.modeConfigs.SAQ.coolDownTime).toBe(0);
  });

  it('should initialize slow mode on for interval and off for SAQ', () => {
    const state = useStore.getState();

    expect(state.modeConfigs.INTERVAL.slowMode).toBe(true);
    expect(state.modeConfigs.SAQ.slowMode).toBe(false);
  });

  it('should initialize SAQ work to three seconds', () => {
    const state = useStore.getState();

    expect(state.modeConfigs.SAQ.workTime).toBe(3);
  });

  it('should initialize interval rest to fifty-five seconds', () => {
    const state = useStore.getState();

    expect(state.modeConfigs.INTERVAL.restTime).toBe(55);
  });

  it('should migrate the legacy default cues to the current defaults', async () => {
    const migrate = useStore.persist.getOptions().migrate;
    const migratedState = await migrate?.({ exercises: LEGACY_DEFAULT_CUES }, 3);

    expect(migratedState?.exercises).toEqual(DEFAULT_CUES);
  });

  it('should migrate the previous stock default cues to the current defaults', async () => {
    const migrate = useStore.persist.getOptions().migrate;
    const migratedState = await migrate?.({ exercises: PREVIOUS_DEFAULT_CUES }, 6);

    expect(migratedState?.exercises).toEqual(DEFAULT_CUES);
  });

  it('should backfill slow mode during migration', async () => {
    const migrate = useStore.persist.getOptions().migrate;
    const migratedState = await migrate?.(
      {
        modeConfigs: {
          INTERVAL: { prepTime: 10, workTime: 5, restTime: 55, rounds: 8, coolDownTime: 0 },
          SAQ: { prepTime: 10, workTime: 4, restTime: 55, rounds: 5, coolDownTime: 0 },
        },
      },
      4
    );

    expect(migratedState?.modeConfigs.INTERVAL.slowMode).toBe(true);
    expect(migratedState?.modeConfigs.SAQ.slowMode).toBe(false);
    expect(migratedState?.modeConfigs.SAQ.workTime).toBe(3);
  });

  it('should add item to history', () => {
    const mockItem = {
      date: new Date().toISOString(),
      duration: 300,
    };

    useStore.getState().addHistoryItem(mockItem);

    const history = useStore.getState().history;
    expect(history.length).toBe(1);
    expect(history[0].duration).toBe(300);
  });
});
