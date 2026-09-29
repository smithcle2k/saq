import React, { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import type { SessionPreset } from '../types';
import { colors, fonts } from '../theme';
import { useStore } from '../store';
import {
  BUILT_IN_PRESETS,
  describeSessionConfig,
  getCurrentSessionConfig,
  MAX_PRESET_NAME_LENGTH,
  sessionConfigsEqual,
} from '../utils/sessionPresets';

const PresetChip: React.FC<{ preset: SessionPreset; selected: boolean; onPress: () => void }> = ({
  preset,
  selected,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.chip,
      selected && styles.chipSelected,
      pressed && styles.pressed,
    ]}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={`Apply preset ${preset.name}`}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{preset.name}</Text>
  </Pressable>
);

const SavedPresetRow: React.FC<{ preset: SessionPreset }> = ({ preset }) => {
  const renameSavedPreset = useStore((state) => state.renameSavedPreset);
  const deleteSavedPreset = useStore((state) => state.deleteSavedPreset);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState('');

  const commit = () => {
    if (draft === null) return;
    const result = renameSavedPreset(preset.id, draft);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setDraft(null);
    setError('');
  };

  return (
    <View style={styles.savedRow}>
      <View style={styles.savedMain}>
        {draft === null ? (
          <Text style={styles.savedName}>{preset.name}</Text>
        ) : (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={commit}
            maxLength={MAX_PRESET_NAME_LENGTH}
            autoFocus
            style={styles.input}
            accessibilityLabel={`New name for ${preset.name}`}
          />
        )}
        <Text style={styles.hint}>{describeSessionConfig(preset.config)}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <Pressable
        onPress={() => (draft === null ? setDraft(preset.name) : commit())}
        style={styles.iconButton}
        accessibilityLabel={draft === null ? `Rename ${preset.name}` : 'Save name'}
      >
        <Ionicons
          name={draft === null ? 'create-outline' : 'checkmark'}
          size={20}
          color={colors.onSurface}
        />
      </Pressable>
      <Pressable
        onPress={() => deleteSavedPreset(preset.id)}
        style={styles.iconButton}
        accessibilityLabel={`Delete ${preset.name}`}
      >
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </Pressable>
    </View>
  );
};

/** Full saved setups: timers, cues, drill, delays, weights, output mode and stopping instruction. */
export const PresetPicker: React.FC = () => {
  const settings = useStore(
    useShallow((state) => ({
      timerConfig: state.timerConfig,
      exercises: state.exercises,
      cueSettings: state.cueSettings,
      drillSettings: state.drillSettings,
      cueOutputMode: state.cueOutputMode,
    }))
  );
  const savedPresets = useStore((state) => state.savedPresets);
  const applySessionConfig = useStore((state) => state.applySessionConfig);
  const saveCurrentAsPreset = useStore((state) => state.saveCurrentAsPreset);
  const [name, setName] = useState('');
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [managing, setManaging] = useState(false);

  const current = useMemo(() => getCurrentSessionConfig(settings), [settings]);
  const allPresets = [...BUILT_IN_PRESETS, ...savedPresets];
  const active = allPresets.find((preset) => sessionConfigsEqual(preset.config, current));

  const apply = (preset: SessionPreset) => {
    const result = applySessionConfig(preset.config);
    setMessage(
      result.ok
        ? { text: `Applied ${preset.name}.`, isError: false }
        : { text: `${preset.name} was not applied: ${result.message}`, isError: true }
    );
  };

  const save = () => {
    const result = saveCurrentAsPreset(name);
    if (result.ok) {
      setMessage({ text: `Saved ${name.trim()}.`, isError: false });
      setName('');
    } else {
      setMessage({ text: result.message, isError: true });
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Presets</Text>
      <View style={styles.chipRow}>
        {allPresets.map((preset) => (
          <PresetChip
            key={preset.id}
            preset={preset}
            selected={active?.id === preset.id}
            onPress={() => apply(preset)}
          />
        ))}
      </View>
      <Text style={styles.hint}>
        {active ? `${active.name}: ` : 'Custom setup: '}
        {describeSessionConfig(current)}
      </Text>
      {message ? (
        <Text style={message.isError ? styles.error : styles.hint}>{message.text}</Text>
      ) : null}

      <View style={styles.saveRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={save}
          placeholder="Name this setup"
          placeholderTextColor={colors.onSurfaceVariant}
          maxLength={MAX_PRESET_NAME_LENGTH}
          style={[styles.input, styles.flex]}
          accessibilityLabel="New preset name"
        />
        <Pressable
          onPress={save}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
          accessibilityLabel="Save current setup as a preset"
        >
          <Text style={styles.saveButtonText}>SAVE</Text>
        </Pressable>
      </View>

      {savedPresets.length > 0 ? (
        <Pressable
          onPress={() => setManaging((value) => !value)}
          style={styles.manageToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: managing }}
        >
          <Text style={styles.manageText}>
            {managing ? 'Done' : `Manage saved presets (${savedPresets.length})`}
          </Text>
        </Pressable>
      ) : null}
      {managing
        ? savedPresets.map((preset) => <SavedPresetRow key={preset.id} preset={preset} />)
        : null}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    padding: 18,
  },
  heading: {
    color: colors.primary,
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.outlineStrong,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
  },
  chipSelected: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
  },
  chipTextSelected: {
    color: colors.primary,
  },
  hint: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
  saveRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outlineStrong,
    color: colors.onSurface,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    paddingHorizontal: 14,
  },
  saveButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 18,
  },
  saveButtonText: {
    color: colors.primary,
    fontFamily: fonts.sansBold,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  manageToggle: {
    minHeight: 44,
    justifyContent: 'center',
  },
  manageText: {
    color: colors.primary,
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 10,
  },
  savedMain: {
    flex: 1,
    gap: 4,
  },
  savedName: {
    color: colors.onSurface,
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pressed: {
    opacity: 0.82,
  },
});
