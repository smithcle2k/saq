const isSpeechSupported = () =>
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  'SpeechSynthesisUtterance' in window;

let voicesReadyPromise: Promise<void> | null = null;
let preferredVoice: SpeechSynthesisVoice | undefined;
let hasPrimedSpeech = false;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let queuedSpeech: Array<{ text: string; afterPreviousEndMs: number }> = [];
let delayedSpeechStartTimeoutId: number | null = null;

export interface SpeakOptions {
  interrupt?: boolean;
  afterPreviousEndMs?: number;
}

const selectPreferredVoice = () => {
  const voices = window.speechSynthesis.getVoices();
  const prioritized = voices.find(
    (voice) =>
      voice.lang.toLowerCase().startsWith('en') &&
      (voice.name.includes('Google') ||
        voice.name.includes('Daniel') ||
        voice.name.includes('Samantha'))
  );

  if (prioritized) return prioritized;
  return voices.find((voice) => voice.lang.toLowerCase().startsWith('en'));
};

const loadVoices = () => {
  if (!isSpeechSupported()) return Promise.resolve();
  if (voicesReadyPromise) return voicesReadyPromise;

  voicesReadyPromise = new Promise<void>((resolve) => {
    const synth = window.speechSynthesis;
    const finish = () => {
      preferredVoice = selectPreferredVoice();
      resolve();
    };

    const availableVoices = synth.getVoices();
    if (availableVoices.length > 0) {
      finish();
      return;
    }

    const onVoicesChanged = () => {
      synth.removeEventListener('voiceschanged', onVoicesChanged);
      finish();
    };

    synth.addEventListener('voiceschanged', onVoicesChanged);
    window.setTimeout(() => {
      synth.removeEventListener('voiceschanged', onVoicesChanged);
      finish();
    }, 1000);
  });

  return voicesReadyPromise;
};

const clearDelayedSpeechStart = () => {
  if (delayedSpeechStartTimeoutId !== null) {
    window.clearTimeout(delayedSpeechStartTimeoutId);
    delayedSpeechStartTimeoutId = null;
  }
};

const createUtterance = (text: string, onDone: () => void) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.lang = 'en-US';
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  utterance.onend = onDone;
  utterance.onerror = onDone;

  return utterance;
};

const processSpeechQueue = (afterPreviousUtteranceEnded = false) => {
  if (!isSpeechSupported()) return;
  if (activeUtterance || delayedSpeechStartTimeoutId !== null || queuedSpeech.length === 0) return;

  const synth = window.speechSynthesis;
  const nextSpeech = queuedSpeech.shift();
  if (!nextSpeech) return;

  const speakQueuedUtterance = () => {
    delayedSpeechStartTimeoutId = null;

    const utterance = createUtterance(nextSpeech.text, () => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
      processSpeechQueue(true);
    });

    activeUtterance = utterance;
    synth.speak(utterance);
  };

  if (afterPreviousUtteranceEnded && nextSpeech.afterPreviousEndMs > 0) {
    delayedSpeechStartTimeoutId = window.setTimeout(
      speakQueuedUtterance,
      nextSpeech.afterPreviousEndMs
    );
    return;
  }

  speakQueuedUtterance();
};

const speakNow = (text: string, interrupt: boolean, afterPreviousEndMs: number) => {
  const synth = window.speechSynthesis;
  if (interrupt) {
    const hasQueuedSpeech = queuedSpeech.length > 0 || delayedSpeechStartTimeoutId !== null;
    const hasActiveSpeech = activeUtterance !== null || synth.speaking || synth.pending;

    clearDelayedSpeechStart();
    queuedSpeech = [];
    activeUtterance = null;

    if (hasQueuedSpeech || hasActiveSpeech) {
      synth.cancel();
    }
  }

  queuedSpeech.push({ text, afterPreviousEndMs });
  processSpeechQueue();
};

export const initializeSpeech = () => {
  if (!isSpeechSupported()) return;
  void loadVoices();

  if (hasPrimedSpeech) return;
  hasPrimedSpeech = true;

  // Prime speech synthesis from a user gesture (required in some browsers).
  const silent = new SpeechSynthesisUtterance(' ');
  silent.volume = 0;
  window.speechSynthesis.speak(silent);
};

export const speak = (text: string, options: SpeakOptions = {}) => {
  if (!isSpeechSupported()) return;
  if (!text?.trim()) return;

  const message = text.trim();
  const interrupt = options.interrupt ?? true;
  const afterPreviousEndMs = options.afterPreviousEndMs ?? 0;

  void loadVoices().then(() => {
    speakNow(message, interrupt, afterPreviousEndMs);
  });
};
