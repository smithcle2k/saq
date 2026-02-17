import React from 'react';
import { ArrowLeft, History, Clock, TrendingUp } from 'lucide-react';
import { WorkoutHistoryItem } from '../types';

interface StatisticsProps {
  history: WorkoutHistoryItem[];
  onClose: () => void;
}

export const Statistics: React.FC<StatisticsProps> = ({ history, onClose }) => {
  const totalWorkouts = history.length;
  const totalSeconds = history.reduce((acc, curr) => acc + curr.duration, 0);
  const averageSeconds = totalWorkouts > 0 ? Math.round(totalSeconds / totalWorkouts) : 0;

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto bg-gray-900 p-4 text-white">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onClose}
          className="text-white p-2 hover:bg-gray-800 rounded-full transition-colors"
        >
          <ArrowLeft size={28} />
        </button>
        <h2 className="text-xl font-bold uppercase tracking-wider">Statistics</h2>
        <div className="w-10" />
      </div>

      <div className="grid grid-cols-1 gap-4 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex items-center justify-between">
          <div>
             <p className="text-gray-400 text-sm font-bold uppercase mb-1">Total Workouts</p>
             <p className="text-3xl font-mono font-bold text-sky-400">{totalWorkouts}</p>
          </div>
          <History size={32} className="text-gray-600" />
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex items-center justify-between">
          <div>
             <p className="text-gray-400 text-sm font-bold uppercase mb-1">Total Time</p>
             <p className="text-2xl font-mono font-bold text-green-400">{formatDuration(totalSeconds)}</p>
          </div>
          <Clock size={32} className="text-gray-600" />
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex items-center justify-between">
          <div>
             <p className="text-gray-400 text-sm font-bold uppercase mb-1">Avg Duration</p>
             <p className="text-2xl font-mono font-bold text-purple-400">{formatDuration(averageSeconds)}</p>
          </div>
          <TrendingUp size={32} className="text-gray-600" />
        </div>
      </div>

      <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">Recent History</h3>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {history.length === 0 ? (
           <p className="text-gray-500 text-center py-4">No workouts yet.</p>
        ) : (
           history.map((item, idx) => (
             <div key={idx} className="bg-gray-800/50 p-4 rounded-lg flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-gray-300 text-sm font-medium">
                    {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <span className="font-mono font-bold text-white bg-gray-700 px-2 py-1 rounded text-sm">
                  {formatDuration(item.duration)}
                </span>
             </div>
           ))
        )}
      </div>
    </div>
  );
};
