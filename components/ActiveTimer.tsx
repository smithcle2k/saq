import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, X } from 'lucide-react';
import { TimerConfig, TimerPhase } from '../types';
import { formatTime } from '../utils/timeUtils';
import { speak } from '../utils/tts';

// Screen Wake Lock hook to prevent display from sleeping
const useWakeLock = () => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        // Wake lock request failed (e.g., low battery, tab not visible)
        console.log('Wake lock request failed:', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestWakeLock, releaseWakeLock]);
};

interface ActiveTimerProps {
  config: TimerConfig;
  exercises: string[];
  onFinish: () => void;
  onExit: () => void;
}

// Simple beep utility using AudioContext
const playBeep = (freq = 880, duration = 0.1) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error("Audio context error", e);
  }
};

// Phase configuration
const phaseConfig = {
  [TimerPhase.PREP]: {
    bgClass: 'phase-gradient-prep',
    ringColor: '#f59e0b',
    label: 'PREP',
  },
  [TimerPhase.WORK]: {
    bgClass: 'phase-gradient-work',
    ringColor: '#22c55e',
    label: 'WORK',
  },
  [TimerPhase.REST]: {
    bgClass: 'phase-gradient-rest',
    ringColor: '#ef4444',
    label: 'REST',
  },
  [TimerPhase.COOL_DOWN]: {
    bgClass: 'phase-gradient-cooldown',
    ringColor: '#3b82f6',
    label: 'COOL DOWN',
  },
  [TimerPhase.FINISHED]: {
    bgClass: 'phase-gradient-finished',
    ringColor: '#a855f7',
    label: 'DONE',
  },
};

// Round Progress Dots Component
interface RoundDotsProps {
  currentRound: number;
  totalRounds: number;
}

