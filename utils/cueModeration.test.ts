import { describe, expect, it } from 'vitest';
import { containsBlockedCueLanguage, validateCueLabel } from './cueModeration';

describe('cueModeration', () => {
  it('allows normal movement cues', () => {
    expect(validateCueLabel('Shuffle Left').isAllowed).toBe(true);
    expect(validateCueLabel('Come Back').isAllowed).toBe(true);
  });

  it('blocks obvious vulgar language', () => {
    expect(containsBlockedCueLanguage('fuck')).toBe(true);
    expect(containsBlockedCueLanguage('bullshit')).toBe(true);
    expect(containsBlockedCueLanguage('douchebag')).toBe(true);
    expect(containsBlockedCueLanguage('prick')).toBe(true);
  });

  it('blocks derogatory language', () => {
    expect(containsBlockedCueLanguage('retard')).toBe(true);
    expect(containsBlockedCueLanguage('white power')).toBe(true);
    expect(containsBlockedCueLanguage('n@zi')).toBe(true);
  });

  it('blocks inflammatory language', () => {
    expect(containsBlockedCueLanguage('kill yourself')).toBe(true);
    expect(containsBlockedCueLanguage('bomb')).toBe(true);
    expect(containsBlockedCueLanguage('ethnic cleansing')).toBe(true);
    expect(containsBlockedCueLanguage('massacre')).toBe(true);
    expect(containsBlockedCueLanguage('hate')).toBe(true);
    expect(containsBlockedCueLanguage('jew')).toBe(true);
    expect(containsBlockedCueLanguage('jews')).toBe(true);
  });

  it('normalizes common leetspeak before matching', () => {
    expect(containsBlockedCueLanguage('f u c k')).toBe(true);
    expect(containsBlockedCueLanguage('b1tch')).toBe(true);
    expect(containsBlockedCueLanguage('wh1te pow3r')).toBe(true);
  });

  it('avoids blocking normal workout cues', () => {
    expect(containsBlockedCueLanguage('Straight Right')).toBe(false);
    expect(containsBlockedCueLanguage('Sprint Back')).toBe(false);
    expect(containsBlockedCueLanguage('High Knees')).toBe(false);
  });
});
