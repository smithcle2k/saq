import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
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

interface SettingsProps {
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const soundEffectsEnabled = useStore((state) => state.soundEffectsEnabled);
  const hapticsEnabled = useStore((state) => state.hapticsEnabled);
  const cueOutputMode = useStore((state) => state.cueOutputMode);
  const setSoundEffectsEnabled = useStore((state) => state.setSoundEffectsEnabled);
  const setHapticsEnabled = useStore((state) => state.setHapticsEnabled);
  const setCueOutputMode = useStore((state) => state.setCueOutputMode);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton} accessibilityLabel="Back to setup">
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.audioCard}>
          <Text style={styles.audioHeading}>Audio & Feedback</Text>
          <AudioSettingRow
            label="Sound effects"
            value={soundEffectsEnabled}
            onChange={setSoundEffectsEnabled}
          />
          <AudioSettingRow label="Vibration" value={hapticsEnabled} onChange={setHapticsEnabled} />
          <Text style={styles.audioHeading}>Cue Output</Text>
          <Text style={styles.settingHint}>
            Voice speaks the cues. Visual shows them on screen. Sound effects and vibration use
            their own switches.
          </Text>
          <View style={styles.optionRow}>
            {(
              [
                ['VOICE_ONLY', 'Voice'],
                ['VISUAL_ONLY', 'Visual'],
                ['BOTH', 'Both'],
              ] as const
            ).map(([mode, label]) => (
              <Pressable
                key={mode}
                onPress={() => setCueOutputMode(mode)}
                style={[styles.optionButton, cueOutputMode === mode && styles.optionButtonSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: cueOutputMode === mode }}
                accessibilityLabel={`Cue output ${label}`}
              >
                <Text
                  style={[styles.optionText, cueOutputMode === mode && styles.optionTextSelected]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
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
  headerSpacer: { width: 48 },
  audioCard: {
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
  itemLabel: {
    color: colors.onSurface,
    fontFamily: fonts.sansMedium,
    fontSize: 18,
  },
  settingHint: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.outlineStrong,
    paddingVertical: 10,
  },
  optionButtonSelected: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    color: colors.onSurface,
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
  },
  optionTextSelected: {
    color: colors.primary,
  },
});
