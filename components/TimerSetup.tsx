import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TimerConfig } from '../types';
import { colors, elevation, fonts } from '../theme';
import { NumberInput } from './NumberInput';
import { useStore } from '../store';
import { getReactiveSessionConfig, getReactiveSetupError } from '../utils/reactiveSession';

interface TimerSetupProps {
  config: TimerConfig;
  setConfig: React.Dispatch<React.SetStateAction<TimerConfig>>;
  onStart: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
}

export const TimerSetup: React.FC<TimerSetupProps> = ({
  config,
  setConfig,
  onStart,
  onOpenSettings,
  onOpenStats,
}) => {
  const cueOutputMode = useStore((state) => state.cueOutputMode);
  const updateConfig = (key: 'restTime' | 'rounds', value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const snapshot = getReactiveSessionConfig({ timerConfig: config, cueOutputMode });
  const setupError = getReactiveSetupError(snapshot);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="timer-outline" size={22} color={colors.primary} />
          <Text style={styles.title}>Reactive Agility</Text>
        </View>
        <Text style={styles.subtitle}>React to a random direction each round</Text>
      </View>

      <View style={styles.inputs}>
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
          max={100}
        />
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
          disabled={Boolean(setupError)}
          accessibilityLabel="Start workout"
          accessibilityState={{ disabled: Boolean(setupError) }}
          style={({ pressed }) => [
            styles.startButton,
            setupError && styles.startButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="play" size={20} color={colors.surface} />
          <Text style={styles.startButtonText}>START</Text>
        </Pressable>
      </View>
      {setupError ? <Text style={styles.timingError}>{setupError}</Text> : null}
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
  inputs: {
    gap: 12,
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
    backgroundColor: colors.primary,
    ...elevation.medium,
  },
  startButtonDisabled: {
    backgroundColor: colors.paused,
  },
  startButtonText: {
    color: colors.surface,
    fontFamily: fonts.sansBold,
    fontSize: 18,
    letterSpacing: 0.8,
  },
  timingError: {
    color: colors.danger,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
