import { useCallback } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import beepWav from '../assets/audio/beep.wav';
import whistleWav from '../assets/audio/whistle.wav';
import buzzerWav from '../assets/audio/buzzer.wav';

export type AudioCueName = 'beep' | 'whistle' | 'buzzer';

interface InitializeAudioCueOptions {
  force?: boolean;
}

let hasPrimedAudioCues = false;

export const useAudioCues = () => {
  const beepPlayer = useAudioPlayer(beepWav);
  const whistlePlayer = useAudioPlayer(whistleWav);
  const buzzerPlayer = useAudioPlayer(buzzerWav);

  const initializeAudioCues = useCallback(async (options: InitializeAudioCueOptions = {}) => {
    if (hasPrimedAudioCues && !options.force) return;

    hasPrimedAudioCues = true;
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
  }, []);

  const playAudioCue = useCallback(
    (name: AudioCueName) => {
      const player =
        name === 'beep' ? beepPlayer : name === 'whistle' ? whistlePlayer : buzzerPlayer;

      try {
        player.seekTo(0);
        player.play();
      } catch {
        // Ignore transient playback errors if the asset is still settling.
      }
    },
    [beepPlayer, buzzerPlayer, whistlePlayer]
  );

  const stopAudioCues = useCallback(() => {
    [beepPlayer, whistlePlayer, buzzerPlayer].forEach((player) => {
      try {
        player.pause();
        player.seekTo(0);
      } catch {
        // Ignore if a player is not ready yet.
      }
    });
  }, [beepPlayer, buzzerPlayer, whistlePlayer]);

  return {
    initializeAudioCues,
    playAudioCue,
    stopAudioCues,
  };
};
