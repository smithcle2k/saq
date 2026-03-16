const CHARACTER_SUBSTITUTIONS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '2': 'z',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '6': 'g',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  $: 's',
  '!': 'i',
};

// Best-effort denylist for short cue labels. This is intentionally local and
// deterministic, so it can be expanded without adding a network dependency.
const BLOCKED_WORD_PATTERNS = [
  /\bass(?:hole|hat)?s?\b/,
  /\bbastards?\b/,
  /\bbitch(?:es|y)?\b/,
  /\bbullshit(?:ter|ters|ting)?\b/,
  /\bcock(?:head|heads|s)?\b/,
  /\bcunts?\b/,
  /\bdick(?:head)?s?\b/,
  /\bdipshit(?:s)?\b/,
  /\bdouche(?:bag|bags|y)?\b/,
  /\bfuck(?:er|ers|ing|ed)?\b/,
  /\bmotherfuck(?:er|ers|ing|ed)?\b/,
  /\bpiss(?:ed|ing|off)?\b/,
  /\bprick(?:s)?\b/,
  /\bpuss(?:y|ies)\b/,
  /\bshit(?:ty|head|heads|show|bag|bags)?\b/,
  /\bslut(?:s)?\b/,
  /\btwat(?:s)?\b/,
  /\bwank(?:er|ers|ing)?\b/,
  /\bwhore(?:s)?\b/,
  /\bfag(?:s|got|gots)?\b/,
  /\bnigg(?:er|ers|a|as)\b/,
  /\bkike(?:s)?\b/,
  /\bjews?\b/,
  /\bspic(?:s)?\b/,
  /\bchink(?:s)?\b/,
  /\bgook(?:s)?\b/,
  /\bretard(?:ed|s)?\b/,
  /\bnazi(?:s|ism|st)?\b/,
  /\bterroris(?:t|ts|m)\b/,
  /\bextremis(?:t|ts|m)\b/,
  /\bgenocid(?:e|al)\b/,
  /\blynch(?:ing|ed)?\b/,
  /\bmassacr(?:e|es|ed)\b/,
  /\bexterminat(?:e|ed|es|ing|ion)\b/,
  /\bmurder(?:er|ers|ing)?\b/,
  /\bbomb(?:ing|er|ers|ed|s)?\b/,
];

const BLOCKED_PHRASE_PATTERNS = [
  /\bheil hitler\b/,
  /\bwhite power\b/,
  /\brace war\b/,
  /\bethnic cleansing\b/,
  /\bhate\b/,
  /\bkill yourself\b/,
  /\bhang yourself\b/,
  /\bgas the\b/,
  /\bdeath to\b/,
];

const normalizeCue = (value: string) =>
  value
    .toLowerCase()
    .split('')
    .map((char) => CHARACTER_SUBSTITUTIONS[char] ?? char)
    .join('')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const containsBlockedCueLanguage = (value: string) => {
  const normalized = normalizeCue(value);
  const compactNormalized = normalized.replace(/\s+/g, '');

  return (
    BLOCKED_WORD_PATTERNS.some(
      (pattern) => pattern.test(normalized) || pattern.test(compactNormalized)
    ) || BLOCKED_PHRASE_PATTERNS.some((pattern) => pattern.test(normalized))
  );
};

export const validateCueLabel = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      isAllowed: false,
      error: 'Enter a cue before adding it.',
    };
  }

  if (containsBlockedCueLanguage(trimmed)) {
    return {
      isAllowed: false,
      error: 'Cue cannot contain vulgar, derogatory, or inflammatory language.',
    };
  }

  return {
    isAllowed: true,
    error: '',
  };
};
