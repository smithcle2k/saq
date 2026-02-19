import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TimerConfig, View, WorkoutHistoryItem } from './types';
import { TimerSetup } from './components/TimerSetup';
import { ActiveTimer } from './components/ActiveTimer';
import { Settings } from './components/Settings';
import { Statistics } from './components/Statistics';
import { Tutorial } from './components/Tutorial';
import { calculateTotalTime } from './utils/timeUtils';
import { initializeSpeech } from './utils/tts';

const DEFAULT_CONFIG: TimerConfig = {
  prepTime: 10,
  workTime: 5,
  restTime: 55,
  rounds: 8,
  coolDownTime: 60,
};

const DEFAULT_EXERCISES = [
  'Right',
  'Left',
  'Come back',
  'Straight'
];

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
  const [config, setConfig] = useState<TimerConfig>(DEFAULT_CONFIG);
  const [showTutorial, setShowTutorial] = useState<boolean>(
    () => !localStorage.getItem('tutorialSeen')
  );

  const handleDismissTutorial = () => {
    localStorage.setItem('tutorialSeen', '1');
    setShowTutorial(false);
  };

  // Load exercises from localStorage
  const [exercises, setExercises] = useState<string[]>(() => {
    const saved = localStorage.getItem('customExercises');
    return saved ? JSON.parse(saved) : DEFAULT_EXERCISES;
  });

  // Load history from localStorage
  const [history, setHistory] = useState<WorkoutHistoryItem[]>(() => {
    const saved = localStorage.getItem('workoutHistory');
    return saved ? JSON.parse(saved) : [];
  });

  // Save exercises whenever they change
  useEffect(() => {
    localStorage.setItem('customExercises', JSON.stringify(exercises));
  }, [exercises]);

  // Unlock speech synthesis on the first user interaction.
  useEffect(() => {
    const unlockSpeech = () => {
      initializeSpeech();
      window.removeEventListener('pointerdown', unlockSpeech);
      window.removeEventListener('touchstart', unlockSpeech);
    };

    window.addEventListener('pointerdown', unlockSpeech, { passive: true });
    window.addEventListener('touchstart', unlockSpeech, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockSpeech);
      window.removeEventListener('touchstart', unlockSpeech);
    };
  }, []);

  const saveHistory = (newItem: WorkoutHistoryItem) => {
    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('workoutHistory', JSON.stringify(updatedHistory));
  };

  const handleStart = () => {
    initializeSpeech();
    setView('TIMER');
  };

  const handleFinish = () => {
    // Workout completed successfully
    const duration = calculateTotalTime(config);
    saveHistory({
      date: new Date().toISOString(),
      duration: duration
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
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="h-screen w-full bg-surface text-on-surface overflow-hidden flex flex-col font-sans">
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
            <Statistics
              history={history}
              onClose={handleCloseSubView}
            />
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
        {showTutorial && (
          <Tutorial onDismiss={handleDismissTutorial} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
