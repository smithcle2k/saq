import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

interface TutorialProps {
  onDismiss: () => void;
}

interface Section {
  heading: string;
  body: string;
}

const sections: Section[] = [
  {
    heading: 'What is Interval Trainer?',
    body: 'A distraction-free timer built for explosive interval training, boxing, sprints, and more. It counts down each phase and announces cues aloud so you never have to look at the screen.',
  },
  {
    heading: 'Interval Mode vs SAQ Mode',
    body: 'Interval Mode is the classic round-based timer. Each work round you hear one cue at random—Left, Right, Run, or Come Back. SAQ (Speed, Agility, Quickness) Mode is built for reactive change-of-direction work. Each 5-second work round fires five randomized cues: one at the start, then one each at 00:01, 00:02, 00:03, and 00:04.',
  },
  {
    heading: 'Setting up your workout',
    body: 'Use the − and + buttons to set your Prep, Work, Rest, and Cool Down times, as well as the number of rounds. In Interval mode, work time defaults to 5 seconds and is adjustable like the other phases. In SAQ mode, the work time is fixed at 5 seconds, but you can freely customize your rest time (minimum 15s) and the number of rounds to whatever you want.',
  },
  {
    heading: 'Customizing Cues',
    body: 'In SAQ mode, open Settings (the gear icon) to manage your cue list: add custom directions or movements, delete ones you no longer want, and reorder them anytime. Interval mode uses a fixed built-in set of single-word cues (see Settings).',
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
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(12,12,20,0.96)',
  },
  glow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(0,240,255,0.08)',
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
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.4)',
    backgroundColor: 'rgba(0,240,255,0.18)',
  },
  primaryButtonLabel: {
    color: colors.primary,
    fontFamily: fonts.sansBold,
    fontSize: 18,
    letterSpacing: 1,
  },
});
