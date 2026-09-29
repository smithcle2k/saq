import type { CueOutputMode, SessionConfigSnapshot, SessionPreset, TimerConfig } from '../types.ts';
import { INTERVAL_SINGLE_CUES, normalizeIntervalEnabledCues } from './defaultCues.ts';
import { DEFAULT_CUE_SETTINGS, normalizeCueSettings } from './cueSettings.ts';
import {
  DEFAULT_DRILL_SETTINGS,
  normalizeDrillSettings,
  validateDrillSession,
} from './drillPlan.ts';
import { cloneSessionConfig } from './sessionHistory.ts';

export const MAX_PRESET_NAME_LENGTH = 40;

/** Same bounds as the Setup inputs; a preset outside them is rejected, never clamped. */
export const TIMER_CONFIG_LIMITS: Record<keyof TimerConfig, { min: number; max: number }> = {
  prepTime: { min: 5, max: 3600 },
  workTime: { min: 3, max: 3600 },
  restTime: { min: 15, max: 3600 },
  rounds: { min: 1, max: 100 },
  coolDownTime: { min: 0, max: 3600 },
};

const CUE_OUTPUT_MODES: readonly CueOutputMode[] = ['VOICE_ONLY', 'VISUAL_ONLY', 'BOTH'];

/** App defaults (see storeMigrations); duplicated here to keep this module import-cycle free. */
const DEFAULT_TIMER_CONFIG: TimerConfig = {
  prepTime: 10,
  workTime: 8,
  restTime: 55,
  rounds: 8,
  coolDownTime: 0,
};

const builtIn = (id: string, name: string, config: SessionConfigSnapshot): SessionPreset => ({
  id,
  name,
  builtIn: true,
  config,
});

/** Every value is stated so applying a built-in never inherits leftovers from the last setup. */
export const BUILT_IN_PRESETS: readonly SessionPreset[] = [
  builtIn('builtin-reactive-cuts', 'Reactive cuts', {
    timerConfig: { ...DEFAULT_TIMER_CONFIG },
    enabledCues: ['Left', 'Right', 'Run'],
    cueSettings: normalizeCueSettings({ delayMinMs: 500, delayMaxMs: 2500 }),
    drillSettings: { ...DEFAULT_DRILL_SETTINGS, drillType: 'REACTIVE' },
    cueOutputMode: 'BOTH',
  }),
  builtIn('builtin-decel-focus', 'Decel focus', {
    timerConfig: { ...DEFAULT_TIMER_CONFIG },
    enabledCues: [...INTERVAL_SINGLE_CUES],
    cueSettings: normalizeCueSettings({
      delayMinMs: 500,
      delayMaxMs: 2500,
      cueWeights: { ...DEFAULT_CUE_SETTINGS.cueWeights, 'Come Back': 3 },
    }),
    drillSettings: {
      ...DEFAULT_DRILL_SETTINGS,
      drillType: 'REACTIVE',
      stoppingInstruction: 'Stop within 2 strides',
    },
    cueOutputMode: 'BOTH',
  }),
  builtIn('builtin-planned-baseline', 'Planned baseline', {
    timerConfig: { ...DEFAULT_TIMER_CONFIG },
    enabledCues: [...INTERVAL_SINGLE_CUES],
    cueSettings: normalizeCueSettings({ delayMinMs: 500, delayMaxMs: 2500 }),
    drillSettings: { ...DEFAULT_DRILL_SETTINGS, drillType: 'PLANNED' },
    cueOutputMode: 'BOTH',
  }),
];

