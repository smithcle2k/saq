import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CueOutputMode } from '../types';
import { colors, fonts, gradients } from '../theme';
import { formatTime } from '../utils/timeUtils';
import { speakCue, stopSpeech } from '../utils/tts';
import type { AudioCueName } from '../utils/audioCues';
import { useWakeLock } from '../hooks/useWakeLock';
import { createWarmupState, warmupReducer } from '../utils/warmupPlan';
import type { WarmupAction, WarmupState, WarmupStep } from '../utils/warmupPlan';

interface WarmupTimerProps {
  steps: WarmupStep[];
  cueOutputMode: CueOutputMode;
  playAudioCue: (name: AudioCueName) => void;
  stopAudioCues: () => void;
  /** Called once with the unpaused seconds actually run (skipped time excluded). */
  onDone: (activeSeconds: number) => void;
  onExit: () => void;
}

const TICK_INTERVAL_MS = 250;

/** Timed warm-up before round 1. Separate from the workout: nothing here is scored or logged. */
export const WarmupTimer: React.FC<WarmupTimerProps> = ({
  steps,
  cueOutputMode,
  playAudioCue,
  stopAudioCues,
  onDone,
  onExit,
}) => {
  useWakeLock();
  const [state, setState] = useState<WarmupState>(() => createWarmupState(steps));
  const stateRef = useRef(state);
  const lastTickRef = useRef(Date.now());
  const announcedStepRef = useRef(-1);
  const hasFinishedRef = useRef(false);

  const dispatch = useCallback(
    (action: WarmupAction) => {
      const next = warmupReducer(stateRef.current, action, steps);
      if (next === stateRef.current) return;
      stateRef.current = next;
      setState(next);
    },
    [steps]
  );

  const silence = useCallback(() => {
    stopAudioCues();
    void stopSpeech();
  }, [stopAudioCues]);

  // Wall-clock ticks, as in the workout engine, so throttled timers catch up.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      if (stateRef.current.status !== 'RUNNING') {
        lastTickRef.current = now;
        return;
      }
      const seconds = Math.floor((now - lastTickRef.current) / 1000);
      if (seconds < 1) return;
      lastTickRef.current += seconds * 1000;
      dispatch({ type: 'TICK', seconds });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [dispatch]);

  const { stepIndex, remainingSeconds, status } = state;
  const step = steps[stepIndex];

  // Announce each step once, when it is running; follows the cue output mode.
  useEffect(() => {
    if (status !== 'RUNNING' || announcedStepRef.current === stepIndex || !step) return;
    announcedStepRef.current = stepIndex;
    speakCue(`${step.title}. ${step.instruction}`, cueOutputMode, { interrupt: true });
  }, [status, stepIndex, step, cueOutputMode]);

  useEffect(() => {
    if (status === 'RUNNING' && remainingSeconds > 0 && remainingSeconds <= 3) {
      playAudioCue('beep');
    }
    // Only on countdown second changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds]);

  useEffect(() => {
    if (status === 'PAUSED') {
      silence();
      // Pausing may cut the step's announcement short; say it again on resume.
      announcedStepRef.current = -1;
    }
    if (status !== 'DONE' || hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    // No warm-up speech or beep may carry into the workout.
    silence();
    onDone(stateRef.current.activeSeconds);
  }, [status, silence, onDone]);

  useEffect(() => silence, [silence]);

  const isPaused = status === 'PAUSED';
  const nextStep = steps[stepIndex + 1];
  const remainingTotal =
    remainingSeconds +
    steps.slice(stepIndex + 1).reduce((sum, item) => sum + item.durationSeconds, 0);

  return (
    <LinearGradient colors={gradients.cooldown} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              silence();
              onExit();
            }}
            style={styles.topButton}
            accessibilityLabel="Exit warm-up and workout"
          >
            <Ionicons name="close" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.phaseLabel}>WARM-UP</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {Math.min(stepIndex + 1, steps.length)}/{steps.length}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.main} showsVerticalScrollIndicator={false}>
          {step ? (
            <>
              <Text style={styles.title} accessibilityRole="header">
                {step.title}
              </Text>
              <Text style={styles.timer}>{formatTime(remainingSeconds)}</Text>
              <Text style={styles.instruction}>{step.instruction}</Text>
              <Text style={styles.meta}>
                {nextStep ? `Next: ${nextStep.title}` : 'Next: workout'} ·{' '}
                {formatTime(remainingTotal)} left
              </Text>
              <Text style={styles.meta}>Not scored. Your workout starts after this.</Text>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.controls}>
          <Pressable
            onPress={() => dispatch({ type: 'SKIP_STEP' })}
            style={({ pressed }) => [styles.sideButton, pressed && styles.pressed]}
            accessibilityLabel="Skip this warm-up step"
          >
            <Ionicons name="play-skip-forward" size={22} color={colors.onSurface} />
            <Text style={styles.sideButtonText}>Skip step</Text>
          </Pressable>
          <Pressable
            onPress={() => dispatch({ type: isPaused ? 'RESUME' : 'PAUSE' })}
            style={({ pressed }) => [styles.pauseButton, pressed && styles.pressed]}
            accessibilityLabel={isPaused ? 'Resume warm-up' : 'Pause warm-up'}
          >
            <Ionicons name={isPaused ? 'play' : 'pause'} size={28} color={colors.surface} />
          </Pressable>
          <Pressable
            onPress={() => dispatch({ type: 'SKIP_ALL' })}
            style={({ pressed }) => [styles.sideButton, pressed && styles.pressed]}
            accessibilityLabel="Skip warm-up and start workout"
          >
            <Ionicons name="play-forward" size={22} color={colors.onSurface} />
            <Text style={styles.sideButtonText}>Skip warm-up</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topButton: {
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  phaseLabel: {
    flex: 1,
    color: colors.onSurface,
    fontFamily: fonts.sansSemiBold,
    fontSize: 18,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  badge: {
    minWidth: 72,
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: fonts.monoMedium,
    fontSize: 14,
  },
  main: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  title: {
    color: colors.onSurface,
    fontFamily: fonts.sansBlack,
    fontSize: 40,
    textAlign: 'center',
  },
  timer: {
    color: colors.onSurface,
    fontFamily: fonts.monoBold,
    fontSize: 72,
    letterSpacing: -3,
  },
  instruction: {
    color: colors.onSurface,
    fontFamily: fonts.sansSemiBold,
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
  },
  meta: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  sideButton: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 8,
  },
  sideButtonText: {
    color: colors.onSurface,
    fontFamily: fonts.sansBold,
    fontSize: 14,
  },
  pauseButton: {
    height: 64,
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: colors.onSurface,
  },
  pressed: {
    opacity: 0.82,
  },
});
