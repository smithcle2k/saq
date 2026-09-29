import React, { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import type { ProgressionStage } from '../types';
import { colors, fonts } from '../theme';
import { useStore } from '../store';
import { getCurrentSessionConfig } from '../utils/sessionPresets';
import {
  ADVANCE_MIN_CLEAN_PCT,
  ADVANCE_MIN_COVERAGE_PCT,
  ADVANCE_MIN_LOGGED,
  ADVANCE_REQUIRED_RUN,
  getProgressionStatus,
  matchesProgressionStage,
  PROGRESSION_STAGE_LIST,
  PROGRESSION_STAGES,
} from '../utils/progression';

/** Opt-in stages. Suggestions are shown with their evidence; changing stage is always a tap. */
export const ProgressionCard: React.FC = () => {
  const settings = useStore(
    useShallow((state) => ({
      timerConfig: state.timerConfig,
      exercises: state.exercises,
      cueSettings: state.cueSettings,
      drillSettings: state.drillSettings,
      cueOutputMode: state.cueOutputMode,
    }))
  );
  const progression = useStore((state) => state.progression);
  const history = useStore((state) => state.history);
  const setProgressionEnabled = useStore((state) => state.setProgressionEnabled);
  const applyStage = useStore((state) => state.applyStage);
  const [error, setError] = useState('');

  const current = useMemo(() => getCurrentSessionConfig(settings), [settings]);
  const status = useMemo(() => getProgressionStatus(history, progression), [history, progression]);
  const matches = matchesProgressionStage(current, progression.stage);

  const choose = (stage: ProgressionStage) => {
    const result = applyStage(stage);
    setError(result.ok ? '' : `Stage ${stage} was not applied: ${result.message}`);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text style={styles.heading}>Progression</Text>
          <Text style={styles.hint}>Optional stages. You decide when to move on.</Text>
        </View>
        <Switch
          value={progression.enabled}
          onValueChange={setProgressionEnabled}
          trackColor={{ false: 'rgba(148,163,184,0.35)', true: 'rgba(48,209,88,0.45)' }}
          thumbColor={progression.enabled ? colors.primary : '#f1f5f9'}
          ios_backgroundColor="rgba(148,163,184,0.35)"
          accessibilityLabel={`${progression.enabled ? 'Turn off' : 'Turn on'} progression`}
        />
      </View>

      {progression.enabled ? (
        <>
          <View style={styles.chipRow}>
            {PROGRESSION_STAGE_LIST.map((stage) => {
              const selected = progression.stage === stage;
              return (
                <Pressable
                  key={stage}
                  onPress={() => choose(stage)}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Use stage ${stage}: ${PROGRESSION_STAGES[stage].label}`}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {stage}. {PROGRESSION_STAGES[stage].label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {matches ? (
            <Text style={styles.hint}>
              Setup matches stage {progression.stage}. Completed sessions count toward it.
            </Text>
          ) : (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Setup differs from stage {progression.stage}, so sessions will not count.
              </Text>
              <Pressable
                onPress={() => choose(progression.stage)}
                style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
              >
                <Text style={styles.actionText}>APPLY STAGE {progression.stage}</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.hint}>
            A next stage is suggested after {ADVANCE_REQUIRED_RUN} sessions in a row at this stage,
            each with ≥{ADVANCE_MIN_LOGGED} logged reps, ≥{ADVANCE_MIN_COVERAGE_PCT}% of rounds
            logged and ≥{ADVANCE_MIN_CLEAN_PCT}% clean. Replays don&apos;t count.
          </Text>

          {status.recent.length === 0 ? (
            <Text style={styles.hint}>No sessions at this stage yet.</Text>
          ) : (
            status.recent.map((evaluation) => (
              <View key={evaluation.sessionId} style={styles.sessionRow}>
                <Ionicons
                  name={evaluation.qualifies ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={evaluation.qualifies ? colors.primary : colors.onSurfaceVariant}
                />
                <Text style={styles.sessionDate}>{format(new Date(evaluation.date), 'MMM d')}</Text>
                <Text style={styles.sessionReason}>{evaluation.reason}</Text>
              </View>
            ))
          )}
          <Text style={styles.hint}>
            {status.run.length}/{ADVANCE_REQUIRED_RUN} qualifying in a row
          </Text>

          {status.suggestedStage ? (
            <View style={styles.suggestion}>
              <Text style={styles.suggestionText}>
                Ready to try stage {status.suggestedStage}:{' '}
                {PROGRESSION_STAGES[status.suggestedStage].label}
              </Text>
              <Pressable
                onPress={() => choose(status.suggestedStage as ProgressionStage)}
                style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                accessibilityLabel={`Apply stage ${status.suggestedStage}`}
              >
                <Text style={styles.actionText}>APPLY STAGE {status.suggestedStage}</Text>
              </Pressable>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heading: {
    color: colors.primary,
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  hint: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.outlineStrong,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
  },
  chipSelected: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
  },
  chipTextSelected: {
    color: colors.primary,
  },
  notice: {
    gap: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,204,0,0.12)',
    padding: 12,
  },
  noticeText: {
    color: colors.prep,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
  suggestion: {
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    padding: 12,
  },
  suggestionText: {
    color: colors.onSurface,
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
  },
  actionButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
  },
  actionText: {
    color: colors.surface,
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: 0.8,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionDate: {
    width: 52,
    color: colors.onSurface,
    fontFamily: fonts.monoMedium,
    fontSize: 13,
  },
  sessionReason: {
    flex: 1,
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.82,
  },
});
