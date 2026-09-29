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
import { TimerConfig, View as AppView } from './types';
import type { SessionConfigSnapshot } from './types';
import { TimerSetup } from './components/TimerSetup';
import { ActiveTimer } from './components/ActiveTimer';
import { Settings } from './components/Settings';
import { Statistics } from './components/Statistics';
import { Tutorial } from './components/Tutorial';
import { gradients, colors } from './theme';
import { initializeSpeech } from './utils/tts';
import { useAudioCues } from './utils/audioCues';
import { useStore } from './store';
import { buildSessionPlan } from './utils/drillPlan';
import type { SessionPlan } from './utils/drillPlan';
import { buildCompletedHistoryItem, createSessionId } from './utils/sessionHistory';
import type { SessionDeliveryLog } from './utils/sessionHistory';
import { attachRoundLogs } from './utils/repLogging';
import type { RoundLogBook, SessionNotesInput } from './utils/repLogging';
import { getReactiveSessionConfig, getReactiveSetupError } from './utils/reactiveSession';

/** Frozen at Start so the running workout and its record describe what actually ran. */
interface ActiveSession {
  snapshot: SessionConfigSnapshot;
  plan: SessionPlan;
}

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
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(useStore.persist.hasHydrated());
  const hasPrimedInteractionRef = useRef(false);

  const config = useStore((state) => state.timerConfig);
  const cueOutputMode = useStore((state) => state.cueOutputMode);

  const history = useStore((state) => state.history);
  const tutorialSeen = useStore((state) => state.tutorialSeen);
  const setTimerConfig = useStore((state) => state.setTimerConfig);
  const saveCompletedSession = useStore((state) => state.saveCompletedSession);
  const updateSessionNotes = useStore((state) => state.updateSessionNotes);
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

  const { initializeAudioCues, playAudioCue, playSpokenCue, stopAudioCues } = useAudioCues();

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

  const handleDismissTutorial = () => {
    handleFirstInteraction();
    setTutorialSeen(true);
  };

  const beginSession = async (session: ActiveSession) => {
    await primeMedia(true);
    setActiveSession(session);
    setView('TIMER');
  };

  const handleStart = async () => {
    const snapshot = getReactiveSessionConfig({
      timerConfig: config,
      cueOutputMode,
    });
    if (getReactiveSetupError(snapshot)) return;
    const sessionInput = {
      drillSettings: snapshot.drillSettings,
      cueSettings: snapshot.cueSettings,
      enabledCues: snapshot.enabledCues,
      config: snapshot.timerConfig,
    };
    await beginSession({
      snapshot,
      plan: buildSessionPlan({ ...sessionInput, sessionId: createSessionId() }),
    });
  };

  // Saved once, on first reaching FINISHED; DONE or exit afterwards cannot duplicate or discard it.
  // Round logs are all closed by then: the final REST ends before FINISHED.
  const handleComplete = (log: SessionDeliveryLog, roundLogs: RoundLogBook) => {
    if (!activeSession) return;
    saveCompletedSession(
      attachRoundLogs(
        buildCompletedHistoryItem({
          plan: activeSession.plan,
          snapshot: activeSession.snapshot,
          log,
          completedAt: new Date(),
        }),
        roundLogs
      )
    );
  };

  const handleSaveNotes = (notes: SessionNotesInput) => {
    if (!activeSession) return;
    updateSessionNotes(activeSession.plan.sessionId, notes);
  };

  const handleFinish = () => {
    setActiveSession(null);
    setView('SETUP');
  };

  const handleExit = () => {
    stopAudioCues();
    setActiveSession(null);
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
          {view === 'TIMER' && activeSession ? (
            <ActiveTimer
              config={activeSession.snapshot.timerConfig}
              plan={activeSession.plan}
              drillSettings={activeSession.snapshot.drillSettings}
              cueOutputMode={activeSession.snapshot.cueOutputMode}
              onComplete={handleComplete}
              onSaveNotes={handleSaveNotes}
              onFinish={handleFinish}
              onExit={handleExit}
              playAudioCue={playAudioCue}
              playSpokenCue={playSpokenCue}
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

                {view === 'SETTINGS' ? <Settings onClose={handleCloseSubView} /> : null}

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
