import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { TimerConfig, TimerPhase } from '../types';
import { colors, fonts, gradients } from '../theme';
import { calculateTotalTime, formatTime } from '../utils/timeUtils';
import { shouldAnnounceRestFiveSeconds, shouldPlayCountdownBeep } from '../utils/timerAlerts';
import { speak, stopSpeech } from '../utils/tts';
import { AudioCueName } from '../utils/audioCues';
import { useActiveTimerEngine } from '../hooks/useActiveTimerEngine';
import { useWakeLock } from '../hooks/useWakeLock';
import { useStore } from '../store';

interface ActiveTimerProps {
  config: TimerConfig;
  exercises: string[];
  onFinish: () => void;
  onExit: () => void;
  playAudioCue: (name: AudioCueName) => void;
  stopAudioCues: () => void;
}

// Phase configuration
const phaseConfig = {
  [TimerPhase.PREP]: {
    colors: gradients.prep,
    ringColor: colors.prep,
    label: 'PREP',
  },
  [TimerPhase.WORK]: {
    colors: gradients.work,
    ringColor: colors.work,
    label: 'WORK',
  },
  [TimerPhase.REST]: {
    colors: gradients.rest,
    ringColor: colors.rest,
    label: 'REST',
  },
  [TimerPhase.COOL_DOWN]: {
    colors: gradients.cooldown,
    ringColor: colors.cooldown,
    label: 'COOL DOWN',
  },
  [TimerPhase.FINISHED]: {
    colors: gradients.finished,
    ringColor: colors.finished,
    label: 'DONE',
  },
};

const RING_SIZE = 280;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface ProgressRingProps {
  progress: number;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ progress }) => (
  <Svg
    width={RING_SIZE}
    height={RING_SIZE}
    style={styles.ringSvg}
    viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
  >
    <Circle
      cx={RING_SIZE / 2}
      cy={RING_SIZE / 2}
      r={RING_RADIUS}
      stroke="rgba(255,255,255,0.18)"
      strokeWidth={RING_STROKE}
      fill="none"
    />
    <Circle
      cx={RING_SIZE / 2}
      cy={RING_SIZE / 2}
      r={RING_RADIUS}
      stroke={colors.onSurface}
      strokeWidth={RING_STROKE}
      strokeLinecap="round"
      fill="none"
      strokeDasharray={RING_CIRCUMFERENCE}
      strokeDashoffset={RING_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)))}
      transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
    />
  </Svg>
);

/** Spoken cue rendered large with a pop-in each time it changes. */
const CueFlash: React.FC<{ cue: string }> = ({ cue }) => {
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!cue) return;
    scale.setValue(0.5);
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [cue, scale]);

  if (!cue) return null;

  return (
    <Animated.Text
      style={[styles.exerciseText, { transform: [{ scale }] }]}
      numberOfLines={2}
      adjustsFontSizeToFit
    >
      {cue}
    </Animated.Text>
  );
};

// Round count under the timer
interface RoundCountProps {
  currentRound: number;
  totalRounds: number;
}

const RoundCount: React.FC<RoundCountProps> = ({ currentRound, totalRounds }) => (
  <View style={styles.roundCount} accessibilityLabel={`Round ${currentRound} of ${totalRounds}`}>
    <Text style={styles.roundCountLabel}>ROUND</Text>
    <Text style={styles.roundCountValue}>
      {currentRound} / {totalRounds}
    </Text>
  </View>
);

const triggerPhaseHaptic = (phase: TimerPhase) => {
  try {
    if (phase === TimerPhase.WORK) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (phase === TimerPhase.FINISHED) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  } catch {
    // Haptics unavailable (e.g. desktop web) — ignore.
  }
};

