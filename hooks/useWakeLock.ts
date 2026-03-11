import { useCallback, useEffect } from 'react';
import NoSleep from 'nosleep.js';

// Create a singleton instance so it can be enabled/disabled correctly
const noSleep = new NoSleep();

export const useWakeLock = () => {
  const requestWakeLock = useCallback(() => {
    try {
      if (!noSleep.isEnabled) {
        noSleep.enable();
      }
    } catch (err) {
      console.log('Wake lock request failed:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    try {
      if (noSleep.isEnabled) {
        noSleep.disable();
      }
    } catch (err) {
      console.log('Wake lock release failed:', err);
    }
  }, []);

  useEffect(() => {
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      } else {
        // Optionally disable when in background to save battery,
        // but interval timers usually shouldn't.
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestWakeLock, releaseWakeLock]);
};
