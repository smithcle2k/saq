import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Pause, Play, X, RotateCcw } from 'lucide-react';
import { TimerConfig, TimerPhase } from '../types';
import { formatTime } from '../utils/timeUtils';
import { speak } from '../utils/tts';

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

export const ActiveTimer: React.FC<ActiveTimerProps> = ({
  config,
  exercises,
  onFinish,
  onExit,
}) => {
  const [phase, setPhase] = useState<TimerPhase>(TimerPhase.PREP);
  const [timeRemaining, setTimeRemaining] = useState(config.prepTime);
  const [currentRound, setCurrentRound] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<string>('');
  
  // Refs for managing timeouts and pause state in callbacks
  const exerciseTimeoutRef = useRef<number | null>(null);
  const isPausedRef = useRef(isPaused);

  // Sync ref with state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (exerciseTimeoutRef.current) {
        clearTimeout(exerciseTimeoutRef.current);
      }
    };
  }, []);

  const getRandomExercise = useCallback(() => {
    if (exercises.length === 0) return "Go!";
    const randomIndex = Math.floor(Math.random() * exercises.length);
    return exercises[randomIndex];
  }, [exercises]);

  const startWork = () => {
    setPhase(TimerPhase.WORK);
    setTimeRemaining(config.workTime);
    const exercise = getRandomExercise();
    setCurrentExercise(exercise);
    
    // Sequence: Say "Go", wait 1s, say Exercise
    speak('Go');
    if (exerciseTimeoutRef.current) clearTimeout(exerciseTimeoutRef.current);
    exerciseTimeoutRef.current = window.setTimeout(() => {
        // Only speak the exercise if we are still in the work phase and not paused
        if (!isPausedRef.current) {
           speak(exercise);
        }
    }, 1000);
  };

  const startRest = () => {
    if (exerciseTimeoutRef.current) clearTimeout(exerciseTimeoutRef.current);
    setPhase(TimerPhase.REST);
    setTimeRemaining(config.restTime);
    setCurrentExercise('');
    speak('Rest');
  };

  const startCoolDown = () => {
    if (exerciseTimeoutRef.current) clearTimeout(exerciseTimeoutRef.current);
    if (config.coolDownTime > 0) {
      setPhase(TimerPhase.COOL_DOWN);
      setTimeRemaining(config.coolDownTime);
      speak('Cool Down');
    } else {
      finishWorkout();
    }
  };

  const finishWorkout = () => {
    if (exerciseTimeoutRef.current) clearTimeout(exerciseTimeoutRef.current);
    setPhase(TimerPhase.FINISHED);
    speak('Workout Complete');
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
      // Countdown beep logic is handled in useEffect
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

  // Background color based on phase
  const getBackgroundColor = () => {
    switch (phase) {
      case TimerPhase.PREP: return 'bg-yellow-600';
      case TimerPhase.WORK: return 'bg-green-600';
      case TimerPhase.REST: return 'bg-red-600';
      case TimerPhase.COOL_DOWN: return 'bg-blue-600';
      case TimerPhase.FINISHED: return 'bg-purple-600';
      default: return 'bg-gray-900';
    }
  };

  return (
    <div className={`flex flex-col h-full ${getBackgroundColor()} transition-colors duration-500 relative overflow-hidden`}>
      {/* Pause Overlay with Resume Button */}
      {isPaused && phase !== TimerPhase.FINISHED && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="text-white text-3xl font-bold tracking-wider mb-8 uppercase opacity-80">
                 Paused
             </div>
             <button
                 onClick={togglePause}
                 className="group flex items-center gap-4 bg-sky-500 hover:bg-sky-400 text-white px-10 py-5 rounded-full font-bold text-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
                 aria-label="Resume Workout"
             >
                 <Play size={32} fill="currentColor" className="group-hover:translate-x-1 transition-transform" />
                 RESUME
             </button>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 text-white bg-black/20 z-10 relative">
        <button onClick={onExit} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
          <X size={24} />
        </button>
        <div className="text-xl font-bold tracking-widest">
            {phase === TimerPhase.FINISHED ? 'DONE' : `${phase.replace('_', ' ')}`}
        </div>
        <div className="text-sm font-mono opacity-80">
           ROUND {currentRound}/{config.rounds}
        </div>
      </div>

      {/* Main Display */}
      <div className="flex-1 flex flex-col justify-center items-center text-white text-center p-4 relative">
        {phase === TimerPhase.FINISHED ? (
           <h1 className="text-6xl font-black">GREAT JOB!</h1>
        ) : (
          <>
            <div className="text-[10rem] leading-none font-bold font-mono tracking-tighter drop-shadow-lg relative z-0">
              {formatTime(timeRemaining)}
            </div>
            
            {phase === TimerPhase.WORK && (
              <div className="mt-8 animate-bounce relative z-0">
                <span className="text-4xl md:text-6xl font-black uppercase italic bg-white text-black px-6 py-2 transform -skew-x-12 inline-block shadow-xl">
                  {currentExercise}
                </span>
              </div>
            )}
            
            {phase === TimerPhase.PREP && (
               <div className="mt-8 text-2xl font-bold opacity-80 animate-pulse relative z-0">
                   GET READY
               </div>
            )}

            {phase === TimerPhase.REST && (
               <div className="mt-8 text-2xl font-bold opacity-80 relative z-0">
                   BREATHE
               </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      {phase !== TimerPhase.FINISHED && (
        <div className="h-24 bg-black/30 flex items-center justify-center gap-8 mb-safe z-30 relative">
            <button 
                onClick={togglePause}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-gray-900 hover:scale-105 transition-transform shadow-lg"
                aria-label={isPaused ? "Resume Timer" : "Pause Timer"}
            >
                {isPaused ? <Play size={32} fill="currentColor" /> : <Pause size={32} fill="currentColor" />}
            </button>
        </div>
      )}
    </div>
  );
};