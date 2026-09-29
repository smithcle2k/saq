import type { AudioSource } from 'expo-audio';

export type SpokenCueName = 'Go' | 'Left' | 'Right' | 'Run' | 'Come Back';

/**
 * Add static asset imports here only after the files named in assets/audio/cues/README.md exist.
 * Null sources deliberately route to TTS so Metro can build before audio is supplied.
 */
export const SPOKEN_CUE_AUDIO: Record<SpokenCueName, AudioSource> = {
  Go: null,
  Left: null,
  Right: null,
  Run: null,
  'Come Back': null,
};
