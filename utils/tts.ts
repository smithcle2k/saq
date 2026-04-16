import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

let voicesReadyPromise: Promise<void> | null = null;
let preferredVoice: string | undefined;
let hasPrimedSpeech = false;
let activeSpeechToken = 0;
let isSpeechActive = false;
let queuedSpeech: Array<{ text: string; afterPreviousEndMs: number; rate: number }> = [];
let delayedSpeechStartTimeoutId: ReturnType<typeof setTimeout> | null = null;

export const isAndroidChromeWeb = () => {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent;
  return /Android/i.test(userAgent) && /Chrome/i.test(userAgent);
};

export interface SpeakOptions {
  interrupt?: boolean;
  afterPreviousEndMs?: number;
  /** Speech rate; expo-speech default is 1.0 */
  rate?: number;
}

interface InitializeSpeechOptions {
  force?: boolean;
}

const selectPreferredVoice = async () => {
  const voices = await Speech.getAvailableVoicesAsync();
  const prioritized = voices.find(
    (voice) =>
      voice.language.toLowerCase().startsWith('en') &&
      (voice.name.includes('Google') ||
        voice.name.includes('Daniel') ||
        voice.name.includes('Samantha'))
  );

  if (prioritized) return prioritized.identifier;
  return voices.find((voice) => voice.language.toLowerCase().startsWith('en'))?.identifier;
};

const loadVoices = () => {
  if (voicesReadyPromise) return voicesReadyPromise;

  voicesReadyPromise = new Promise<void>((resolve) => {
    selectPreferredVoice()
      .then((voice) => {
        preferredVoice = voice;
      })
      .finally(resolve);
  });

  return voicesReadyPromise;
};

const clearDelayedSpeechStart = () => {
  if (delayedSpeechStartTimeoutId !== null) {
    clearTimeout(delayedSpeechStartTimeoutId);
    delayedSpeechStartTimeoutId = null;
  }
};

const createSpeechOptions = (handleDone?: () => void, rate = 1) => ({
  rate,
  pitch: 1,
  volume: 1,
  language: 'en-US',
  voice: preferredVoice,
  onDone: handleDone,
  onError: handleDone,
  onStopped: handleDone,
});

const processSpeechQueue = (afterPreviousUtteranceEnded = false) => {
  if (isSpeechActive || delayedSpeechStartTimeoutId !== null || queuedSpeech.length === 0) return;
  const nextSpeech = queuedSpeech.shift();
  if (!nextSpeech) return;

  const speakQueuedUtterance = () => {
    delayedSpeechStartTimeoutId = null;
    const speechToken = ++activeSpeechToken;
    isSpeechActive = true;

    const handleDone = () => {
      if (speechToken !== activeSpeechToken) return;
      isSpeechActive = false;
      processSpeechQueue(true);
    };

    Speech.speak(nextSpeech.text, createSpeechOptions(handleDone, nextSpeech.rate));
  };

  if (afterPreviousUtteranceEnded && nextSpeech.afterPreviousEndMs > 0) {
    delayedSpeechStartTimeoutId = setTimeout(speakQueuedUtterance, nextSpeech.afterPreviousEndMs);
    return;
  }

  speakQueuedUtterance();
};

const speakNow = async (
  text: string,
  interrupt: boolean,
  afterPreviousEndMs: number,
  rate: number
) => {
  if (interrupt) {
    const hasQueuedSpeech = queuedSpeech.length > 0 || delayedSpeechStartTimeoutId !== null;
    const hasActiveSpeech = isSpeechActive;

    clearDelayedSpeechStart();
    queuedSpeech = [];
    activeSpeechToken += 1;
    isSpeechActive = false;

    if (hasQueuedSpeech || hasActiveSpeech) {
      await Speech.stop();
    }
  }

  // Android Chrome already queues browser speech internally; waiting for
  // expo-speech's completion callback there adds an extra pause between cues.
  if (isAndroidChromeWeb()) {
    Speech.speak(text, createSpeechOptions(undefined, rate));
    return;
  }

  queuedSpeech.push({ text, afterPreviousEndMs, rate });
  processSpeechQueue();
};

export const initializeSpeech = (options: InitializeSpeechOptions = {}) => {
  void loadVoices();

  if (hasPrimedSpeech && !options.force) return;
  hasPrimedSpeech = true;

  void Speech.stop();
  Speech.speak(' ', {
    volume: 0,
    rate: 1,
    pitch: 1,
    language: 'en-US',
  });
};

export const speak = (text: string, options: SpeakOptions = {}) => {
  if (!text?.trim()) return;

  const message = text.trim();
  const interrupt = options.interrupt ?? true;
  const afterPreviousEndMs = options.afterPreviousEndMs ?? 0;
  const rate = options.rate ?? 1;

  void loadVoices();
  void speakNow(message, interrupt, afterPreviousEndMs, rate);
};

export const stopSpeech = () => {
  clearDelayedSpeechStart();
  queuedSpeech = [];
  activeSpeechToken += 1;
  isSpeechActive = false;
  return Speech.stop();
};
