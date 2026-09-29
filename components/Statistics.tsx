import React, { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WorkoutHistoryItem } from '../types';
import { colors, fonts } from '../theme';
import {
  calculateStreak,
  formatAccumulatedDuration,
  groupHistoryByDay,
} from '../utils/historyUtils';
import { DRILL_LABELS } from '../utils/drillPlan';
import { PerformanceStats } from './PerformanceStats';
import { formatTime } from '../utils/timeUtils';

const countLoggedRounds = (item: WorkoutHistoryItem) =>
  item.session?.rounds.filter((round) => round.outcome).length ?? 0;

const Chip: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.roundsChip}>
    <Text style={styles.roundsChipText}>{label}</Text>
  </View>
);

const HistoryRow: React.FC<{ item: WorkoutHistoryItem }> = ({ item }) => {
  return (
    <View style={styles.historyItem}>
      <View style={styles.historyRow}>
        <Text style={styles.historyTime}>{format(new Date(item.date), 'h:mm a')}</Text>
        {item.drillType ? <Chip label={DRILL_LABELS[item.drillType]} /> : null}
        {item.session ? (
          <Chip label={`${countLoggedRounds(item)}/${item.session.rounds.length} logged`} />
        ) : item.rounds ? (
          <Chip label={`${item.rounds} rounds`} />
        ) : null}
        {item.replayOfSessionId ? <Chip label="Replay" /> : null}
        {item.progressionStage ? <Chip label={`Stage ${item.progressionStage}`} /> : null}
        {item.warmupSeconds ? <Chip label={`Warm-up ${formatTime(item.warmupSeconds)}`} /> : null}
        {item.notes ? (
          <Ionicons
            name="document-text-outline"
            size={16}
            color={colors.onSurfaceVariant}
            accessibilityLabel="Has notes"
          />
        ) : null}
        <View style={styles.flex} />
        <Text style={styles.historyDuration}>{formatAccumulatedDuration(item.duration)}</Text>
      </View>
    </View>
  );
};

interface StatisticsProps {
  history: WorkoutHistoryItem[];
  onClose: () => void;
}

export const Statistics: React.FC<StatisticsProps> = ({ history, onClose }) => {
  const totalWorkouts = history.length;
  const totalSeconds = history.reduce((acc, curr) => acc + curr.duration, 0);
  const currentStreak = useMemo(() => calculateStreak(history), [history]);
  const groupedHistory = useMemo(() => groupHistoryByDay(history), [history]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>STATISTICS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalWorkouts}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.streakRow}>
              <Text style={[styles.statValue, { color: colors.prep }]}>{currentStreak}</Text>
              <Ionicons name="flame" size={18} color={colors.prep} />
            </View>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValueSmall, { color: colors.work }]}>
              {formatAccumulatedDuration(totalSeconds)}
            </Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
        </View>

        <PerformanceStats history={history} />

        <View style={styles.historyHeading}>
          <Ionicons name="time-outline" size={16} color={colors.primary} />
          <Text style={styles.historyHeadingText}>Activity History</Text>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No workouts yet</Text>
          </View>
        ) : (
          <View style={styles.historyGroups}>
            {groupedHistory.map(({ label, items }) => (
              <View key={label} style={styles.historyCard}>
                <Text style={styles.historyDate}>{label}</Text>
                <View style={styles.historyItems}>
                  {items.map((item, index) => (
                    <HistoryRow key={item.id ?? `${item.date}-${index}`} item={item} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 4,
  },
  backButton: {
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outlineStrong,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    color: colors.onSurface,
    fontFamily: fonts.sansBold,
    fontSize: 22,
    letterSpacing: 1.4,
  },
  headerSpacer: {
    width: 48,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  statValue: {
    fontFamily: fonts.monoBold,
    fontSize: 30,
  },
  statValueSmall: {
    fontFamily: fonts.monoBold,
    fontSize: 22,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  historyHeading: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  historyHeadingText: {
    color: colors.primary,
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    paddingVertical: 48,
  },
  emptyText: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  historyGroups: {
    gap: 16,
    paddingBottom: 8,
  },
  historyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    padding: 16,
    gap: 12,
  },
  historyDate: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  historyItems: {
    gap: 8,
  },
  flex: {
    flexGrow: 1,
  },
  historyItem: {
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
  },
  historyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.82,
  },
  historyTime: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  roundsChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.3)',
    backgroundColor: 'rgba(48,209,88,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roundsChipText: {
    color: colors.primary,
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  historyDuration: {
    color: colors.onSurface,
    fontFamily: fonts.monoBold,
    fontSize: 16,
  },
});
