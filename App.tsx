import React, { useState, useEffect } from 'react';
import { TimerConfig, View, WorkoutHistoryItem } from './types';
import { TimerSetup } from './components/TimerSetup';
import { ActiveTimer } from './components/ActiveTimer';
import { Settings } from './components/Settings';
import { Statistics } from './components/Statistics';
import { calculateTotalTime } from './utils/timeUtils';

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

function App() {
  const [view, setView] = useState<View>('SETUP');
  const [config, setConfig] = useState<TimerConfig>(DEFAULT_CONFIG);
  
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

  const saveHistory = (newItem: WorkoutHistoryItem) => {
    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('workoutHistory', JSON.stringify(updatedHistory));
  };

  const handleStart = () => {
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

  return (
    <div className="h-screen w-full bg-gray-900 text-white overflow-hidden flex flex-col font-sans">
      {view === 'SETUP' && (
        <TimerSetup 
          config={config} 
          setConfig={setConfig} 
          onStart={handleStart}
          onOpenSettings={handleOpenSettings}
          onOpenStats={handleOpenStats}
        />
      )}

      {view === 'SETTINGS' && (
        <Settings
          exercises={exercises}
          setExercises={setExercises}
          onClose={handleCloseSubView}
        />
      )}

      {view === 'STATS' && (
        <Statistics
          history={history}
          onClose={handleCloseSubView}
        />
      )}

      {view === 'TIMER' && (
        <ActiveTimer
          config={config}
          exercises={exercises}
          onFinish={handleFinish}
          onExit={handleExit}
        />
      )}
    </div>
  );
}

export default App;