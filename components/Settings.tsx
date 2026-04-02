import React, { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { colors, fonts } from '../theme';
import { DEFAULT_CUES, SAQ_DEFAULT_CUES } from '../utils/defaultCues';
import { validateCueLabel } from '../utils/cueModeration';
import { TimerMode } from '../types';

interface SettingsProps {
  exercises: string[];
  setExercises: React.Dispatch<React.SetStateAction<string[]>>;
  mode: TimerMode;
  onClose: () => void;
}

const IntervalCuesReadOnly: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Pressable onPress={onClose} style={styles.backButton}>
        <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
      </Pressable>
      <Text style={styles.headerTitle}>CUES</Text>
      <View style={styles.headerSpacer} />
    </View>

    <Text style={styles.intervalExplainer}>
      Each work round calls out one cue at random: Left, Right, Run, or Come Back.
    </Text>

    <ScrollView
      style={styles.listWrap}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    >
      {DEFAULT_CUES.map((cue) => (
        <View key={cue} style={styles.itemCardReadOnly}>
          <Text style={styles.itemLabelReadOnly}>{cue}</Text>
        </View>
      ))}
    </ScrollView>
  </View>
);

export const Settings: React.FC<SettingsProps> = ({ exercises, setExercises, mode, onClose }) => {
  const [newExercise, setNewExercise] = useState('');
  const [inputError, setInputError] = useState('');
  const data = useMemo(
    () => exercises.map((exercise, index) => ({ key: `${exercise}-${index}`, exercise })),
    [exercises]
  );

  if (mode === 'INTERVAL') {
    return <IntervalCuesReadOnly onClose={onClose} />;
  }

  const handleAdd = () => {
    const candidate = newExercise.trim();
    const validation = validateCueLabel(candidate);

    if (!validation.isAllowed) {
      setInputError(validation.error);
      return;
    }

    setExercises([...exercises, candidate]);
    setNewExercise('');
    setInputError('');
  };

  const handleRemove = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleSubmitEditing = () => {
    if (newExercise.trim()) {
      handleAdd();
    }
  };

  const handleReset = () => {
    setExercises(SAQ_DEFAULT_CUES);
  };

  const renderItem = ({
    item,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<(typeof data)[number]>) => (
    <View style={[styles.itemCard, isActive && styles.itemCardActive]}>
      <Pressable onLongPress={drag} style={styles.dragHandle}>
        <Ionicons name="reorder-three" size={24} color={colors.onSurfaceVariant} />
      </Pressable>
      <Text style={styles.itemLabel}>{item.exercise}</Text>
      <Pressable
        onPress={() => handleRemove(getIndex() ?? 0)}
        style={styles.deleteButton}
        accessibilityLabel={`Delete ${item.exercise}`}
      >
        <Ionicons name="trash-outline" size={20} color={colors.onSurfaceVariant} />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>CUES</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.addCard}>
        <Text style={styles.addLabel}>Add new cue</Text>
        <View style={styles.addRow}>
          <TextInput
            value={newExercise}
            onChangeText={(value) => {
              setNewExercise(value);
              if (inputError) setInputError('');
            }}
            onSubmitEditing={handleSubmitEditing}
            placeholder="e.g. Shuffle left"
            placeholderTextColor="rgba(148,163,184,0.4)"
            style={styles.input}
            returnKeyType="done"
            accessibilityLabel="Cue label"
          />
          <Pressable
            onPress={handleAdd}
            disabled={!newExercise.trim()}
            style={({ pressed }) => [
              styles.addButton,
              !newExercise.trim() && styles.addButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </Pressable>
        </View>
        {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}
      </View>

      <View style={styles.listWrap}>
        {exercises.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No cues yet</Text>
          </View>
        ) : (
          <DraggableFlatList
            data={data}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            onDragEnd={({ data: nextData }) => setExercises(nextData.map((item) => item.exercise))}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            containerStyle={{ flex: 1 }}
            style={{ flex: 1 }}
          />
        )}
      </View>

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
  intervalExplainer: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  addCard: {
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    padding: 18,
    gap: 12,
  },
  addLabel: {
    color: colors.primary,
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  addRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    color: colors.onSurface,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addButton: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.4)',
    backgroundColor: 'rgba(0,240,255,0.18)',
  },
  addButtonDisabled: {
    opacity: 0.3,
    borderColor: 'transparent',
  },
  errorText: {
    color: colors.danger,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  listWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  listContent: {
    gap: 12,
    paddingBottom: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  itemCardReadOnly: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  itemCardActive: {
    borderColor: 'rgba(0,240,255,0.35)',
    backgroundColor: 'rgba(0,240,255,0.12)',
  },
  dragHandle: {
    paddingHorizontal: 4,
  },
  itemLabel: {
    flex: 1,
    color: colors.onSurface,
    fontFamily: fonts.sansMedium,
    fontSize: 18,
  },
  itemLabelReadOnly: {
    color: colors.onSurface,
    fontFamily: fonts.sansMedium,
    fontSize: 18,
  },
  deleteButton: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceCard,
    paddingVertical: 48,
  },
  emptyText: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
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
