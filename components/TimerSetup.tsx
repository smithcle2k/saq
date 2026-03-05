import React from 'react';
import { Settings, BarChart2, Play, Timer } from 'lucide-react';
import { TimerConfig } from '../types';
import { NumberInput } from './NumberInput';
import { calculateTotalTime, formatTime } from '../utils/timeUtils';

interface TimerSetupProps {
  config: TimerConfig;
  setConfig: React.Dispatch<React.SetStateAction<TimerConfig>>;
  onStart: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
}

export const TimerSetup: React.FC<TimerSetupProps> = ({
  config,
  setConfig,
  onStart,
  onOpenSettings,
  onOpenStats,
}) => {
  const updateConfig = (key: keyof TimerConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const totalDuration = calculateTotalTime(config);

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-4 lg:max-w-4xl">
      {/* Header */}
      <div className="text-center mb-6 pt-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Timer className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-on-surface">
            Interval Trainer
          </h1>
        </div>
        <p className="text-sm text-on-surface-variant">
          Set your intervals and go
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row lg:gap-8">
        {/* Timer Configuration */}
        <div className="flex-1 flex flex-col justify-center space-y-3">
          <NumberInput
            label="Prep"
            value={config.prepTime}
            onChange={(v) => updateConfig('prepTime', v)}
            step={5}
            min={5}
          />

          <NumberInput
            label="Work"
            value={config.workTime}
            onChange={(v) => updateConfig('workTime', v)}
            step={5}
            min={5}
            readOnly={true}
          />

          <NumberInput
            label="Rest"
            value={config.restTime}
            onChange={(v) => updateConfig('restTime', v)}
            step={1}
            min={15}
          />

          <NumberInput
            label="Rounds"
            value={config.rounds}
            onChange={(v) => updateConfig('rounds', v)}
            isTime={false}
            min={1}
            max={99}
          />

          <NumberInput
            label="Cool Down"
            value={config.coolDownTime}
            onChange={(v) => updateConfig('coolDownTime', v)}
            step={5}
          />

          {/* Total Duration */}
          <div className="mt-2 glass-panel rounded-2xl p-4 flex justify-between items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 blur-xl"></div>
            <span className="text-sm text-on-surface-variant relative z-10 font-medium">Total</span>
            <span className="text-xl font-mono font-bold text-primary relative z-10 text-glow">
              {formatTime(totalDuration)}
            </span>
          </div>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-56 lg:justify-center">
          <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl"></div>
            <h3 className="text-xs text-primary font-bold tracking-wider uppercase mb-4 relative z-10">
              Session Summary
            </h3>
            <div className="space-y-3 text-sm text-on-surface relative z-10">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-on-surface-variant font-medium">Rounds</span>
                <span className="font-mono font-bold">{config.rounds}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">Work / Rest</span>
                <span className="font-mono font-bold">{config.workTime}s / {config.restTime}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-8 flex gap-3 pb-safe">
        <button
          onClick={onOpenSettings}
          className="flex-1 h-14 glass-panel-interactive rounded-2xl flex items-center justify-center text-on-surface-variant hover:text-primary transition-all"
          aria-label="Settings"
        >
          <Settings size={22} />
        </button>

        <button
          onClick={onOpenStats}
          className="flex-1 h-14 glass-panel-interactive rounded-2xl flex items-center justify-center text-on-surface-variant hover:text-primary transition-all"
          aria-label="Statistics"
        >
          <BarChart2 size={22} />
        </button>

        <button
          onClick={onStart}
          className="flex-2 h-14 bg-primary/20 border border-primary/40 rounded-2xl flex items-center justify-center gap-2 text-primary hover:bg-primary/30 hover:border-primary/60 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-95 transition-all font-bold tracking-wide"
        >
          <Play size={20} fill="currentColor" />
          <span className="text-lg">START</span>
        </button>
      </div>
    </div>
  );
};
