import { differenceInCalendarDays, format, isToday, isYesterday } from 'date-fns';
import { WorkoutHistoryItem } from '../types';

export interface GroupedHistoryItem {
  label: string;
  items: WorkoutHistoryItem[];
}

export const calculateStreak = (history: WorkoutHistoryItem[]): number => {
  if (history.length === 0) return 0;

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const uniqueDays = Array.from(
    new Set(sortedHistory.map((item) => format(new Date(item.date), 'yyyy-MM-dd')))
  ).map((dateKey) => new Date(`${dateKey}T00:00:00`));

  if (uniqueDays.length === 0) return 0;
  if (differenceInCalendarDays(new Date(), uniqueDays[0]) > 1) return 0;

  let streak = 0;
  for (let index = 0; index < uniqueDays.length; index += 1) {
    if (index === 0) {
      streak += 1;
      continue;
    }

    const difference = differenceInCalendarDays(uniqueDays[index - 1], uniqueDays[index]);
    if (difference !== 1) break;
    streak += 1;
  }

  return streak;
};

export const groupHistoryByDay = (history: WorkoutHistoryItem[]): GroupedHistoryItem[] => {
  const groups = new Map<string, WorkoutHistoryItem[]>();

  history.forEach((item) => {
    const date = new Date(item.date);
    const label = isToday(date)
      ? 'Today'
      : isYesterday(date)
        ? 'Yesterday'
        : format(date, 'EEE, MMM d');

    const existing = groups.get(label) ?? [];
    existing.push(item);
    groups.set(label, existing);
  });

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
};

export const formatAccumulatedDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
};
