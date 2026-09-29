import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RepOutcome } from '../types';
import { colors, fonts } from '../theme';
import {
  formatSelfReportedTime,
  parseSelfReportedTime,
  REP_OUTCOME_LABELS,
  REP_OUTCOMES,
} from '../utils/repLogging';
import type { RoundLog } from '../utils/repLogging';

interface RestRepLogProps {
  roundNumber: number;
  log: RoundLog | undefined;
  onSetOutcome: (outcome: RepOutcome) => void;
  onClearOutcome: () => void;
  onSetTime: (timeMs: number) => void;
  onClearTime: () => void;
}

const OUTCOME_ICONS: Record<RepOutcome, React.ComponentProps<typeof Ionicons>['name']> = {
  CLEAN: 'checkmark-circle',
  WRONG_FIRST_STEP: 'swap-horizontal',
  MISSED_STOPPED: 'close-circle',
};

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'] as const;
const MAX_DRAFT_LENGTH = 6;

/**
 * Optional self-report for the round just completed. Mounted per round id, so an
 * uncommitted time draft is discarded when REST ends and the next WORK starts.
 */
export const RestRepLog: React.FC<RestRepLogProps> = ({
  roundNumber,
  log,
  onSetOutcome,
  onClearOutcome,
  onSetTime,
  onClearTime,
}) => {
  const [isPadOpen, setIsPadOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const draftMs = parseSelfReportedTime(draft);

  const handleKey = (key: (typeof PAD_KEYS)[number]) => {
    if (key === 'DEL') {
      setDraft((prev) => prev.slice(0, -1));
      return;
    }
    setDraft((prev) => {
      if (prev.length >= MAX_DRAFT_LENGTH) return prev;
      if (key === '.' && prev.includes('.')) return prev;
      return prev + key;
    });
  };

  const commitTime = () => {
    if (draftMs === null) return;
    onSetTime(draftMs);
    setDraft('');
    setIsPadOpen(false);
  };

  const cancelPad = () => {
    setDraft('');
    setIsPadOpen(false);
  };

  if (isPadOpen) {
    return (
      <View style={styles.card}>
        <Text style={styles.heading}>ROUND {roundNumber} · YOUR TIME (SECONDS)</Text>
        <Text
          style={[styles.draft, !draft && styles.draftEmpty]}
          accessibilityLabel={draft ? `Entered ${draft} seconds` : 'No time entered'}
        >
          {draft ? `${draft} s` : '— s'}
        </Text>
        <Text style={styles.hint}>Self-entered from your own timer; not measured by the app.</Text>
        <View style={styles.pad}>
          {PAD_KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => handleKey(key)}
              style={({ pressed }) => [styles.padKey, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={
                key === 'DEL' ? 'Delete digit' : key === '.' ? 'Decimal point' : key
              }
            >
              {key === 'DEL' ? (
                <Ionicons name="backspace-outline" size={26} color={colors.onSurface} />
              ) : (
                <Text style={styles.padKeyText}>{key}</Text>
              )}
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <Pressable
            onPress={cancelPad}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Skip</Text>
          </Pressable>
          <Pressable
            onPress={commitTime}
            disabled={draftMs === null}
            style={({ pressed }) => [
              styles.primaryButton,
              draftMs === null && styles.disabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: draftMs === null }}
          >
            <Text style={styles.primaryText}>Save time</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>ROUND {roundNumber} · HOW DID IT GO?</Text>
      <View style={styles.row}>
        {REP_OUTCOMES.map((outcome) => {
          const selected = log?.outcome === outcome;
          return (
            <Pressable
              key={outcome}
              onPress={() => onSetOutcome(outcome)}
              style={({ pressed }) => [
                styles.outcomeButton,
                selected && styles.outcomeSelected,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Round ${roundNumber}: ${REP_OUTCOME_LABELS[outcome]}`}
            >
              <Ionicons
                name={OUTCOME_ICONS[outcome]}
                size={22}
                color={selected ? colors.surface : colors.onSurface}
              />
              <Text style={[styles.outcomeText, selected && styles.outcomeTextSelected]}>
                {REP_OUTCOME_LABELS[outcome]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.row}>
        <Pressable
          onPress={onClearOutcome}
          disabled={!log?.outcome}
          style={({ pressed }) => [
            styles.secondaryButton,
            !log?.outcome && styles.disabled,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Set round to not logged"
        >
          <Text style={styles.secondaryText}>{log?.outcome ? 'Not logged' : 'Not logged yet'}</Text>
        </Pressable>
        {log?.selfReportedTimeMs !== undefined ? (
          <Pressable
            onPress={onClearTime}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Remove time ${formatSelfReportedTime(log.selfReportedTimeMs)}`}
          >
            <Text style={styles.secondaryText}>
              {formatSelfReportedTime(log.selfReportedTimeMs)} ✕
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setIsPadOpen(true)}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Enter your own time"
          >
            <Text style={styles.secondaryText}>+ Time</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
  },
  heading: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  outcomeButton: {
    flex: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  outcomeSelected: {
    backgroundColor: colors.onSurface,
    borderColor: colors.onSurface,
  },
  outcomeText: {
    color: colors.onSurface,
    fontFamily: fonts.sansBold,
    fontSize: 14,
    textAlign: 'center',
  },
  outcomeTextSelected: {
    color: colors.surface,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  secondaryText: {
    color: colors.onSurface,
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
  },
  primaryButton: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.onSurface,
  },
  primaryText: {
    color: colors.surface,
    fontFamily: fonts.sansBold,
    fontSize: 16,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  draft: {
    color: colors.onSurface,
    fontFamily: fonts.monoBold,
    fontSize: 36,
    textAlign: 'center',
  },
  draftEmpty: {
    color: 'rgba(255,255,255,0.4)',
  },
  hint: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    textAlign: 'center',
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  padKey: {
    width: '31.5%',
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  padKeyText: {
    color: colors.onSurface,
    fontFamily: fonts.monoBold,
    fontSize: 26,
  },
});
