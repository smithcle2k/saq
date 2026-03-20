export type AudioCueName = 'beep' | 'whistle' | 'buzzer';

const AUDIO_CUE_SOURCES: Record<AudioCueName, string> = {
  beep: '/beep.wav',
  whistle: '/whistle.wav',
  buzzer: '/buzzer.wav',
};

let hasPrimedAudioCues = false;
const audioCueElements = new Map<AudioCueName, HTMLAudioElement>();

const canUseAudio = () => typeof window !== 'undefined' && typeof Audio !== 'undefined';

const getAudioCueElement = (name: AudioCueName) => {
  let audio = audioCueElements.get(name);
  if (audio) {
    return audio;
  }

  audio = new Audio(AUDIO_CUE_SOURCES[name]);
  audio.preload = 'auto';
  audio.setAttribute('playsinline', 'true');
  audioCueElements.set(name, audio);

  return audio;
};

const resetAudioCueElement = (audio: HTMLAudioElement) => {
  audio.pause();

  try {
    audio.currentTime = 0;
  } catch {
    // Ignore currentTime errors while metadata is still loading.
  }
};

export const initializeAudioCues = () => {
  if (!canUseAudio()) return;

  const audioElements = Object.keys(AUDIO_CUE_SOURCES).map((name) =>
    getAudioCueElement(name as AudioCueName)
  );

  if (hasPrimedAudioCues) {
    return;
  }

  hasPrimedAudioCues = true;

  audioElements.forEach((audio) => {
    const restoreMuted = audio.muted;
    audio.muted = true;
    resetAudioCueElement(audio);

    void audio
      .play()
      .then(() => {
        resetAudioCueElement(audio);
        audio.muted = restoreMuted;
      })
      .catch(() => {
        audio.muted = restoreMuted;
      });
  });
};

export const playAudioCue = (name: AudioCueName) => {
  if (!canUseAudio()) return;

  const audio = getAudioCueElement(name);
  audio.muted = false;
  resetAudioCueElement(audio);
  void audio.play().catch(() => undefined);
};
