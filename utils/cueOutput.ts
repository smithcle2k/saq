import type { CueOutputMode } from '../types';

export type { CueOutputMode } from '../types';

/** Output mode is the single source of truth for all spoken guidance. */
export const shouldPlayCueVoice = (mode: CueOutputMode) => mode !== 'VISUAL_ONLY';
export const shouldShowCueVisual = (mode: CueOutputMode) => mode !== 'VOICE_ONLY';

/**
 * Spoken "Go" and the WORK whistle start together; cue speech has priority,
 * so the whistle only plays when nothing will be spoken.
 */
export const shouldPlayWorkWhistle = (mode: CueOutputMode) => !shouldPlayCueVoice(mode);

export interface SpokenCueAdapters {
  /** Returns true only when a recorded clip actually started. */
  playClip: (text: string) => boolean;
  speak: (text: string) => void;
}

export type SpokenCueRoute = 'CLIP' | 'TTS' | 'NONE';

/** One output event per cue: recorded clip first, TTS only if the clip is unavailable. */
export const routeSpokenCue = (
  text: string,
  mode: CueOutputMode,
  adapters: SpokenCueAdapters
): SpokenCueRoute => {
  const message = text.trim();
  if (!message || !shouldPlayCueVoice(mode)) return 'NONE';
  if (adapters.playClip(message)) return 'CLIP';
  adapters.speak(message);
  return 'TTS';
};
