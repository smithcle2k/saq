import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, elevation, fonts } from '../theme';

interface TutorialProps {
  onDismiss: () => void;
}

interface Section {
  heading: string;
  body: string;
}

const sections: Section[] = [
  {
    heading: 'What is Reactive Agility?',
    body: 'A cue-driven workout for reacting to an unknown direction. It counts down each phase and announces cues aloud so you can move without watching the screen.',
  },
  {
    heading: 'How rounds work',
    body: 'After Go, each work round gives one random cue. Some rounds give a different second cue that changes your target. The second cue may not arrive, and its timing varies. The work countdown stays hidden so the round does not reveal how many cues are coming.',
  },
  {
    heading: 'Setting up your workout',
    body: 'Set the number of rounds and rest time. The workout starts with 10 seconds of prep. One-cue rounds last 5 seconds; two-cue rounds last 8 seconds. Rest time has a 15 second minimum.',
  },
  {
    heading: 'Cue output',
    body: 'The app uses Left, Right, Run, and Come Back at random. Open Settings to choose voice, visual, or both, and to control sound effects and vibration.',
  },
  {
    heading: 'During a workout',
    body: 'Tap Start when you are ready. The phases run automatically: Prep → Work → Rest, repeated for each round. Tap the pause button at any time to rest, or tap the X to exit early.',
  },
];

export const Tutorial: React.FC<TutorialProps> = ({ onDismiss }) => (
  <Modal transparent animationType="fade" visible onRequestClose={onDismiss}>
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onDismiss} />
      <View style={styles.card}>
        <View style={styles.glow} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>HOW IT WORKS</Text>
          <Pressable onPress={onDismiss} style={styles.closeButton} accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {sections.map(({ heading, body }) => (
            <View key={heading} style={styles.section}>
              <Text style={styles.sectionHeading}>{heading}</Text>
              <Text style={styles.sectionBody}>{body}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={onDismiss} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>GET STARTED</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  card: {
    maxHeight: '82%',
    overflow: 'hidden',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceBright,
  },
  glow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(48,209,88,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    color: colors.onSurface,
    fontFamily: fonts.sansBold,
    fontSize: 20,
    letterSpacing: 0.8,
  },
  closeButton: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    gap: 24,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  section: {
    gap: 8,
  },
  sectionHeading: {
    color: colors.primary,
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionBody: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    padding: 24,
  },
  primaryButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.primary,
    ...elevation.medium,
  },
  primaryButtonLabel: {
    color: colors.surface,
    fontFamily: fonts.sansBold,
    fontSize: 18,
    letterSpacing: 1,
  },
});
