import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { CueOutputMode, TimerConfig, TimerPhase } from '../types';
import { colors, fonts, gradients } from '../theme';
import { formatTime } from '../utils/timeUtils';
import {
  isNearCueEvent,
  shouldAnnounceRestFiveSeconds,
  shouldPlayCountdownBeep,
} from '../utils/timerAlerts';
import { speakCue, stopSpeech } from '../utils/tts';
import type { SpeakOptions } from '../utils/tts';
import {
  routeSpokenCue,
  shouldPlayCueVoice,
  shouldPlayWorkWhistle,
  shouldShowCueVisual,
} from '../utils/cueOutput';
import { AudioCueName } from '../utils/audioCues';
import { useActiveTimerEngine } from '../hooks/useActiveTimerEngine';
import type { VisibleCue } from '../hooks/useActiveTimerEngine';
import { useWakeLock } from '../hooks/useWakeLock';
import { useStore } from '../store';
import { getDrillInstructions, isPreviewSecond } from '../utils/drillPlan';
import type { SessionPlan } from '../utils/drillPlan';
import type { DrillSettings } from '../types';

interface ActiveTimerProps {
  config: TimerConfig;
  plan: SessionPlan;
  drillSettings: DrillSettings;
  /** Replays repeat a saved cue sequence; said once in PREP so it is never mistaken for new. */
  isReplay?: boolean;
  cueOutputMode: CueOutputMode;
  onFinish: () => void;
  onExit: () => void;
  playAudioCue: (name: AudioCueName) => void;
  playSpokenCue: (text: string) => boolean;
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

const CUE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  Left: 'arrow-back',
  Right: 'arrow-forward',
  Run: 'arrow-up',
  'Come Back': 'return-up-back',
};

