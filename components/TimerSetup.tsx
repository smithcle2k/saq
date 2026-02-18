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
          <div className="mt-2 bg-surface-container rounded-xl p-4 flex justify-between items-center">
            <span className="text-sm text-on-surface-variant">Total</span>
            <span className="text-lg font-mono font-semibold text-primary">
              {formatTime(totalDuration)}
            </span>
          </div>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-56 lg:justify-center">
          <div className="bg-surface-container rounded-xl p-4">
            <h3 className="text-xs text-on-surface-variant uppercase mb-3">
              Summary
            </h3>
            <div className="space-y-2 text-sm text-on-surface">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Rounds</span>
                <span className="font-mono">{config.rounds}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Work/Rest</span>
                <span className="font-mono">{config.workTime}s / {config.restTime}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-6 flex gap-3 pb-safe">
        <button
          onClick={onOpenSettings}
          className="flex-1 h-12 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant hover:text-on-surface active:bg-surface-container-highest transition-colors"
          aria-label="Settings"
        >
          <Settings size={22} />
        </button>

        <button
          onClick={onOpenStats}
          className="flex-1 h-12 bg-surface-container-high rounded-xl flex items-center justify-center text-on-surface-variant hover:text-on-surface active:bg-surface-container-highest transition-colors"
          aria-label="Statistics"
        >
          <BarChart2 size={22} />
        </button>

        <button
          onClick={onStart}
          className="flex-[2] h-12 bg-primary rounded-xl flex items-center justify-center gap-2 text-surface font-semibold active:opacity-90 transition-opacity"
        >
          <Play size={20} fill="currentColor" />
          <span>Start</span>
        </button>
      </div>
    </div>
  );
};
