import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        rbt: {
          red: '#BA1A1A',
          'red-hover': '#991B1B',
          'red-light': '#FEF2F2',
          'red-border': '#FECACA',
          black: '#111827',
          dark: '#0A0F1D',
          navy: '#1E3A5F',
          steel: '#2D4B73',
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          300: '#9FB3C8',
          400: '#829AB1',
          500: '#627D98',
          600: '#486581',
          700: '#334E68',
          800: '#243B53',
          900: '#102A43',
          accent: '#BA1A1A',
          gold: '#D97706',
        },
      },
    },
  },
  plugins: [],
};

export default config;
