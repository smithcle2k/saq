import React from 'react';
import { Settings, BarChart2, Play } from 'lucide-react';
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
    <div className="flex flex-col h-full max-w-md mx-auto p-4">
      <div className="flex-1 flex flex-col justify-center space-y-2">
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
          isTime={false}
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

        <div className="mt-6 bg-sky-900 rounded-lg p-4 flex justify-between items-center shadow-md">
          <span className="text-white font-bold text-lg uppercase tracking-wider">Total</span>
          <span className="text-white font-mono text-2xl font-bold">{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-8 flex gap-4 h-16">
        <button
          onClick={onOpenSettings}
          className="flex-1 bg-white border-2 border-sky-900 rounded-lg flex items-center justify-center text-sky-900 hover:bg-gray-50 transition-colors shadow-lg"
          aria-label="Settings"
        >
          <Settings size={32} />
        </button>
        
        <button
          onClick={onOpenStats}
          className="flex-1 bg-white border-2 border-sky-900 rounded-lg flex items-center justify-center text-sky-900 hover:bg-gray-50 transition-colors shadow-lg"
          aria-label="Statistics"
        >
          <BarChart2 size={32} />
        </button>

        <button
          onClick={onStart}
          className="flex-[2] bg-orange-400 border-2 border-orange-500 rounded-lg flex items-center justify-center text-sky-900 font-black text-2xl uppercase italic tracking-tighter hover:bg-orange-300 transition-colors shadow-lg"
        >
          GO !
        </button>
      </div>
    </div>
  );
};