const RoundDots: React.FC<RoundDotsProps> = ({ currentRound, totalRounds }) => {
  // Limit displayed dots to 12, show ellipsis for more
  const maxDots = 12;
  const showDots = Math.min(totalRounds, maxDots);

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      {Array.from({ length: showDots }, (_, i) => (
        <motion.div
          key={i}
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            i < currentRound
              ? 'bg-white'
              : i === currentRound - 1
              ? 'bg-white shadow-lg'
              : 'bg-white/30'
          }`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.05, type: 'spring', stiffness: 400 }}
        />
      ))}
      {totalRounds > maxDots && (
        <span className="text-white/60 text-sm ml-1">+{totalRounds - maxDots}</span>
      )}
    </div>
  );
};

export const ActiveTimer: React.FC<ActiveTimerProps> = ({
  config,
  exercises,
  onFinish,
  onExit,
}) => {
  // Keep screen awake while timer is active
  useWakeLock();

  const [phase, setPhase] = useState<TimerPhase>(TimerPhase.PREP);
  const [timeRemaining, setTimeRemaining] = useState(config.prepTime);
  const [currentRound, setCurrentRound] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<string>('');
  const hasAnnouncedPrepRef = useRef(false);

  useEffect(() => {
    if (hasAnnouncedPrepRef.current) return;
    hasAnnouncedPrepRef.current = true;
    speak('Get ready', { interrupt: true });
  }, []);

  const getRandomExercise = useCallback(() => {
    if (exercises.length === 0) return 'Move';
    const randomIndex = Math.floor(Math.random() * exercises.length);
    return exercises[randomIndex];
  }, [exercises]);

  const startWork = () => {
    setPhase(TimerPhase.WORK);
    setTimeRemaining(config.workTime);
    const exercise = getRandomExercise();
    setCurrentExercise(exercise);
    speak(`Go. ${exercise}`, { interrupt: true });
  };

  const startRest = () => {
    setPhase(TimerPhase.REST);
    setTimeRemaining(config.restTime);
    setCurrentExercise('');
    speak('Rest', { interrupt: true });
  };

  const startCoolDown = () => {
    if (config.coolDownTime > 0) {
      setPhase(TimerPhase.COOL_DOWN);
      setTimeRemaining(config.coolDownTime);
      speak('Cool down', { interrupt: true });
    } else {
      finishWorkout();
    }
  };

  const finishWorkout = () => {
    setPhase(TimerPhase.FINISHED);
    speak('Workout complete', { interrupt: true });
    setTimeout(onFinish, 3000);
  };

  const triggerPhaseTransition = () => {
    if (phase === TimerPhase.PREP) {
      startWork();
    } else if (phase === TimerPhase.WORK) {
      startRest();
    } else if (phase === TimerPhase.REST) {
      if (currentRound < config.rounds) {
        setCurrentRound(r => r + 1);
        startWork();
      } else {
        startCoolDown();
      }
    } else if (phase === TimerPhase.COOL_DOWN) {
      finishWorkout();
    }
  };

  const tick = useCallback(() => {
    if (isPaused) return;

    if (timeRemaining > 0) {
      setTimeRemaining((prev) => prev - 1);
    } else {
      triggerPhaseTransition();
    }
  }, [isPaused, timeRemaining, phase, currentRound, config, exercises]);

  useEffect(() => {
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [tick]);

  // Synchronized countdown beeps
  useEffect(() => {
    if (isPaused) return;

    // Check if we are in a phase that needs a countdown
    if (phase === TimerPhase.PREP || phase === TimerPhase.REST) {
      // Beep on 3, 2, 1
      if (timeRemaining <= 3 && timeRemaining > 0) {
        playBeep(880, 0.15); // High pitch, short beep
      }
    }
  }, [timeRemaining, phase, isPaused]);

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const currentPhaseConfig = phaseConfig[phase];
  const isCountdown = timeRemaining <= 3 && timeRemaining > 0;

  return (
    <motion.div
      className={`flex flex-col h-full ${currentPhaseConfig.bgClass} relative overflow-hidden`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-1/2 w-150 h-150 rounded-full opacity-30 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${currentPhaseConfig.ringColor}60 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Premium Pause Overlay */}
      <AnimatePresence>
        {isPaused && phase !== TimerPhase.FINISHED && (
          <motion.div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Frosted glass background */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />

            <motion.div
              className="relative z-10 flex flex-col items-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div className="text-white/60 text-lg font-medium uppercase tracking-wide mb-8">
                Paused
              </div>
              <button
                onClick={togglePause}
                className="flex items-center gap-3 bg-primary text-surface px-8 py-4 rounded-full font-semibold text-lg active:opacity-90"
                aria-label="Resume Workout"
              >
                <Play size={28} fill="currentColor" />
                Resume
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 text-white relative z-10">
        <motion.button
          onClick={onExit}
          className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X size={24} />
        </motion.button>
        <div className="text-lg font-semibold tracking-wide">
          {currentPhaseConfig.label}
        </div>
        <div className="text-sm font-mono opacity-80 bg-white/10 px-3 py-1 rounded-full">
          {currentRound}/{config.rounds}
        </div>
      </div>

      {/* Main Display */}
      <div className="flex-1 flex flex-col justify-center items-center text-white text-center p-4 relative z-10">
        {phase === TimerPhase.FINISHED ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <h1 className="text-display-large font-black">GREAT JOB!</h1>
            <p className="text-title-large mt-4 opacity-80">Workout Complete</p>
          </motion.div>
        ) : (
          <>
            {/* Timer */}
            <div className="relative flex items-center justify-center">
              <motion.div
                className={`text-timer-huge font-bold font-mono tracking-tighter drop-shadow-lg ${
                  isCountdown ? 'text-white' : ''
                }`}
                animate={isCountdown ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5 }}
                key={isCountdown ? timeRemaining : 'normal'}
              >
                {formatTime(timeRemaining)}
              </motion.div>
            </div>

            {/* Exercise Display for Work Phase */}
            <AnimatePresence mode="wait">
              {phase === TimerPhase.WORK && (
                <motion.div
                  className="mt-8"
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <span className="text-3xl font-bold uppercase bg-white text-surface px-5 py-2.5 rounded-xl inline-block">
                    {currentExercise}
                  </span>
                </motion.div>
              )}

              {phase === TimerPhase.PREP && (
                <div className="mt-6 text-lg font-medium opacity-70">
                  Get ready
                </div>
              )}

              {phase === TimerPhase.REST && (
                <div className="mt-6 text-lg font-medium opacity-70">
                  Breathe
                </div>
              )}

              {phase === TimerPhase.COOL_DOWN && (
                <div className="mt-6 text-lg font-medium opacity-70">
                  Stretch it out
                </div>
              )}
            </AnimatePresence>

            {/* Round Progress Dots */}
            <RoundDots currentRound={currentRound} totalRounds={config.rounds} />
          </>
        )}
      </div>

      {/* Controls */}
      {phase !== TimerPhase.FINISHED && (
        <div className="h-25 bg-black/20 flex items-center justify-center pb-safe">
          <button
            onClick={togglePause}
            className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-surface active:opacity-80"
            aria-label={isPaused ? "Resume Timer" : "Pause Timer"}
          >
            {isPaused ? <Play size={28} fill="currentColor" /> : <Pause size={28} fill="currentColor" />}
          </button>
        </div>
      )}
    </motion.div>
  );
};
