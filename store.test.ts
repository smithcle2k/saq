import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';

describe('useStore', () => {
  beforeEach(() => {
    // Reset state before each test if needed
    useStore.setState({
      mode: 'INTERVAL',
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