export const ActiveTimer: React.FC<ActiveTimerProps> = ({
  config,
  exercises,
  onFinish,
  onExit,
  playAudioCue,
  stopAudioCues,
}) => {
  useWakeLock();

  const hapticsEnabled = useStore((state) => state.hapticsEnabled);
  const hasAnnouncedPrepRef = useRef(false);
  const hasAnnouncedRestFiveSecondsRef = useRef(false);
  const prevPhaseRef = useRef<TimerPhase | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const { phase, timeRemaining, currentRound, currentCue, isPaused, togglePause } =
    useActiveTimerEngine({
      config,
      exercises,
      onAnnounce: (message, options) =>
        speak(message, {
          interrupt: options?.interrupt ?? true,
          afterPreviousEndMs: options?.afterPreviousEndMs ?? 0,
          rate: options?.rate,
        }),
    });

  useEffect(() => {
    if (hasAnnouncedPrepRef.current) return;
    hasAnnouncedPrepRef.current = true;
    speak('Get ready', { interrupt: true });
  }, []);

  // Synchronized countdown beeps
  useEffect(() => {
    if (shouldPlayCountdownBeep(phase, timeRemaining, isPaused, config.workTime)) {
      playAudioCue('beep');
    }
  }, [timeRemaining, phase, isPaused, playAudioCue, config.workTime]);

  useEffect(() => {
    if (phase !== TimerPhase.REST) {
      hasAnnouncedRestFiveSecondsRef.current = false;
      return;
    }

    if (
      shouldAnnounceRestFiveSeconds(
        phase,
        timeRemaining,
        isPaused,
        hasAnnouncedRestFiveSecondsRef.current
      )
    ) {
      hasAnnouncedRestFiveSecondsRef.current = true;
      speak('5 Seconds', { interrupt: true });
    }
  }, [timeRemaining, phase, isPaused]);

  // Phase entrance sounds + haptics
  useEffect(() => {
    if (isPaused) return;

    if (prevPhaseRef.current && prevPhaseRef.current !== phase) {
      if (phase === TimerPhase.WORK) {
        playAudioCue('whistle');
      } else if (phase === TimerPhase.REST || phase === TimerPhase.COOL_DOWN) {
        playAudioCue('buzzer');
      }

      if (hapticsEnabled) {
        triggerPhaseHaptic(phase);
      }
    }
    prevPhaseRef.current = phase;
  }, [phase, isPaused, playAudioCue, hapticsEnabled]);

  const currentPhaseConfig = phaseConfig[phase];
  const isCountdown = timeRemaining <= 3 && timeRemaining > 0;

  const phaseDuration = useMemo(() => {
    if (phase === TimerPhase.PREP) return config.prepTime;
    if (phase === TimerPhase.WORK) return config.workTime;
    if (phase === TimerPhase.REST) return config.restTime;
    if (phase === TimerPhase.COOL_DOWN) return config.coolDownTime;
    return 0;
  }, [phase, config]);

  const helperText = useMemo(() => {
    if (phase === TimerPhase.PREP) return 'Get ready';
    if (phase === TimerPhase.REST) return 'Breathe';
    if (phase === TimerPhase.COOL_DOWN) return 'Stretch it out';
    return '';
  }, [phase]);

  useEffect(() => {
    return () => {
      stopAudioCues();
      void stopSpeech();
    };
  }, [stopAudioCues]);

  const handleExit = () => {
    stopAudioCues();
    void stopSpeech();
    onExit();
  };

  const handleExitPress = () => {
    if (phase === TimerPhase.FINISHED) {
      handleExit();
      return;
    }

    if (!isPaused) togglePause();
    setShowExitConfirm(true);
  };

  const handleResumeFromExitConfirm = () => {
    setShowExitConfirm(false);
    if (isPaused) togglePause();
  };

  return (
    <LinearGradient colors={currentPhaseConfig.colors} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.glow, { backgroundColor: `${currentPhaseConfig.ringColor}55` }]} />

        <Modal
          transparent
          visible={isPaused && !showExitConfirm && phase !== TimerPhase.FINISHED}
          animationType="fade"
        >
          <View style={styles.pauseOverlay}>
            <View style={styles.pauseCard}>
              <Text style={styles.pauseLabel}>Paused</Text>
              <Pressable onPress={togglePause} style={styles.resumeButton}>
                <Ionicons name="play" size={28} color={colors.surface} />
                <Text style={styles.resumeText}>RESUME</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal transparent visible={showExitConfirm} animationType="fade">
          <View style={styles.pauseOverlay}>
            <View style={styles.pauseCard}>
              <Text style={styles.pauseLabel}>End workout?</Text>
              <Text style={styles.exitConfirmHint}>Your progress won't be saved</Text>
              <Pressable onPress={handleResumeFromExitConfirm} style={styles.resumeButton}>
                <Ionicons name="play" size={28} color={colors.surface} />
                <Text style={styles.resumeText}>KEEP GOING</Text>
              </Pressable>
              <Pressable onPress={handleExit} style={styles.endButton}>
                <Text style={styles.endButtonText}>END WORKOUT</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <View style={styles.topBar}>
          <Pressable
            onPress={handleExitPress}
            style={styles.topButton}
            accessibilityLabel="Exit workout"
          >
            <Ionicons name="close" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.phaseLabel}>{currentPhaseConfig.label}</Text>
          <View style={styles.roundBadge}>
            <Text style={styles.roundBadgeText}>
              {currentRound}/{config.rounds}
            </Text>
          </View>
        </View>

        <View style={styles.main}>
          {phase === TimerPhase.FINISHED ? (
            <View style={styles.finishWrap}>
              <Text style={styles.finishTitle}>GREAT JOB!</Text>
              <Text style={styles.finishSubtitle}>Workout Complete</Text>
              <View style={styles.finishStats}>
                <View style={styles.finishStat}>
                  <Text style={styles.finishStatValue}>{config.rounds}</Text>
                  <Text style={styles.finishStatLabel}>Rounds</Text>
                </View>
                <View style={styles.finishStatDivider} />
                <View style={styles.finishStat}>
                  <Text style={styles.finishStatValue}>
                    {formatTime(calculateTotalTime(config))}
                  </Text>
                  <Text style={styles.finishStatLabel}>Time</Text>
                </View>
              </View>
              <Pressable onPress={onFinish} style={styles.doneButton} accessibilityLabel="Done">
                <Ionicons name="checkmark" size={24} color={colors.surface} />
                <Text style={styles.doneButtonText}>DONE</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.ringWrap}>
                <ProgressRing progress={phaseDuration > 0 ? timeRemaining / phaseDuration : 0} />
                <Text style={[styles.timerText, isCountdown && styles.timerCountdown]}>
                  {formatTime(timeRemaining)}
                </Text>
              </View>

              {phase === TimerPhase.WORK ? (
                <CueFlash cue={currentCue} />
              ) : (
                <Text style={styles.helperText}>{helperText}</Text>
              )}

              <RoundCount currentRound={currentRound} totalRounds={config.rounds} />
            </>
          )}
        </View>

        {phase !== TimerPhase.FINISHED ? (
          <View style={styles.controls}>
            <Pressable
              onPress={togglePause}
              style={styles.pauseButton}
              accessibilityLabel={isPaused ? 'Resume Timer' : 'Pause Timer'}
            >
              <Ionicons name={isPaused ? 'play' : 'pause'} size={28} color={colors.surface} />
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    top: '24%',
    left: '50%',
    height: 320,
    width: 320,
    marginLeft: -160,
    marginTop: -160,
    borderRadius: 999,
    opacity: 0.28,
  },
  pauseOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  pauseCard: {
    alignItems: 'center',
    gap: 24,
  },
  pauseLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fonts.sansBold,
    fontSize: 20,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  exitConfirmHint: {
    marginTop: -12,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: fonts.sansMedium,
    fontSize: 15,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: colors.onSurface,
    paddingHorizontal: 32,
    paddingVertical: 18,
  },
  resumeText: {
    color: colors.surface,
    fontFamily: fonts.sansBold,
    fontSize: 18,
  },
  endButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  endButtonText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: fonts.sansBold,
    fontSize: 15,
    letterSpacing: 0.8,
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
  roundBadge: {
    minWidth: 72,
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roundBadgeText: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: fonts.monoMedium,
    fontSize: 14,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  finishWrap: {
    alignItems: 'center',
    gap: 12,
  },
  finishTitle: {
    color: colors.onSurface,
    fontFamily: fonts.sansBlack,
    fontSize: 48,
    textAlign: 'center',
  },
  finishSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: fonts.sansSemiBold,
    fontSize: 24,
  },
  finishStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  finishStat: {
    alignItems: 'center',
    gap: 4,
  },
  finishStatValue: {
    color: colors.onSurface,
    fontFamily: fonts.monoBold,
    fontSize: 28,
  },
  finishStatLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  finishStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    borderRadius: 999,
    backgroundColor: colors.onSurface,
    paddingHorizontal: 40,
    paddingVertical: 18,
  },
  doneButtonText: {
    color: colors.surface,
    fontFamily: fonts.sansBold,
    fontSize: 18,
    letterSpacing: 0.8,
  },
  ringWrap: {
    height: RING_SIZE,
    width: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  timerText: {
    color: colors.onSurface,
    fontFamily: fonts.monoBold,
    fontSize: 64,
    letterSpacing: -3,
  },
  timerCountdown: {
    transform: [{ scale: 1.04 }],
  },
  exerciseText: {
    marginTop: 24,
    minHeight: 44,
    color: colors.onSurface,
    fontFamily: fonts.sansBold,
    fontSize: 36,
    textAlign: 'center',
  },
  helperText: {
    marginTop: 24,
    minHeight: 44,
    color: 'rgba(255,255,255,0.72)',
    fontFamily: fonts.sansMedium,
    fontSize: 20,
    textAlign: 'center',
  },
  roundCount: {
    alignItems: 'center',
    gap: 4,
    marginTop: 24,
  },
  roundCountLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  roundCountValue: {
    color: colors.onSurface,
    fontFamily: fonts.monoBold,
    fontSize: 20,
  },
  controls: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 28,
  },
  pauseButton: {
    height: 64,
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: colors.onSurface,
  },
});
