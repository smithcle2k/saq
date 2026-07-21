export const colors = {
  // Neutrals — layered elevation system (Interval Timer Design System)
  surface: '#0A0A0A', // app background
  surfaceDim: '#000000',
  surfaceBright: '#1F1F1F', // elevated
  surfaceCard: '#151515', // card / surface
  surfaceCardStrong: '#1F1F1F',
  outline: '#2C2C2E', // border
  outlineStrong: '#3A3A3C',
  // Brand accent follows WORK (green)
  primary: '#30D158',
  primarySoft: 'rgba(48,209,88,0.18)',
  primaryBorder: 'rgba(48,209,88,0.45)',
  onSurface: '#FFFFFF',
  onSurfaceVariant: '#A1A1A6',
  // Phase colors — WORK green, REST red (kept), others from the design system
  prep: '#FFCC00',
  prepDark: '#C77700',
  work: '#30D158',
  workDark: '#248A3D',
  rest: '#FF3B30',
  restDark: '#A50E06',
  cooldown: '#007AFF',
  cooldownDark: '#0040A0',
  finished: '#AF52DE',
  finishedDark: '#7A2FA0',
  paused: '#8E8E93',
  danger: '#FF3B30',
  shadow: '#000000',
} as const;

export const gradients = {
  app: ['#1F1F1F', '#0A0A0A'] as const,
  prep: ['#FFD60A', '#FFCC00', '#C77700'] as const,
  work: ['#34D058', '#30D158', '#248A3D'] as const,
  rest: ['#FF453A', '#FF3B30', '#A50E06'] as const,
  cooldown: ['#0A84FF', '#007AFF', '#0040A0'] as const,
  finished: ['#BF5AF2', '#AF52DE', '#7A2FA0'] as const,
} as const;

// Radius scale (4 / 8 / 16 / 20 / 24 / full)
export const radius = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  full: 999,
} as const;

// Spacing — 8pt grid
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Elevation / shadow scale (dark mode)
export const elevation = {
  none: {},
  low: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  high: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const fonts = {
  sansRegular: 'Outfit_400Regular',
  sansMedium: 'Outfit_500Medium',
  sansSemiBold: 'Outfit_600SemiBold',
  sansBold: 'Outfit_700Bold',
  sansExtraBold: 'Outfit_800ExtraBold',
  sansBlack: 'Outfit_900Black',
  monoRegular: 'RobotoMono_400Regular',
  monoMedium: 'RobotoMono_500Medium',
  monoBold: 'RobotoMono_700Bold',
} as const;