export type SessionConfigValidation =
  | { isValid: true; config: SessionConfigSnapshot }
  | { isValid: false; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** True when every normalized value is already present, unchanged, in the raw input. */
const isUnchangedByNormalizing = (normalized: unknown, raw: unknown): boolean => {
  if (isRecord(normalized)) {
    return (
      isRecord(raw) &&
      Object.keys(normalized).every((key) => isUnchangedByNormalizing(normalized[key], raw[key]))
    );
  }
  return normalized === raw;
};

const fail = (message: string): SessionConfigValidation => ({ isValid: false, message });

/**
 * Strict check for a stored or about-to-be-applied configuration. Anything that
 * normalizing would change is reported as invalid instead of silently adjusted.
 */
export const validateSessionConfig = (input: unknown): SessionConfigValidation => {
  if (!isRecord(input)) return fail('Preset has no configuration.');

  const timer = input.timerConfig;
  if (!isRecord(timer)) return fail('Preset has no timer settings.');
  const timerConfig = {} as TimerConfig;
  for (const key of Object.keys(TIMER_CONFIG_LIMITS) as Array<keyof TimerConfig>) {
    const value = timer[key];
    const { min, max } = TIMER_CONFIG_LIMITS[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
      return fail(`Preset timer value "${key}" must be a whole number from ${min} to ${max}.`);
    }
    timerConfig[key] = value;
  }

  const cues = input.enabledCues;
  if (
    !Array.isArray(cues) ||
    cues.length === 0 ||
    new Set(cues).size !== cues.length ||
    !cues.every((cue) => (INTERVAL_SINGLE_CUES as readonly unknown[]).includes(cue))
  ) {
    return fail('Preset cue list is empty or has unknown cues.');
  }
  const enabledCues = normalizeIntervalEnabledCues(cues as string[]);

  const cueSettings = normalizeCueSettings(isRecord(input.cueSettings) ? input.cueSettings : {});
  if (!isUnchangedByNormalizing(cueSettings, input.cueSettings)) {
    return fail('Preset cue delays or weights are out of range.');
  }

  const rawDrill = input.drillSettings;
  const drillSettings = normalizeDrillSettings(isRecord(rawDrill) ? rawDrill : {});
  drillSettings.stoppingInstruction = drillSettings.stoppingInstruction.trim();
  const rawInstruction = isRecord(rawDrill) ? rawDrill.stoppingInstruction : undefined;
  if (
    !isUnchangedByNormalizing(
      { ...drillSettings, stoppingInstruction: undefined },
      isRecord(rawDrill) ? { ...rawDrill, stoppingInstruction: undefined } : rawDrill
    ) ||
    typeof rawInstruction !== 'string' ||
    rawInstruction.trim() !== drillSettings.stoppingInstruction
  ) {
    return fail('Preset drill settings are out of range.');
  }

  const cueOutputMode = input.cueOutputMode as CueOutputMode;
  if (!CUE_OUTPUT_MODES.includes(cueOutputMode)) return fail('Preset output mode is unknown.');

  const drill = validateDrillSession({
    drillSettings,
    cueSettings,
    enabledCues,
    config: timerConfig,
  });
  if (!drill.isValid) return fail(drill.message);

  return {
    isValid: true,
    config: { timerConfig, enabledCues, cueSettings, drillSettings, cueOutputMode },
  };
};

export const sessionConfigsEqual = (a: SessionConfigSnapshot, b: SessionConfigSnapshot) => {
  const canonical = (config: SessionConfigSnapshot) =>
    JSON.stringify([
      (Object.keys(TIMER_CONFIG_LIMITS) as Array<keyof TimerConfig>).map(
        (key) => config.timerConfig[key]
      ),
      normalizeIntervalEnabledCues(config.enabledCues),
      normalizeCueSettings(config.cueSettings),
      {
        ...config.drillSettings,
        stoppingInstruction: config.drillSettings.stoppingInstruction.trim(),
      },
      config.cueOutputMode,
    ]);
  return canonical(a) === canonical(b);
};

export type PresetResult =
  | { ok: true; presets: SessionPreset[]; preset: SessionPreset }
  | { ok: false; message: string };

const validateName = (name: string, presets: readonly SessionPreset[], ownId?: string) => {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, message: 'Enter a preset name.' };
  if (trimmed.length > MAX_PRESET_NAME_LENGTH) {
    return {
      ok: false as const,
      message: `Preset names are ${MAX_PRESET_NAME_LENGTH} characters or fewer.`,
    };
  }
  const taken = [...BUILT_IN_PRESETS, ...presets].some(
    (preset) => preset.id !== ownId && preset.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (taken) return { ok: false as const, message: 'A preset with that name already exists.' };
  return { ok: true as const, name: trimmed };
};

/** Validates everything first; on failure the saved list is untouched. */
export const createUserPreset = (
  presets: readonly SessionPreset[],
  { id, name, config }: { id: string; name: string; config: SessionConfigSnapshot }
): PresetResult => {
  const validName = validateName(name, presets);
  if (!validName.ok) return validName;
  const validation = validateSessionConfig(config);
  if (!validation.isValid) return { ok: false, message: validation.message };
  const preset: SessionPreset = {
    id,
    name: validName.name,
    config: cloneSessionConfig(validation.config),
  };
  return { ok: true, preset, presets: [...presets, preset] };
};

/** Only user presets can be renamed; built-in names are fixed. */
export const renamePreset = (
  presets: readonly SessionPreset[],
  id: string,
  name: string
): PresetResult => {
  const index = presets.findIndex((preset) => preset.id === id);
  if (index < 0) return { ok: false, message: 'Preset not found.' };
  const validName = validateName(name, presets, id);
  if (!validName.ok) return validName;
  const preset = { ...presets[index], name: validName.name };
  const next = [...presets];
  next[index] = preset;
  return { ok: true, preset, presets: next };
};

export const deletePreset = (presets: SessionPreset[], id: string) =>
  presets.some((preset) => preset.id === id)
    ? presets.filter((preset) => preset.id !== id)
    : presets;

/** Persistence/migration: keeps valid user presets, drops corrupted ones and duplicate ids. */
export const normalizeSavedPresets = (input: unknown): SessionPreset[] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input.flatMap((entry): SessionPreset[] => {
    if (!isRecord(entry) || typeof entry.id !== 'string' || !entry.id || seen.has(entry.id)) {
      return [];
    }
    if (typeof entry.name !== 'string' || !entry.name.trim()) return [];
    const validation = validateSessionConfig(entry.config);
    if (!validation.isValid) return [];
    seen.add(entry.id);
    return [
      {
        id: entry.id,
        name: entry.name.trim().slice(0, MAX_PRESET_NAME_LENGTH),
        config: validation.config,
      },
    ];
  });
};