/** Distance-readable cue: large directional glyph plus the word, popping in per event. */
const CueDisplay: React.FC<{ cue: VisibleCue | null; size: number }> = ({ cue, size }) => {
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

  // Nothing — not even an accessibility label — exists before the cue fires.
  if (!cue) return <View style={[styles.cuePlaceholder, { height: size }]} />;

  const isCorrection = cue.role === 'CORRECTION' || cue.role === 'CHANGE';

  return (
    <Animated.View
      style={[styles.cueDisplay, isCorrection && styles.cueCorrection, { transform: [{ scale }] }]}
      accessible
      accessibilityLiveRegion="assertive"
      accessibilityLabel={isCorrection ? `Change: ${cue.label}` : `Cue: ${cue.label}`}
    >
      {isCorrection ? <Text style={styles.cueCorrectionLabel}>CHANGE</Text> : null}
      <Ionicons
        name={CUE_ICONS[cue.label] ?? 'arrow-up'}
        size={size}
        color={isCorrection ? colors.surface : colors.onSurface}
      />
      <Text
        style={[styles.exerciseText, isCorrection && styles.cueCorrectionText]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {cue.label.toUpperCase()}
      </Text>
    </Animated.View>
  );
};

/** Upcoming planned cue, shown only once its preview has been delivered. */
const PreviewDisplay: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.previewWrap} accessible accessibilityLabel={`Next round: ${label}`}>
    <Text style={styles.previewHeading}>NEXT</Text>
    <Ionicons name={CUE_ICONS[label] ?? 'arrow-up'} size={72} color={colors.onSurface} />
    <Text style={styles.previewText}>{label.toUpperCase()}</Text>
  </View>
);

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
  plan,
  drillSettings,
  isReplay = false,
  cueOutputMode,
  onFinish,
  onExit,
  playAudioCue,
  playSpokenCue,
  stopAudioCues,
}) => {
  useWakeLock();

  const hapticsEnabled = useStore((state) => state.hapticsEnabled);
  const hasAnnouncedPrepRef = useRef(false);
  const hasAnnouncedRestFiveSecondsRef = useRef(false);
  const prevPhaseRef = useRef<TimerPhase | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const cueIconSize = Math.min(220, Math.max(140, windowWidth * 0.5));

  /** One output event: recorded clip if available, otherwise TTS; nothing in visual-only mode. */
  const announce = useCallback(
    (message: string, options?: SpeakOptions) => {
      routeSpokenCue(message, cueOutputMode, {
        playClip: playSpokenCue,
        speak: (text) =>
          speakCue(text, cueOutputMode, {
            interrupt: options?.interrupt ?? true,
            afterPreviousEndMs: options?.afterPreviousEndMs ?? 0,
            rate: options?.rate,
          }),
      });
    },
    [cueOutputMode, playSpokenCue]
  );

  const {
    phase,
    timeRemaining,
    currentRound,
    currentCue,
    previewCue,
    cuePlan,
    isPaused,
    togglePause,
  } = useActiveTimerEngine({
    config,
    plan,
    onAnnounce: announce,
    onCueDelivered: (cue) => {
      if (cue.role !== 'CORRECTION' && cue.role !== 'CHANGE') return;
      // Short accent marks a correction; follows the sound-effects and vibration toggles.
      playAudioCue('beep');
      if (hapticsEnabled) {
        try {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {
          // Haptics unavailable — ignore.
        }
      }
    },
    // Queued (not interrupting) so "5 Seconds" is never cut off.
    onPreview: (round) => {
      if (round.preview) announce(round.preview.label, { interrupt: false });
    },
  });

  useEffect(() => {
    if (hasAnnouncedPrepRef.current) return;
    hasAnnouncedPrepRef.current = true;
    speakCue('Get ready', cueOutputMode, { interrupt: true });
  }, [cueOutputMode]);

  // Pausing silences any queued or in-flight speech and clips.
  useEffect(() => {
    if (!isPaused) return;
    stopAudioCues();
    void stopSpeech();
  }, [isPaused, stopAudioCues]);

  // Synchronized countdown beeps; cue speech has priority over a colliding beep.
  useEffect(() => {
    if (!shouldPlayCountdownBeep(phase, timeRemaining, isPaused, config.workTime)) return;
    const speechCompetes = shouldPlayCueVoice(cueOutputMode);
    if (speechCompetes && isPreviewSecond(plan, config, phase, currentRound, timeRemaining)) return;
    if (
      speechCompetes &&
      phase === TimerPhase.WORK &&
      isNearCueEvent(
        (config.workTime - timeRemaining) * 1000,
        cuePlan.map((cue) => cue.offsetMs)
      )
    ) {
      return;
    }
    playAudioCue('beep');
    // Only fire on countdown second changes, not on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, phase, isPaused]);

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
      speakCue('5 Seconds', cueOutputMode, { interrupt: true });
    }
  }, [timeRemaining, phase, isPaused, cueOutputMode]);

  // Phase entrance sounds + haptics
  useEffect(() => {
    if (isPaused) return;

    if (prevPhaseRef.current && prevPhaseRef.current !== phase) {
      if (phase === TimerPhase.WORK) {
        // Spoken "Go" has priority over the whistle at WORK entry.
        if (shouldPlayWorkWhistle(cueOutputMode)) playAudioCue('whistle');
      } else if (phase === TimerPhase.REST || phase === TimerPhase.COOL_DOWN) {
        playAudioCue('buzzer');
      }

      if (hapticsEnabled) {
        triggerPhaseHaptic(phase);
      }
    }
    prevPhaseRef.current = phase;
  }, [phase, isPaused, playAudioCue, hapticsEnabled, cueOutputMode]);

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
    if (phase === TimerPhase.PREP) {
      const instructions = getDrillInstructions(drillSettings);
      return isReplay
        ? `Replay: same cue sequence as the saved session. ${instructions}`
        : instructions;
    }
    if (phase === TimerPhase.REST) return 'Breathe';
    if (phase === TimerPhase.COOL_DOWN) return 'Stretch it out';
    return '';
  }, [phase, drillSettings, isReplay]);
  const showStoppingInstruction =
    Boolean(drillSettings.stoppingInstruction) &&
    (phase === TimerPhase.PREP || phase === TimerPhase.REST);
  const showVisualCues = shouldShowCueVisual(cueOutputMode);

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

        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.main}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {phase === TimerPhase.FINISHED ? (
              <View style={styles.finishWrap}>
                <Text style={styles.finishTitle}>GREAT JOB!</Text>
                <Text style={styles.finishSubtitle}>Workout Complete</Text>
                <Pressable onPress={onFinish} style={styles.doneButton} accessibilityRole="button">
                  <Text style={styles.doneButtonText}>DONE</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {phase === TimerPhase.WORK ? null : (
                  <View style={styles.ringWrap}>
                    <ProgressRing
                      progress={phaseDuration > 0 ? timeRemaining / phaseDuration : 0}
                    />
                    <Text style={[styles.timerText, isCountdown && styles.timerCountdown]}>
                      {formatTime(timeRemaining)}
                    </Text>
                  </View>
                )}

                {phase === TimerPhase.WORK ? (
                  <CueDisplay cue={showVisualCues ? currentCue : null} size={cueIconSize} />
                ) : (
                  <>
                    {showVisualCues && previewCue ? <PreviewDisplay label={previewCue} /> : null}
                    {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
                    {showStoppingInstruction ? (
                      <Text style={styles.stoppingText}>{drillSettings.stoppingInstruction}</Text>
                    ) : null}
                  </>
                )}

                <RoundCount currentRound={currentRound} totalRounds={config.rounds} />
              </>
            )}
          </ScrollView>
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
  flex: {
    flex: 1,
  },
  main: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  finishWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 12,
  },
  finishTitle: {
    color: colors.onSurface,
    fontFamily: fonts.sansBlack,
    fontSize: 40,
    textAlign: 'center',
  },
  finishSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: fonts.sansSemiBold,
    fontSize: 24,
  },
  doneButton: {
    marginTop: 24,
    borderRadius: 999,
    backgroundColor: colors.onSurface,
    paddingHorizontal: 48,
    paddingVertical: 18,
  },
  doneButtonText: {
    color: colors.surface,
    fontFamily: fonts.sansBold,
    fontSize: 18,
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
  cuePlaceholder: {
    marginTop: 16,
  },
  cueDisplay: {
    alignItems: 'center',
    marginTop: 16,
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cueCorrection: {
    backgroundColor: colors.prep,
  },
  cueCorrectionLabel: {
    color: colors.surface,
    fontFamily: fonts.sansBlack,
    fontSize: 28,
    letterSpacing: 4,
  },
  cueCorrectionText: {
    color: colors.surface,
  },
  exerciseText: {
    color: colors.onSurface,
    fontFamily: fonts.sansBlack,
    fontSize: 64,
    letterSpacing: 1,
    textAlign: 'center',
  },
  previewWrap: {
    alignItems: 'center',
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  previewHeading: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fonts.sansBold,
    fontSize: 14,
    letterSpacing: 2,
  },
  previewText: {
    color: colors.onSurface,
    fontFamily: fonts.sansBlack,
    fontSize: 32,
  },
  stoppingText: {
    marginTop: 8,
    color: colors.onSurface,
    fontFamily: fonts.sansBold,
    fontSize: 18,
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
