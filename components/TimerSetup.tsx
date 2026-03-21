import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TimerConfig, TimerMode } from '../types';
import { colors, fonts } from '../theme';
import { NumberInput } from './NumberInput';
import { calculateTotalTime, formatTime } from '../utils/timeUtils';

interface TimerSetupProps {
  config: TimerConfig;
  setConfig: React.Dispatch<React.SetStateAction<TimerConfig>>;
  mode: TimerMode;
  onModeChange: (mode: TimerMode) => void;
  onStart: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
}

export const TimerSetup: React.FC<TimerSetupProps> = ({
  config,
  setConfig,
  mode,
  onModeChange,
  onStart,
  onOpenSettings,
  onOpenStats,
}) => {
  const updateConfig = (
    key: 'prepTime' | 'workTime' | 'restTime' | 'rounds' | 'coolDownTime',
    value: number
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const isSaqMode = mode === 'SAQ';
  const totalDuration = calculateTotalTime(config);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="timer-outline" size={22} color={colors.primary} />
          <Text style={styles.title}>Interval Trainer</Text>
        </View>
        <Text style={styles.subtitle}>Choose a session mode and train</Text>
      </View>

      <View style={styles.modeCard}>
        <Pressable
          onPress={() => onModeChange('INTERVAL')}
          style={({ pressed }) => [
            styles.modeButton,
            mode === 'INTERVAL' ? styles.modeButtonActive : styles.modeButtonInactive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.modeLabel, mode === 'INTERVAL' && styles.modeLabelActive]}>
            INTERVAL
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onModeChange('SAQ')}
          style={({ pressed }) => [
            styles.modeButton,
            mode === 'SAQ' ? styles.modeButtonActive : styles.modeButtonInactive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.modeLabel, mode === 'SAQ' && styles.modeLabelActive]}>SAQ</Text>
        </Pressable>
      </View>

      {!isSaqMode ? (
        <Pressable
          onPress={() => setConfig((prev) => ({ ...prev, slowMode: !prev.slowMode }))}
          style={({ pressed }) => [
            styles.slowModeCard,
            config.slowMode ? styles.slowModeCardActive : null,
            pressed && styles.pressed,
          ]}
        >
          <View>
            <Text style={styles.slowModeLabel}>Add Break</Text>
          </View>
          <View style={[styles.toggleTrack, config.slowMode ? styles.toggleTrackActive : null]}>
            <View style={[styles.toggleThumb, config.slowMode ? styles.toggleThumbActive : null]} />
          </View>
        </Pressable>
      ) : null}

      <View style={styles.inputs}>
        <NumberInput
          label="Prep"
          value={config.prepTime}
          onChange={(v) => updateConfig('prepTime', v)}
          step={5}
          min={5}
        />
        <NumberInput
          label="Work"
          value={config.workTime}
          onChange={(v) => updateConfig('workTime', v)}
          step={5}
          min={5}
          readOnly
        />
        <NumberInput
          label="Rest"
          value={config.restTime}
          onChange={(v) => updateConfig('restTime', v)}
          step={1}
          min={15}
          max={3600}
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
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total</Text>
        <Text style={styles.summaryValue}>{formatTime(totalDuration)}</Text>
      </View>

      <View style={styles.sessionCard}>
        <Text style={styles.sessionHeading}>Session Summary</Text>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionKey}>Mode</Text>
          <Text style={styles.sessionValue}>{mode}</Text>
        </View>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionKey}>Rounds</Text>
          <Text style={styles.sessionValue}>{config.rounds}</Text>
        </View>
        {!isSaqMode ? (
          <View style={styles.sessionRow}>
            <Text style={styles.sessionKey}>Add Break</Text>
            <Text style={styles.sessionValue}>{config.slowMode ? 'ON' : 'OFF'}</Text>
          </View>
        ) : null}
        <View style={styles.sessionRowLast}>
          <Text style={styles.sessionKey}>Work / Rest</Text>
          <Text style={styles.sessionValue}>
            {config.workTime}s / {config.restTime}s
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onOpenSettings}
          style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={22} color={colors.onSurfaceVariant} />
        </Pressable>

        <Pressable
          onPress={onOpenStats}
          style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
          accessibilityLabel="Statistics"
        >
          <Ionicons name="bar-chart-outline" size={22} color={colors.onSurfaceVariant} />
        </Pressable>

        <Pressable
          onPress={onStart}
          style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}
        >
          <Ionicons name="play" size={20} color={colors.primary} />
          <Text style={styles.startButtonText}>START</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: colors.onSurface,
    fontFamily: fonts.sansSemiBold,
    fontSize: 24,
  },
  subtitle: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  modeCard: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    padding: 8,
  },
  modeButton: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
  },
  modeButtonActive: {
    borderColor: 'rgba(0,240,255,0.5)',
    backgroundColor: 'rgba(0,240,255,0.2)',
  },
  modeButtonInactive: {
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  modeLabel: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    letterSpacing: 2.6,
  },
  modeLabelActive: {
    color: colors.primary,
  },
  slowModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: 'rgba(0,0,0,0.14)',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  slowModeCardActive: {
    borderColor: 'rgba(0,240,255,0.45)',
    backgroundColor: 'rgba(0,240,255,0.12)',
  },
  slowModeLabel: {
    color: colors.primary,
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  toggleTrack: {
    height: 28,
    width: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 3,
  },
  toggleTrackActive: {
    backgroundColor: 'rgba(0,240,255,0.7)',
  },
  toggleThumb: {
    height: 22,
    width: 22,
    borderRadius: 11,
    backgroundColor: colors.onSurface,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  inputs: {
    gap: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  summaryLabel: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  summaryValue: {
    color: colors.primary,
    fontFamily: fonts.monoBold,
    fontSize: 24,
  },
  sessionCard: {
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    padding: 18,
  },
  sessionHeading: {
    color: colors.primary,
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 10,
  },
  sessionRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionKey: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  sessionValue: {
    color: colors.onSurface,
    fontFamily: fonts.monoBold,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 8,
  },
  iconAction: {
    height: 56,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outlineStrong,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  startButton: {
    flex: 2,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.45)',
    backgroundColor: 'rgba(0,240,255,0.18)',
  },
  startButtonText: {
    color: colors.primary,
    fontFamily: fonts.sansBold,
    fontSize: 18,
    letterSpacing: 0.8,
  },
  pressed: {
    opacity: 0.82,
  },
});
