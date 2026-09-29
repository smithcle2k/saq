import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TrainingSurface } from '../types';
import { colors, fonts } from '../theme';
import {
  MAX_NOTES_TEXT_LENGTH,
  MAX_PAIN_LOCATION_LENGTH,
  normalizeSessionNotes,
  TRAINING_SURFACE_LABELS,
  TRAINING_SURFACES,
} from '../utils/repLogging';
import type { SessionNotesInput } from '../utils/repLogging';

interface SessionNotesProps {
  /** Updates the already-saved session; called at most once. */
  onSave: (notes: SessionNotesInput) => void;
  /** Leaves the saved session without notes. */
  onSkip: () => void;
}

const Chip: React.FC<{ label: string; selected: boolean; onPress: () => void }> = ({
  label,
  selected,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.chip, selected && styles.chipSelected]}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
  </Pressable>
);

/** Optional finish-screen notes. Every field can be left blank. */
export const SessionNotes: React.FC<SessionNotesProps> = ({ onSave, onSkip }) => {
  const [surface, setSurface] = useState<TrainingSurface | undefined>();
  const [energy, setEnergy] = useState<number | undefined>();
  const [pain, setPain] = useState<boolean | undefined>();
  const [painLocation, setPainLocation] = useState('');
  const [text, setText] = useState('');
  const hasSubmittedRef = useRef(false);

  const input: SessionNotesInput = { surface, energy, pain, painLocation, text };
  const hasNotes = normalizeSessionNotes(input) !== undefined;

  // Double taps cannot save twice or save and then skip.
  const submit = (save: boolean) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    if (save && hasNotes) onSave(input);
    else onSkip();
  };

  const toggle = <T,>(current: T | undefined, value: T) => (current === value ? undefined : value);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>SESSION NOTES (OPTIONAL)</Text>

      <Text style={styles.label}>Surface</Text>
      <View style={styles.chipRow}>
        {TRAINING_SURFACES.map((option) => (
          <Chip
            key={option}
            label={TRAINING_SURFACE_LABELS[option]}
            selected={surface === option}
            onPress={() => setSurface((prev) => toggle(prev, option))}
          />
        ))}
      </View>

      <Text style={styles.label}>Energy (1 low – 5 high)</Text>
      <View style={styles.chipRow}>
        {[1, 2, 3, 4, 5].map((level) => (
          <Chip
            key={level}
            label={String(level)}
            selected={energy === level}
            onPress={() => setEnergy((prev) => toggle(prev, level))}
          />
        ))}
      </View>

      <Text style={styles.label}>Any pain?</Text>
      <View style={styles.chipRow}>
        <Chip
          label="No"
          selected={pain === false}
          onPress={() => setPain((p) => toggle(p, false))}
        />
        <Chip
          label="Yes"
          selected={pain === true}
          onPress={() => setPain((p) => toggle(p, true))}
        />
      </View>
      {pain ? (
        <TextInput
          value={painLocation}
          onChangeText={setPainLocation}
          placeholder="Where? (optional)"
          placeholderTextColor="rgba(255,255,255,0.5)"
          maxLength={MAX_PAIN_LOCATION_LENGTH}
          style={styles.input}
          accessibilityLabel="Pain location"
        />
      ) : null}

      <Text style={styles.label}>Notes</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Anything worth remembering (optional)"
        placeholderTextColor="rgba(255,255,255,0.5)"
        maxLength={MAX_NOTES_TEXT_LENGTH}
        multiline
        style={[styles.input, styles.multiline]}
        accessibilityLabel="Session notes"
      />
      <Text style={styles.counter}>
        {text.length}/{MAX_NOTES_TEXT_LENGTH}
      </Text>

      <View style={styles.actions}>
        <Pressable
          onPress={() => submit(false)}
          style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Skip notes and finish"
        >
          <Text style={styles.skipText}>SKIP</Text>
        </Pressable>
        <Pressable
          onPress={() => submit(true)}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={hasNotes ? 'Save notes and finish' : 'Finish'}
        >
          <Text style={styles.saveText}>{hasNotes ? 'SAVE & DONE' : 'DONE'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    gap: 8,
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 16,
  },
  heading: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  label: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 14,
  },
  chipSelected: {
    backgroundColor: colors.onSurface,
    borderColor: colors.onSurface,
  },
  chipText: {
    color: colors.onSurface,
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
  },
  chipTextSelected: {
    color: colors.surface,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    color: colors.onSurface,
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: fonts.monoMedium,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  skipButton: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  skipText: {
    color: colors.onSurface,
    fontFamily: fonts.sansBold,
    fontSize: 16,
    letterSpacing: 0.8,
  },
  saveButton: {
    flex: 2,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.onSurface,
  },
  saveText: {
    color: colors.surface,
    fontFamily: fonts.sansBold,
    fontSize: 16,
    letterSpacing: 0.8,
  },
  pressed: {
    opacity: 0.7,
  },
});
