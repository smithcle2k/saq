const getPreferredVoice = () => {
  const voices = window.speechSynthesis.getVoices();
  return voices.find(
    (voice) =>
      voice.lang.includes('en') &&
      (voice.name.includes('Google') || voice.name.includes('Daniel') || voice.name.includes('Samantha'))
  );
};

export const initializeSpeech = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  // Prime speech synthesis from a user gesture (required in some browsers).
  window.speechSynthesis.getVoices();

  const silent = new SpeechSynthesisUtterance('');
  silent.volume = 0;
  window.speechSynthesis.speak(silent);
  window.speechSynthesis.cancel();
};

export const speak = (text: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!text?.trim()) return;

  // Cancel any ongoing speech to keep announcements in sync.
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const preferredVoice = getPreferredVoice();
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  window.speechSynthesis.speak(utterance);
};