const DRILL_SHORT: Record<string, string> = {
  REACTIVE: 'Reactive',
  PLANNED: 'Planned',
  ALTERNATING: 'Alternating',
  FAKE_OUT: 'Fake-out',
  CHAIN: 'Chain',
};

/** Compact summary of a preset's drill, cues, and interval timing. */
export const describeSessionConfig = (config: SessionConfigSnapshot) =>
  [
    DRILL_SHORT[config.drillSettings.drillType],
    config.enabledCues.join(', '),
    `${config.timerConfig.workTime}s / ${config.timerConfig.restTime}s × ${config.timerConfig.rounds}`,
  ].join(' · ');

/** The live setup as one snapshot, exactly as Start freezes it. */
export const getCurrentSessionConfig = (state: {
  timerConfig: TimerConfig;
  exercises: string[];
  cueSettings: SessionConfigSnapshot['cueSettings'];
  drillSettings: SessionConfigSnapshot['drillSettings'];
  cueOutputMode: CueOutputMode;
}): SessionConfigSnapshot =>
  cloneSessionConfig({
    timerConfig: state.timerConfig,
    enabledCues: state.exercises,
    cueSettings: state.cueSettings,
    drillSettings: {
      ...state.drillSettings,
      stoppingInstruction: state.drillSettings.stoppingInstruction.trim(),
    },
    cueOutputMode: state.cueOutputMode,
  });
