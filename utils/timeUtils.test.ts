import { describe, it, expect } from 'vitest';
import { formatTime, calculateTotalTime } from './timeUtils';

describe('timeUtils', () => {
  describe('formatTime', () => {
    it('should format seconds correctly into MM:SS', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(9)).toBe('00:09');
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(95)).toBe('01:35');
      expect(formatTime(3599)).toBe('59:59');
    });
  });

  describe('calculateTotalTime', () => {
    it('should calculate the total workout time based on config', () => {
      const config = {
        prepTime: 10,
        workTime: 30,
        restTime: 10,
        rounds: 3,
        coolDownTime: 60,
      };

      // Total = 10 + (30 + 10)*3 + 60
      // Total = 10 + 120 + 60 = 190
      expect(calculateTotalTime(config)).toBe(190);
    });

    it('should handle zero rounds correctly', () => {
      const config = {
        prepTime: 10,
        workTime: 30,
        restTime: 10,
        rounds: 0,
        coolDownTime: 60,
      };

      // Total = 10 + 0 + 60 = 70
      expect(calculateTotalTime(config)).toBe(70);
    });
  });
});
