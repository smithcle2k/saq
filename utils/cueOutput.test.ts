import assert from 'node:assert/strict';
import test from 'node:test';
import {
  routeSpokenCue,
  shouldPlayCueVoice,
  shouldPlayWorkWhistle,
  shouldShowCueVisual,
} from './cueOutput.ts';

test('routes voice and visual outputs for every cue output mode', () => {
  assert.deepEqual(
    (['VOICE_ONLY', 'VISUAL_ONLY', 'BOTH'] as const).map((mode) => [
      shouldPlayCueVoice(mode),
      shouldShowCueVisual(mode),
    ]),
    [
      [true, false],
      [false, true],
      [true, true],
    ]
  );
});

const createAdapters = (clipAvailable: boolean) => {
  const calls: string[] = [];
  return {
    calls,
    adapters: {
      playClip: (text: string) => {
        calls.push(`clip:${text}`);
        return clipAvailable;
      },
      speak: (text: string) => {
        calls.push(`tts:${text}`);
      },
    },
  };
};

test('plays a recorded clip once without also speaking when the clip is available', () => {
  const { calls, adapters } = createAdapters(true);
  assert.equal(routeSpokenCue('Left', 'BOTH', adapters), 'CLIP');
  assert.deepEqual(calls, ['clip:Left']);
});

test('falls back to text-to-speech exactly once when a clip is missing or fails', () => {
  const { calls, adapters } = createAdapters(false);
  assert.equal(routeSpokenCue('Come Back', 'VOICE_ONLY', adapters), 'TTS');
  assert.deepEqual(calls, ['clip:Come Back', 'tts:Come Back']);
});

test('produces no audio at all in visual-only mode', () => {
  const { calls, adapters } = createAdapters(true);
  assert.equal(routeSpokenCue('Go', 'VISUAL_ONLY', adapters), 'NONE');
  assert.deepEqual(calls, []);
});

test('ignores empty announcements', () => {
  const { calls, adapters } = createAdapters(true);
  assert.equal(routeSpokenCue('  ', 'BOTH', adapters), 'NONE');
  assert.deepEqual(calls, []);
});

test('suppresses the WORK whistle only when spoken Go has priority', () => {
  assert.equal(shouldPlayWorkWhistle('BOTH'), false);
  assert.equal(shouldPlayWorkWhistle('VOICE_ONLY'), false);
  assert.equal(shouldPlayWorkWhistle('VISUAL_ONLY'), true);
});
