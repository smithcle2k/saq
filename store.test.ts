import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_CONFIGS, useStore } from './store';
import { DEFAULT_CUES, LEGACY_DEFAULT_CUES } from './utils/defaultCues';

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

  it('should initialize SAQ work to four seconds', () => {
    const state = useStore.getState();

    expect(state.modeConfigs.SAQ.workTime).toBe(4);
  });

  it('should migrate the legacy default cues to the current defaults', async () => {
    const migrate = useStore.persist.getOptions().migrate;
    const migratedState = await migrate?.({ exercises: LEGACY_DEFAULT_CUES }, 3);

    expect(migratedState?.exercises).toEqual(DEFAULT_CUES);
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
