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

      <View style={styles.historyHeading}>
        <Ionicons name="time-outline" size={16} color={colors.primary} />
        <Text style={styles.historyHeadingText}>Activity History</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
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
                    <View key={`${item.date}-${index}`} style={styles.historyItem}>
                      <Text style={styles.historyTime}>
                        {format(new Date(item.date), 'h:mm a')}
                      </Text>
                      <Text style={styles.historyDuration}>
                        {formatAccumulatedDuration(item.duration)}
                      </Text>
                    </View>
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
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  historyTime: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  historyDuration: {
    color: colors.onSurface,
    fontFamily: fonts.monoBold,
    fontSize: 16,
  },
});
