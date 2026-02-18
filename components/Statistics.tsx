import React, { useMemo } from 'react';
import { ArrowLeft, Clock, Flame } from 'lucide-react';
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
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const latestWorkoutDate = new Date(sortedHistory[0].date);
  latestWorkoutDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((currentDate.getTime() - latestWorkoutDate.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays > 1) return 0;

  const workoutDays = new Set(
    sortedHistory.map((item) => {
      const d = new Date(item.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  let checkDate = new Date(latestWorkoutDate);
  while (workoutDays.has(checkDate.getTime())) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
};

const groupByDate = (history: WorkoutHistoryItem[]): Map<string, WorkoutHistoryItem[]> => {
  const groups = new Map<string, WorkoutHistoryItem[]>();

  history.forEach((item) => {
    const date = new Date(item.date);
    const dateKey = date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

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
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onClose}
          className="p-2 text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-lg font-semibold">Stats</h2>
        <div className="w-10" />
      </div>

      {/* Stats Row */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 bg-surface-container rounded-lg p-3">
          <p className="text-2xl font-mono font-semibold text-primary">
            {totalWorkouts}
          </p>
          <p className="text-xs text-on-surface-variant">
            workouts
          </p>
        </div>

        <div className="flex-1 bg-surface-container rounded-lg p-3">
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-mono font-semibold text-phase-prep-DEFAULT">
              {currentStreak}
            </p>
            <Flame size={14} className="text-phase-prep-DEFAULT" />
          </div>
          <p className="text-xs text-on-surface-variant">
            day streak
          </p>
        </div>

        <div className="flex-1 bg-surface-container rounded-lg p-3">
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-mono font-semibold text-phase-work-DEFAULT">
              {formatDuration(totalSeconds)}
            </p>
          </div>
          <p className="text-xs text-on-surface-variant">
            total
          </p>
        </div>
      </div>

      {/* History */}
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} className="text-on-surface-variant" />
        <h3 className="text-xs text-on-surface-variant uppercase">
          History
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-on-surface-variant">
              No workouts yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(groupedHistory.entries()).map(([dateKey, items]) => (
              <div key={dateKey}>
                <h4 className="text-xs text-on-surface-variant mb-2">
                  {dateKey}
                </h4>
                <div className="space-y-1.5">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-surface-container rounded-lg px-3 py-2 flex justify-between items-center text-sm"
                    >
                      <span className="text-on-surface-variant">
                        {new Date(item.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="font-mono text-on-surface">
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
