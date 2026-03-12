import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, X } from 'lucide-react';
import { TimerConfig, TimerPhase } from '../types';
import { formatTime } from '../utils/timeUtils';
import { shouldAnnounceRestFiveSeconds, shouldPlayCountdownBeep } from '../utils/timerAlerts';
import { speak } from '../utils/tts';
import { useActiveTimerEngine } from '../hooks/useActiveTimerEngine';
import { useWakeLock } from '../hooks/useWakeLock';
import useSound from 'use-sound';

interface ActiveTimerProps {
  config: TimerConfig;
  exercises: string[];
  onFinish: () => void;
  onExit: () => void;
}

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
  const isSaqMode = config.mode === 'SAQ';

  // Keep screen awake while timer is active
  useWakeLock();

  const [playBeep] = useSound('/beep.wav', { volume: 0.5 });
  const [playWhistle] = useSound('/whistle.wav', { volume: 0.8 });
  const [playBuzzer] = useSound('/buzzer.wav', { volume: 0.8 });

  const hasAnnouncedPrepRef = useRef(false);
  const hasAnnouncedRestFiveSecondsRef = useRef(false);
  const prevPhaseRef = useRef<TimerPhase | null>(null);
  const { phase, timeRemaining, currentRound, isPaused, togglePause } = useActiveTimerEngine({
    config,
    exercises,
    onFinish,
    onAnnounce: (message) => speak(message, { interrupt: true }),
  });

  useEffect(() => {
    if (hasAnnouncedPrepRef.current) return;
    hasAnnouncedPrepRef.current = true;
    speak('Get ready', { interrupt: true });
  }, []);

  // Synchronized countdown beeps
  useEffect(() => {
    if (shouldPlayCountdownBeep(phase, timeRemaining, isPaused)) {
      playBeep();
    }
  }, [timeRemaining, phase, isPaused, playBeep]);

  useEffect(() => {
    if (phase !== TimerPhase.REST) {
      hasAnnouncedRestFiveSecondsRef.current = false;
      return;
    }

    if (
      shouldAnnounceRestFiveSeconds(
        phase,
        timeRemaining,
        isPaused,
        hasAnnouncedRestFiveSecondsRef.current
      )
    ) {
      hasAnnouncedRestFiveSecondsRef.current = true;
      speak('5 Seconds', { interrupt: true });
    }
  }, [timeRemaining, phase, isPaused]);

  // Phase entrance sounds
  useEffect(() => {
    if (isPaused) return;

    if (prevPhaseRef.current && prevPhaseRef.current !== phase) {
      if (phase === TimerPhase.WORK) {
        playWhistle();
      } else if (phase === TimerPhase.REST || phase === TimerPhase.COOL_DOWN) {
        playBuzzer();
      }
    }
    prevPhaseRef.current = phase;
  }, [phase, isPaused, playWhistle, playBuzzer]);

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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl" />

            <motion.div
              className="relative z-10 flex flex-col items-center"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div className="text-white/60 text-lg font-bold uppercase tracking-[0.2em] mb-8">
                Paused
              </div>
              <button
                onClick={togglePause}
                className="flex items-center gap-3 bg-white text-black px-10 py-5 rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                aria-label="Resume Workout"
              >
                <Play size={28} fill="currentColor" />
                RESUME
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
          {currentPhaseConfig.label} {isSaqMode && phase !== TimerPhase.FINISHED ? '• SAQ' : ''}
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
                className={`text-timer-huge font-bold font-mono tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] ${
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
              {phase === TimerPhase.PREP && (
                <div className="mt-6 text-lg font-medium opacity-70">Get ready</div>
              )}

              {phase === TimerPhase.REST && (
                <div className="mt-6 text-lg font-medium opacity-70">
                  {isSaqMode ? 'Reset and reload' : 'Breathe'}
                </div>
              )}

              {phase === TimerPhase.COOL_DOWN && (
                <div className="mt-6 text-lg font-medium opacity-70">Stretch it out</div>
              )}
            </AnimatePresence>

            {/* Round Progress Dots */}
            <RoundDots currentRound={currentRound} totalRounds={config.rounds} />
          </>
        )}
      </div>

      {/* Controls */}
      {phase !== TimerPhase.FINISHED && (
        <div className="h-25 bg-black/20 flex items-center justify-center pb-safe relative z-10">
          <button
            onClick={togglePause}
            className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-surface active:opacity-80"
            aria-label={isPaused ? 'Resume Timer' : 'Pause Timer'}
          >
            {isPaused ? (
              <Play size={28} fill="currentColor" />
            ) : (
              <Pause size={28} fill="currentColor" />
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
};
