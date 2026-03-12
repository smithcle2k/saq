import { describe, expect, it } from 'vitest';
import { TimerPhase } from '../types';
import { shouldAnnounceRestFiveSeconds, shouldPlayCountdownBeep } from './timerAlerts';

describe('timerAlerts', () => {
  it('announces five seconds only during an active rest interval', () => {
    expect(shouldAnnounceRestFiveSeconds(TimerPhase.REST, 5, false, false)).toBe(true);
    expect(shouldAnnounceRestFiveSeconds(TimerPhase.REST, 5, true, false)).toBe(false);
    expect(shouldAnnounceRestFiveSeconds(TimerPhase.WORK, 5, false, false)).toBe(false);
    expect(shouldAnnounceRestFiveSeconds(TimerPhase.REST, 4, false, false)).toBe(false);
    expect(shouldAnnounceRestFiveSeconds(TimerPhase.REST, 5, false, true)).toBe(false);
  });

  it('keeps the countdown beep on prep and rest for three seconds or less', () => {
    expect(shouldPlayCountdownBeep(TimerPhase.PREP, 3, false)).toBe(true);
    expect(shouldPlayCountdownBeep(TimerPhase.REST, 2, false)).toBe(true);
    expect(shouldPlayCountdownBeep(TimerPhase.REST, 5, false)).toBe(false);
    expect(shouldPlayCountdownBeep(TimerPhase.WORK, 3, false)).toBe(false);
    expect(shouldPlayCountdownBeep(TimerPhase.REST, 3, true)).toBe(false);
  });
});
