import { useCallback } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import beepWav from '../assets/audio/beep.wav';
import whistleWav from '../assets/audio/whistle.wav';
import buzzerWav from '../assets/audio/buzzer.wav';
import { useStore } from '../store';
import { SPOKEN_CUE_AUDIO } from './cueAudioAssets';
import type { SpokenCueName } from './cueAudioAssets';

export type AudioCueName = 'beep' | 'whistle' | 'buzzer';

interface InitializeAudioCueOptions {
  force?: boolean;
}

let hasPrimedAudioCues = false;

export const useAudioCues = () => {
  const beepPlayer = useAudioPlayer(beepWav);
  const whistlePlayer = useAudioPlayer(whistleWav);
  const buzzerPlayer = useAudioPlayer(buzzerWav);
  const spokenCuePlayer = useAudioPlayer(null);

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
      if (!useStore.getState().soundEffectsEnabled) return;

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
    [beepPlayer, whistlePlayer, buzzerPlayer, spokenCuePlayer].forEach((player) => {
      try {
        player.pause();
        player.seekTo(0);
      } catch {
        // Ignore if a player is not ready yet.
      }
    });
  }, [beepPlayer, buzzerPlayer, spokenCuePlayer, whistlePlayer]);

  /** Returns false when no clip is registered or playback fails, so callers fall back to TTS. */
  const playSpokenCue = useCallback(
    (text: string) => {
      const source = SPOKEN_CUE_AUDIO[text as SpokenCueName];
      if (!source) return false;
      try {
        spokenCuePlayer.pause();
        spokenCuePlayer.replace(source);
        spokenCuePlayer.seekTo(0).catch(() => undefined);
        spokenCuePlayer.play();
        return true;
      } catch {
        return false;
      }
    },
    [spokenCuePlayer]
  );

  return {
    initializeAudioCues,
    playAudioCue,
    playSpokenCue,
    stopAudioCues,
  };
};
