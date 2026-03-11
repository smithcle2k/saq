/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#030305',
          dim: '#000000',
          bright: '#0c0c14',
          container: 'rgba(255, 255, 255, 0.03)',
          'container-high': 'rgba(255, 255, 255, 0.08)',
          'container-highest': 'rgba(255, 255, 255, 0.12)',
        },
        primary: {
          DEFAULT: '#00f0ff',
        },
        phase: {
          prep: {
            DEFAULT: '#ea580c',
            dark: '#9a3412',
          },
          work: {
            DEFAULT: '#10b981',
            dark: '#047857',
          },
          rest: {
            DEFAULT: '#e11d48',
            dark: '#be123c',
          },
          cooldown: {
            DEFAULT: '#4f46e5',
            dark: '#312e81',
          },
          finished: {
            DEFAULT: '#d946ef',
            dark: '#701a75',
          },
        },
        'on-surface': '#ffffff',
        'on-surface-variant': '#94a3b8',
        outline: 'rgba(255, 255, 255, 0.1)',
        'outline-variant': 'rgba(255, 255, 255, 0.05)',
      },
      fontSize: {
        'timer-huge': ['8rem', { lineHeight: '1', fontWeight: '700' }],
        'timer-large': ['6rem', { lineHeight: '1', fontWeight: '700' }],
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
