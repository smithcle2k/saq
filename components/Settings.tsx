import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { DEFAULT_CUES, INTERVAL_SINGLE_CUES } from '../utils/defaultCues';
import { useStore } from '../store';

const AudioSettingRow: React.FC<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, value, onChange }) => (
  <View style={styles.audioRow}>
    <Text style={styles.itemLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: 'rgba(148,163,184,0.35)', true: 'rgba(48,209,88,0.45)' }}
      thumbColor={value ? colors.primary : '#f1f5f9'}
      ios_backgroundColor="rgba(148,163,184,0.35)"
      accessibilityLabel={`${value ? 'Disable' : 'Enable'} ${label.toLowerCase()}`}
    />
  </View>
);

const AudioSettings: React.FC = () => {
  const soundEffectsEnabled = useStore((state) => state.soundEffectsEnabled);
  const voiceEnabled = useStore((state) => state.voiceEnabled);
  const hapticsEnabled = useStore((state) => state.hapticsEnabled);
  const setSoundEffectsEnabled = useStore((state) => state.setSoundEffectsEnabled);
  const setVoiceEnabled = useStore((state) => state.setVoiceEnabled);
  const setHapticsEnabled = useStore((state) => state.setHapticsEnabled);

  return (
    <View style={styles.audioCard}>
      <Text style={styles.audioHeading}>Audio & Feedback</Text>
      <AudioSettingRow label="Voice cues" value={voiceEnabled} onChange={setVoiceEnabled} />
      <AudioSettingRow
        label="Sound effects"
        value={soundEffectsEnabled}
        onChange={setSoundEffectsEnabled}
      />
      <AudioSettingRow label="Vibration" value={hapticsEnabled} onChange={setHapticsEnabled} />
    </View>
  );
};

interface SettingsProps {
  exercises: string[];
  setExercises: React.Dispatch<React.SetStateAction<string[]>>;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ exercises, setExercises, onClose }) => {
  const toggleCue = (cue: string, enabled: boolean) => {
    if (enabled) {
      const next = new Set([...exercises, cue]);
      setExercises(INTERVAL_SINGLE_CUES.filter((c) => next.has(c)));
    } else if (exercises.length > 1) {
      setExercises(exercises.filter((c) => c !== cue));
    }
  };

  const handleReset = () => {
    setExercises([...DEFAULT_CUES]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>CUES</Text>
        <View style={styles.headerSpacer} />
      </View>

      <AudioSettings />

      <Text style={styles.intervalExplainer}>
        Turn cues on or off. Each work round picks one cue at random from those that are enabled. At
        least one cue must stay on.
      </Text>

      <ScrollView
        style={styles.listWrap}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {INTERVAL_SINGLE_CUES.map((cue) => {
          const enabled = exercises.includes(cue);
          return (
            <View key={cue} style={styles.intervalCueRow}>
              <Text style={styles.itemLabel}>{cue}</Text>
              <Switch
                value={enabled}
                onValueChange={(v) => toggleCue(cue, v)}
                trackColor={{ false: 'rgba(148,163,184,0.35)', true: 'rgba(48,209,88,0.45)' }}
                thumbColor={enabled ? colors.primary : '#f1f5f9'}
                ios_backgroundColor="rgba(148,163,184,0.35)"
                accessibilityLabel={`${enabled ? 'Disable' : 'Enable'} ${cue} cue`}
              />
            </View>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={handleReset}
        style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
      >
        <Ionicons name="refresh-outline" size={18} color={colors.onSurfaceVariant} />
        <Text style={styles.resetText}>RESTORE DEFAULTS</Text>
      </Pressable>
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
  audioCard: {
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    padding: 18,
    gap: 14,
  },
  audioHeading: {
    color: colors.primary,
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  intervalExplainer: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  listWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  listContent: {
    gap: 12,
    paddingBottom: 8,
  },
  intervalCueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemLabel: {
    flex: 1,
    color: colors.onSurface,
    fontFamily: fonts.sansMedium,
    fontSize: 18,
  },
  resetButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.outlineStrong,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 16,
  },
  resetText: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  pressed: {
    opacity: 0.82,
  },
});
