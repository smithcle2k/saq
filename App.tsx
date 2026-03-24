import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TimerConfig, TimerMode, View, WorkoutHistoryItem } from './types';
import { TimerSetup } from './components/TimerSetup';
import { ActiveTimer } from './components/ActiveTimer';
import { Settings } from './components/Settings';
import { Statistics } from './components/Statistics';
import { Tutorial } from './components/Tutorial';
import { calculateTotalTime } from './utils/timeUtils';
import { initializeSpeech } from './utils/tts';
import { initializeAudioCues } from './utils/audioCues';
import { useStore } from './store';

// Page transition variants
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const pageTransition = {
  type: 'tween',
  duration: 0.2,
  ease: 'easeInOut',
};

function App() {
  const [view, setView] = useState<View>('SETUP');

  const mode = useStore((state) => state.mode);
  const modeConfigs = useStore((state) => state.modeConfigs);
  const exercisesByMode = useStore((state) => state.exercisesByMode);
  const exercises = exercisesByMode[mode];
  const history = useStore((state) => state.history);
  const tutorialSeen = useStore((state) => state.tutorialSeen);

  const setMode = useStore((state) => state.setMode);
  const setModeConfigs = useStore((state) => state.setModeConfigs);
  const setExercises = useStore((state) => state.setExercises);
  const addHistoryItem = useStore((state) => state.addHistoryItem);
  const setTutorialSeen = useStore((state) => state.setTutorialSeen);

  const showTutorial = !tutorialSeen;
  const config: TimerConfig = { mode, ...modeConfigs[mode] };

  const setConfig: React.Dispatch<React.SetStateAction<TimerConfig>> = (updater) => {
    setModeConfigs((prev) => {
      const currentConfig: TimerConfig = { mode, ...prev[mode] };
      const nextConfig = typeof updater === 'function' ? updater(currentConfig) : updater;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { mode: _mode, ...nextValues } = nextConfig;

      return {
        ...prev,
        [mode]: nextValues,
      };
    });
  };

  const handleDismissTutorial = () => {
    setTutorialSeen(true);
  };

  // Unlock speech synthesis on the first user interaction.
  useEffect(() => {
    const unlockMedia = () => {
      initializeSpeech({ force: true });
      initializeAudioCues({ force: true });
      window.removeEventListener('click', unlockMedia);
      window.removeEventListener('touchend', unlockMedia);
      window.removeEventListener('keydown', unlockMedia);
    };

    window.addEventListener('click', unlockMedia, { passive: true });
    window.addEventListener('touchend', unlockMedia, { passive: true });
    window.addEventListener('keydown', unlockMedia);

    return () => {
      window.removeEventListener('click', unlockMedia);
      window.removeEventListener('touchend', unlockMedia);
      window.removeEventListener('keydown', unlockMedia);
    };
  }, []);

  const saveHistory = (newItem: WorkoutHistoryItem) => {
    addHistoryItem(newItem);
  };

  const handleStart = () => {
    initializeSpeech({ force: true });
    initializeAudioCues({ force: true });
    setView('TIMER');
  };

  const handleModeChange = (nextMode: TimerMode) => {
    setMode(nextMode);
  };

  const handleFinish = () => {
    // Workout completed successfully
    const duration = calculateTotalTime(config);
    saveHistory({
      date: new Date().toISOString(),
      duration: duration,
    });
    setView('SETUP');
  };

  const handleExit = () => {
    // Workout cancelled/exited early
    setView('SETUP');
  };

  const handleOpenSettings = () => {
    setView('SETTINGS');
  };

  const handleOpenStats = () => {
    setView('STATS');
  };

  const handleCloseSubView = () => {
    setView('SETUP');
  };

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="h-screen w-full bg-transparent text-on-surface overflow-hidden flex flex-col font-sans relative">
      <AnimatePresence mode="wait">
        {view === 'SETUP' && (
          <motion.div
            key="setup"
            variants={prefersReducedMotion ? {} : pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="h-full"
          >
            <TimerSetup
              config={config}
              setConfig={setConfig}
              mode={mode}
              onModeChange={handleModeChange}
              onStart={handleStart}
              onOpenSettings={handleOpenSettings}
              onOpenStats={handleOpenStats}
            />
          </motion.div>
        )}

        {view === 'SETTINGS' && (
          <motion.div
            key="settings"
            variants={prefersReducedMotion ? {} : pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="h-full"
          >
            <Settings
              exercises={exercises}
              setExercises={setExercises}
              mode={mode}
              onClose={handleCloseSubView}
            />
          </motion.div>
        )}

        {view === 'STATS' && (
          <motion.div
            key="stats"
            variants={prefersReducedMotion ? {} : pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="h-full"
          >
            <Statistics history={history} onClose={handleCloseSubView} />
          </motion.div>
        )}

        {view === 'TIMER' && (
          <motion.div
            key="timer"
            variants={prefersReducedMotion ? {} : pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="h-full"
          >
            <ActiveTimer
              config={config}
              exercises={exercises}
              onFinish={handleFinish}
              onExit={handleExit}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* First-time tutorial overlay */}
      <AnimatePresence>
        {showTutorial && <Tutorial onDismiss={handleDismissTutorial} />}
      </AnimatePresence>
    </div>
  );
}

export default App;
