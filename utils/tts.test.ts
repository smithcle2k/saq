import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class MockSpeechSynthesisUtterance {
  text: string;
  rate = 1;
  pitch = 1;
  volume = 1;
  lang = 'en-US';
  voice?: SpeechSynthesisVoice;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const installSpeechMocks = () => {
  const spokenUtterances: MockSpeechSynthesisUtterance[] = [];
  let currentUtterance: MockSpeechSynthesisUtterance | null = null;

  const speechSynthesis = {
    speaking: false,
    pending: false,
    getVoices: vi.fn(() => [{ lang: 'en-US', name: 'Google US English' } as SpeechSynthesisVoice]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    speak: vi.fn((utterance: MockSpeechSynthesisUtterance) => {
      currentUtterance = utterance;
      spokenUtterances.push(utterance);
      speechSynthesis.speaking = true;
    }),
    cancel: vi.fn(() => {
      currentUtterance = null;
      speechSynthesis.speaking = false;
      speechSynthesis.pending = false;
    }),
  };

  vi.stubGlobal('window', {
    speechSynthesis,
    SpeechSynthesisUtterance: MockSpeechSynthesisUtterance,
    setTimeout,
    clearTimeout,
  });
  vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);

  return {
    speechSynthesis,
    spokenUtterances,
    finishCurrentUtterance: () => {
      const utterance = currentUtterance;
      if (!utterance) {
        throw new Error('No current utterance to finish');
      }

      currentUtterance = null;
      speechSynthesis.speaking = false;
      utterance.onend?.();
    },
  };
};

describe('speak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('waits for the prior utterance to end before applying the configured follow-up delay', async () => {
    const { spokenUtterances, finishCurrentUtterance } = installSpeechMocks();

    vi.resetModules();
    const { speak } = await import('./tts');

    speak('Break', { interrupt: false });
    await flushMicrotasks();

    speak('Shuffle Left', { interrupt: false, afterPreviousEndMs: 50 });
    await flushMicrotasks();

    expect(spokenUtterances.map((utterance) => utterance.text)).toEqual(['Break']);

    finishCurrentUtterance();

    vi.advanceTimersByTime(49);
    expect(spokenUtterances.map((utterance) => utterance.text)).toEqual(['Break']);

    vi.advanceTimersByTime(1);
    expect(spokenUtterances.map((utterance) => utterance.text)).toEqual(['Break', 'Shuffle Left']);
  });

  it('does not cancel speech synthesis before the first interrupting utterance when idle', async () => {
    const { speechSynthesis, spokenUtterances } = installSpeechMocks();

    vi.resetModules();
    const { speak } = await import('./tts');

    speak('Get ready');
    await flushMicrotasks();

    expect(speechSynthesis.cancel).not.toHaveBeenCalled();
    expect(spokenUtterances.map((utterance) => utterance.text)).toEqual(['Get ready']);
  });
});
