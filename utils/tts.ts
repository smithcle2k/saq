const isSpeechSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

const getPreferredVoice = () => {
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (voice) =>
      voice.lang.includes('en') &&
      (voice.name.includes('Google') || voice.name.includes('Daniel') || voice.name.includes('Samantha'))
  );

  if (preferred) return preferred;
  return voices.find((voice) => voice.lang.toLowerCase().startsWith('en'));
};

const loadVoices = async () => {
  if (!isSpeechSupported()) return;
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return;

  await new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      window.speechSynthesis.onvoiceschanged = null;
      resolve();
    };

    window.speechSynthesis.onvoiceschanged = finish;
    window.setTimeout(finish, 250);
  });
};

const queueSpeech = (text: string) => {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  utterance.lang = 'en-US';

  const preferredVoice = getPreferredVoice();
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  if (synth.speaking || synth.pending) {
    synth.cancel();
  }

  synth.speak(utterance);
};

export const initializeSpeech = () => {
  if (!isSpeechSupported()) return;

  // Prime speech synthesis from a user gesture (required in some browsers).
  window.speechSynthesis.getVoices();

  const silent = new SpeechSynthesisUtterance(' ');
  silent.volume = 0;
  window.speechSynthesis.speak(silent);
};

export const speak = (text: string) => {
  if (!isSpeechSupported()) return;
  if (!text?.trim()) return;

  const message = text.trim();
  void loadVoices().then(() => {
    queueSpeech(message);

    // Safari sometimes drops utterances; retry once quickly if not queued.
    window.setTimeout(() => {
      const synth = window.speechSynthesis;
      if (!synth.speaking && !synth.pending) {
        queueSpeech(message);
      }
    }, 200);
  });
};
