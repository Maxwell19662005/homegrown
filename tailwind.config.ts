import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: '#F4F6F1',
        ink: '#17241B',
        muted: '#56645A',
        line: '#DDE3DA',
        line2: '#C9D1C6',
        leaf: { DEFAULT: '#1F6F43', dark: '#17532F', soft: '#E3EFE6' },
        tomato: { DEFAULT: '#C2410C', soft: '#FBE3D7', ink: '#9A3412' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
