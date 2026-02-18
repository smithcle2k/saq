/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1a1a1a',
          dim: '#141414',
          bright: '#252525',
          container: '#1e1e1e',
          'container-high': '#282828',
          'container-highest': '#333333',
        },
        primary: {
          DEFAULT: '#38bdf8',
        },
        phase: {
          prep: {
            DEFAULT: '#f59e0b',
            dark: '#92400e',
          },
          work: {
            DEFAULT: '#22c55e',
            dark: '#166534',
          },
          rest: {
            DEFAULT: '#ef4444',
            dark: '#991b1b',
          },
          cooldown: {
            DEFAULT: '#3b82f6',
            dark: '#1e40af',
          },
          finished: {
            DEFAULT: '#a855f7',
            dark: '#6b21a8',
          },
        },
        'on-surface': '#ffffff',
        'on-surface-variant': '#a1a1aa',
        'outline': '#3f3f46',
        'outline-variant': '#27272a',
      },
      fontSize: {
        'timer-huge': ['8rem', { lineHeight: '1', fontWeight: '700' }],
        'timer-large': ['6rem', { lineHeight: '1', fontWeight: '700' }],
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
