const isSpeechSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

let voicesReadyPromise: Promise<void> | null = null;
let preferredVoice: SpeechSynthesisVoice | undefined;
let hasPrimedSpeech = false;

export interface SpeakOptions {
  interrupt?: boolean;
}

const selectPreferredVoice = () => {
  const voices = window.speechSynthesis.getVoices();
  const prioritized = voices.find(
    (voice) =>
      voice.lang.toLowerCase().startsWith('en') &&
      (voice.name.includes('Google') || voice.name.includes('Daniel') || voice.name.includes('Samantha'))
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

const speakNow = (text: string, interrupt: boolean) => {
  const synth = window.speechSynthesis;
  if (interrupt && (synth.speaking || synth.pending)) {
    synth.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.lang = 'en-US';
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  synth.speak(utterance);
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

  void loadVoices().then(() => {
    speakNow(message, interrupt);
  });
};
