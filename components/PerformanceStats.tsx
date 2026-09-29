import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { WorkoutHistoryItem } from '../types';
import { colors, fonts } from '../theme';
import {
  extractRepObservations,
  MIN_SAMPLE_SIZE,
  perCueBreakdown,
  splitReplays,
  summarizeOutcomes,
} from '../utils/performanceStats';
import type { OutcomeSummary, TimeSummary } from '../utils/performanceStats';

const formatPct = (value: number) => `${Math.round(value)}%`;
const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(2)} s`;

const Section: React.FC<{ title: string; population: string; children: React.ReactNode }> = ({
  title,
  population,
  children,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.population}>{population}</Text>
    {children}
  </View>
);

const NotEnough: React.FC<{ have: number; what: string }> = ({ have, what }) => (
  <Text style={styles.notEnough}>
    Not enough data yet · {have} {what} (need {MIN_SAMPLE_SIZE})
  </Text>
);

/** Clean % with its logged n, eligible total and logging coverage always beside it. */
const OutcomeLine: React.FC<{ summary: OutcomeSummary }> = ({ summary }) => {
  const counts = `${summary.logged} logged of ${summary.eligible} eligible${
    summary.coveragePct === null ? '' : ` (${formatPct(summary.coveragePct)} coverage)`
  }`;
  if (!summary.sufficient || summary.cleanPct === null) {
    return (
      <View style={styles.metric}>
        <NotEnough have={summary.logged} what="logged" />
        <Text style={styles.counts}>{counts}</Text>
      </View>
    );
  }
  return (
    <View
      style={styles.metric}
      accessible
      accessibilityLabel={`Clean ${formatPct(summary.cleanPct)}, ${counts}`}
    >
      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>Clean</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${summary.cleanPct}%` }]} />
        </View>
        <Text style={styles.metricValue}>{formatPct(summary.cleanPct)}</Text>
      </View>
      <Text style={styles.counts}>{counts}</Text>
    </View>
  );
};

const TimeLine: React.FC<{ summary: TimeSummary }> = ({ summary }) =>
  !summary.sufficient || summary.meanMs === null ? (
    <NotEnough have={summary.timedN} what="timed clean reps" />
  ) : (
    <Text style={styles.timeLine}>
      Avg self-entered time (clean reps) {formatSeconds(summary.meanMs)} · timed n={summary.timedN}
    </Text>
  );

const ReplayNote: React.FC<{ count: number }> = ({ count }) => (
  <Text style={styles.population}>
    {count} replay {count === 1 ? 'session' : 'sessions'} excluded: a repeated cue sequence is
    familiar, so it is not a new reaction.
  </Text>
);

export const PerformanceStats: React.FC<{ history: WorkoutHistoryItem[] }> = ({ history }) => {
  const { fresh, replayCount } = useMemo(() => splitReplays(history), [history]);
  const reps = useMemo(
    () =>
      extractRepObservations(fresh).filter(
        (rep) => rep.drillType === 'REACTIVE' || rep.drillType === 'OPEN_REACTIVE'
      ),
    [fresh]
  );

  const overall = useMemo(() => summarizeOutcomes(reps), [reps]);
  const cueRows = useMemo(() => perCueBreakdown(reps, 'ALL'), [reps]);

  if (reps.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <Text style={styles.population}>
          No reactive round records yet. Finish a workout and tap an outcome during rest to see
          results here. Older workouts remain in Activity History.
        </Text>
        {replayCount > 0 ? <ReplayNote count={replayCount} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {replayCount > 0 ? <ReplayNote count={replayCount} /> : null}
      <Section
        title="Logging"
        population="Reactive rounds with records. Untapped rounds are never counted as clean or failed."
      >
        <Text style={styles.counts}>
          {overall.logged} of {overall.eligible} rounds logged
          {overall.coveragePct === null ? '' : ` (${formatPct(overall.coveragePct)})`}
        </Text>
      </Section>

      <Section
        title="By final cue"
        population="Completed reactive rounds grouped by their final target. Both cues must be delivered."
      >
        {cueRows.length === 0 ? (
          <Text style={styles.notEnough}>No reps in this population yet.</Text>
        ) : (
          cueRows.map((row) => (
            <View key={row.label} style={styles.pair}>
              <Text style={styles.pairTitle}>{row.label}</Text>
              <OutcomeLine summary={row.outcomes} />
              <TimeLine summary={row.times} />
            </View>
          ))
        )}
      </Section>

      <Text style={styles.footnote}>
        Outcomes and times are self-reported. Times come from your own external timer; the app does
        not measure reaction time.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  section: {
    gap: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    padding: 16,
  },
  sectionTitle: {
    color: colors.primary,
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  population: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  pair: {
    gap: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 12,
  },
  pairTitle: {
    color: colors.onSurface,
    fontFamily: fonts.sansBold,
    fontSize: 14,
  },
  metric: {
    gap: 2,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    width: 44,
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
  },
  metricValue: {
    width: 44,
    color: colors.onSurface,
    fontFamily: fonts.monoBold,
    fontSize: 14,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 8,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  counts: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
  },
  timeLine: {
    color: colors.onSurface,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
  },
  notEnough: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    fontStyle: 'italic',
  },
  footnote: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 16,
  },
});
