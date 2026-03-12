import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_CONFIGS, useStore } from './store';

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({
      mode: 'INTERVAL',
      modeConfigs: DEFAULT_CONFIGS,
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
