import React, { useEffect, useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TimerConfig, TimerPhase } from '../types';
import { colors, fonts, gradients } from '../theme';
import { formatTime } from '../utils/timeUtils';
import { shouldAnnounceRestFiveSeconds, shouldPlayCountdownBeep } from '../utils/timerAlerts';
import { speak, stopSpeech } from '../utils/tts';
import { AudioCueName } from '../utils/audioCues';
import { useActiveTimerEngine } from '../hooks/useActiveTimerEngine';
import { useWakeLock } from '../hooks/useWakeLock';

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

// Round Progress Dots Component
interface RoundDotsProps {
  currentRound: number;
  totalRounds: number;
}

const RoundDots: React.FC<RoundDotsProps> = ({ currentRound, totalRounds }) => {
  const maxDots = 12;
  const showDots = Math.min(totalRounds, maxDots);

  return (
    <View style={styles.roundDots}>
      {Array.from({ length: showDots }, (_, i) => (
        <View
          key={i}
          style={[
            styles.roundDot,
            i < currentRound ? styles.roundDotComplete : styles.roundDotPending,
          ]}
        />
      ))}
      {totalRounds > maxDots ? (
        <Text style={styles.roundOverflow}>+{totalRounds - maxDots}</Text>
      ) : null}
    </View>
  );
};

export const ActiveTimer: React.FC<ActiveTimerProps> = ({
  config,
  exercises,
  onFinish,
  onExit,
  playAudioCue,
  stopAudioCues,
}) => {
  const isSaqMode = config.mode === 'SAQ';
  useWakeLock();

  const hasAnnouncedPrepRef = useRef(false);
  const hasAnnouncedRestFiveSecondsRef = useRef(false);
  const prevPhaseRef = useRef<TimerPhase | null>(null);
  const { phase, timeRemaining, currentRound, isPaused, togglePause } = useActiveTimerEngine({
    config,
    exercises,
    onFinish,
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
    if (shouldPlayCountdownBeep(phase, timeRemaining, isPaused)) {
      playAudioCue('beep');
    }
  }, [timeRemaining, phase, isPaused, playAudioCue]);

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

  // Phase entrance sounds
  useEffect(() => {
    if (isPaused) return;

    if (prevPhaseRef.current && prevPhaseRef.current !== phase) {
      if (phase === TimerPhase.WORK) {
        playAudioCue('whistle');
      } else if (phase === TimerPhase.REST || phase === TimerPhase.COOL_DOWN) {
        playAudioCue('buzzer');
      }
    }
    prevPhaseRef.current = phase;
  }, [phase, isPaused, playAudioCue]);

  const currentPhaseConfig = phaseConfig[phase];
  const isCountdown = timeRemaining <= 3 && timeRemaining > 0;
  const helperText = useMemo(() => {
    if (phase === TimerPhase.PREP) return 'Get ready';
    if (phase === TimerPhase.REST) return isSaqMode ? 'Reset and reload' : 'Breathe';
    if (phase === TimerPhase.COOL_DOWN) return 'Stretch it out';
    return '';
  }, [isSaqMode, phase]);

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

  return (
    <LinearGradient colors={currentPhaseConfig.colors} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.glow, { backgroundColor: `${currentPhaseConfig.ringColor}55` }]} />

        <Modal transparent visible={isPaused && phase !== TimerPhase.FINISHED} animationType="fade">
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

        <View style={styles.topBar}>
          <Pressable onPress={handleExit} style={styles.topButton}>
            <Ionicons name="close" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.phaseLabel}>
            {currentPhaseConfig.label}
            {isSaqMode && phase !== TimerPhase.FINISHED ? ' • SAQ' : ''}
          </Text>
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
            </View>
          ) : (
            <>
              <Text style={[styles.timerText, isCountdown && styles.timerCountdown]}>
                {formatTime(timeRemaining)}
              </Text>

              {phase !== TimerPhase.WORK ? (
                <Text style={styles.helperText}>{helperText}</Text>
              ) : null}

              <RoundDots currentRound={currentRound} totalRounds={config.rounds} />
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
    minWidth: 56,
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
  timerText: {
    color: colors.onSurface,
    fontFamily: fonts.monoBold,
    fontSize: 72,
    letterSpacing: -3,
  },
  timerCountdown: {
    transform: [{ scale: 1.04 }],
  },
  exerciseText: {
    marginTop: 24,
    color: colors.onSurface,
    fontFamily: fonts.sansBold,
    fontSize: 34,
    textAlign: 'center',
  },
  helperText: {
    marginTop: 24,
    color: 'rgba(255,255,255,0.72)',
    fontFamily: fonts.sansMedium,
    fontSize: 20,
    textAlign: 'center',
  },
  roundDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  roundDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
  },
  roundDotComplete: {
    backgroundColor: colors.onSurface,
  },
  roundDotPending: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  roundOverflow: {
    color: 'rgba(255,255,255,0.66)',
    fontFamily: fonts.sansMedium,
    fontSize: 14,
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
