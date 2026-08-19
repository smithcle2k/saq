import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useFonts as useOutfitFonts } from '@expo-google-fonts/outfit';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from '@expo-google-fonts/outfit';
import {
  RobotoMono_400Regular,
  RobotoMono_500Medium,
  RobotoMono_700Bold,
  useFonts as useRobotoMonoFonts,
} from '@expo-google-fonts/roboto-mono';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { TimerConfig, View as AppView, WorkoutHistoryItem } from './types';
import { TimerSetup } from './components/TimerSetup';
import { ActiveTimer } from './components/ActiveTimer';
import { Settings } from './components/Settings';
import { Statistics } from './components/Statistics';
import { Tutorial } from './components/Tutorial';
import { gradients, colors } from './theme';
import { calculateTotalTime } from './utils/timeUtils';
import { initializeSpeech } from './utils/tts';
import { useAudioCues } from './utils/audioCues';
import { useStore } from './store';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backgroundColor: '#0A0A0A',
          }}
        >
          <Text
            style={{ color: '#f43f5e', fontSize: 16, textAlign: 'center', fontFamily: 'monospace' }}
          >
            {(this.state.error as Error).message}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [view, setView] = useState<AppView>('SETUP');
  const [isHydrated, setIsHydrated] = useState(useStore.persist.hasHydrated());
  const hasPrimedInteractionRef = useRef(false);

  const config = useStore((state) => state.timerConfig);
  const exercises = useStore((state) => state.exercises);

  const history = useStore((state) => state.history);
  const tutorialSeen = useStore((state) => state.tutorialSeen);
  const setTimerConfig = useStore((state) => state.setTimerConfig);
  const setExercises = useStore((state) => state.setExercises);
  const addHistoryItem = useStore((state) => state.addHistoryItem);
  const setTutorialSeen = useStore((state) => state.setTutorialSeen);

  const outfitFontsLoaded = useOutfitFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  })[0];
  const monoFontsLoaded = useRobotoMonoFonts({
    RobotoMono_400Regular,
    RobotoMono_500Medium,
    RobotoMono_700Bold,
  })[0];

  const { initializeAudioCues, playAudioCue, stopAudioCues } = useAudioCues();

  const showTutorial = !tutorialSeen;
  const fontsLoaded = outfitFontsLoaded && monoFontsLoaded;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.surface);
  }, []);

  useEffect(() => {
    const unsubscribe = useStore.persist.onFinishHydration(() => setIsHydrated(true));
    return unsubscribe;
  }, []);

  const primeMedia = async (force = true) => {
    initializeSpeech({ force });
    await initializeAudioCues({ force });
  };

  const handleFirstInteraction = () => {
    if (hasPrimedInteractionRef.current) return;
    hasPrimedInteractionRef.current = true;
    void primeMedia(true);
  };

  const setConfig: React.Dispatch<React.SetStateAction<TimerConfig>> = (updater) => {
    setTimerConfig((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  };

  const saveHistory = (newItem: WorkoutHistoryItem) => {
    addHistoryItem(newItem);
  };

  const handleDismissTutorial = () => {
    handleFirstInteraction();
    setTutorialSeen(true);
  };

  const handleStart = async () => {
    await primeMedia(true);
    setView('TIMER');
  };

  const handleFinish = () => {
    const duration = calculateTotalTime(config);
    saveHistory({
      date: new Date().toISOString(),
      duration,
      mode: 'INTERVAL',
      rounds: config.rounds,
    });
    setView('SETUP');
  };

  const handleExit = () => {
    stopAudioCues();
    setView('SETUP');
  };

  const handleCloseSubView = () => {
    setView('SETUP');
  };

  if (!fontsLoaded || !isHydrated) {
    return (
      <GestureHandlerRootView style={styles.flex}>
        <LinearGradient colors={gradients.app} style={styles.loading}>
          <StatusBar style="light" />
          <ActivityIndicator color={colors.primary} size="large" />
        </LinearGradient>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.flex} onTouchStart={handleFirstInteraction}>
          {view === 'TIMER' ? (
            <ActiveTimer
              config={config}
              exercises={exercises}
              onFinish={handleFinish}
              onExit={handleExit}
              playAudioCue={playAudioCue}
              stopAudioCues={stopAudioCues}
            />
          ) : (
            <LinearGradient colors={gradients.app} style={styles.flex}>
              <SafeAreaView style={styles.flex}>
                {view === 'SETUP' ? (
                  <TimerSetup
                    config={config}
                    setConfig={setConfig}
                    onStart={handleStart}
                    onOpenSettings={() => {
                      handleFirstInteraction();
                      setView('SETTINGS');
                    }}
                    onOpenStats={() => {
                      handleFirstInteraction();
                      setView('STATS');
                    }}
                  />
                ) : null}

                {view === 'SETTINGS' ? (
                  <Settings
                    exercises={exercises}
                    setExercises={setExercises}
                    onClose={handleCloseSubView}
                  />
                ) : null}

                {view === 'STATS' ? (
                  <Statistics history={history} onClose={handleCloseSubView} />
                ) : null}
              </SafeAreaView>
            </LinearGradient>
          )}

          {showTutorial ? <Tutorial onDismiss={handleDismissTutorial} /> : null}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
