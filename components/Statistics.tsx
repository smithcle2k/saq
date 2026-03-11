import React, { useMemo } from 'react';
import { ArrowLeft, Clock, Flame } from 'lucide-react';
import { format, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';
import { WorkoutHistoryItem } from '../types';

interface StatisticsProps {
  history: WorkoutHistoryItem[];
  onClose: () => void;
}

const calculateStreak = (history: WorkoutHistoryItem[]): number => {
  if (history.length === 0) return 0;

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let streak = 0;
  const currentDate = new Date();

  // Extract unique days using standard date format
  const uniqueDates = Array.from(
    new Set(sortedHistory.map((item) => format(new Date(item.date), 'yyyy-MM-dd')))
  ).map((dateStr) => new Date(`${dateStr}T00:00:00`)); // Local time midnight

  if (uniqueDates.length === 0) return 0;

  // Streak broken if oldest is > 1 day ago
  if (differenceInCalendarDays(currentDate, uniqueDates[0]) > 1) {
    return 0;
  }

  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      streak++;
    } else {
      const diff = differenceInCalendarDays(uniqueDates[i - 1], uniqueDates[i]);
      if (diff === 1) {
        streak++;
      } else {
        break; // Streak broken
      }
    }
  }

  return streak;
};

const groupByDate = (history: WorkoutHistoryItem[]): Map<string, WorkoutHistoryItem[]> => {
  const groups = new Map<string, WorkoutHistoryItem[]>();

  history.forEach((item) => {
    const date = new Date(item.date);
    let dateKey = '';

    if (isToday(date)) {
      dateKey = 'Today';
    } else if (isYesterday(date)) {
      dateKey = 'Yesterday';
    } else {
      dateKey = format(date, 'EEE, MMM d');
    }

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(item);
  });

  return groups;
};

export const Statistics: React.FC<StatisticsProps> = ({ history, onClose }) => {
  const totalWorkouts = history.length;
  const totalSeconds = history.reduce((acc, curr) => acc + curr.duration, 0);
  const currentStreak = useMemo(() => calculateStreak(history), [history]);
  const groupedHistory = useMemo(() => groupByDate(history), [history]);

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-4 text-on-surface">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 mt-2">
        <button
          onClick={onClose}
          className="p-3 text-on-surface hover:text-primary glass-panel-interactive rounded-2xl transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-xl font-bold tracking-wider text-on-surface">STATISTICS</h2>
        <div className="w-12" />
      </div>

      {/* Stats Row */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1 glass-panel rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary/20 transition-all">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-3xl font-mono font-bold text-primary relative z-10 text-glow">
            {totalWorkouts}
          </p>
          <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase mt-1 relative z-10">
            Workouts
          </p>
        </div>

        <div className="flex-1 glass-panel rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:border-phase-prep-DEFAULT/20 transition-all">
          <div className="absolute inset-0 bg-phase-prep-DEFAULT/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-1.5 relative z-10">
            <p className="text-3xl font-mono font-bold text-phase-prep-DEFAULT drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              {currentStreak}
            </p>
            <Flame
              size={18}
              className="text-phase-prep-DEFAULT drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            />
          </div>
          <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase mt-1 relative z-10">
            Day Streak
          </p>
        </div>

        <div className="flex-1 glass-panel rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:border-phase-work-DEFAULT/20 transition-all">
          <div className="absolute inset-0 bg-phase-work-DEFAULT/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-2xl font-mono font-bold text-phase-work-DEFAULT drop-shadow-[0_0_15px_rgba(34,197,94,0.5)] relative z-10">
            {formatDuration(totalSeconds)}
          </p>
          <p className="text-xs font-semibold tracking-wider text-on-surface-variant uppercase mt-1 relative z-10">
            Total Time
          </p>
        </div>
      </div>

      {/* History */}
      <div className="flex items-center gap-2 mb-4 px-2">
        <Clock size={16} className="text-primary" />
        <h3 className="text-xs font-bold text-primary tracking-wider uppercase">
          Activity History
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center glass-panel rounded-2xl">
            <p className="text-sm font-medium text-on-surface-variant">No workouts yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(groupedHistory.entries()).map(([dateKey, items]) => (
              <div key={dateKey} className="glass-panel p-4 rounded-2xl">
                <h4 className="text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3 border-b border-white/5 pb-2">
                  {dateKey}
                </h4>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-black/20 rounded-xl px-4 py-3 flex justify-between items-center text-sm hover:bg-black/40 transition-colors border border-white/5"
                    >
                      <span className="text-on-surface-variant font-medium">
                        {format(new Date(item.date), 'h:mm a')}
                      </span>
                      <span className="font-mono font-bold text-on-surface text-base">
                        {formatDuration(item.duration)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
