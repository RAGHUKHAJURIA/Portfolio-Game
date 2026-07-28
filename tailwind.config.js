/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Battle-royale military palette
        olive: {
          900: '#1a1d15',
          800: '#252a1c',
          700: '#333a26',
          600: '#454e33',
          500: '#5c6b3f',
          400: '#7a8a55',
        },
        steel: {
          900: '#0d1014',
          800: '#14181d',
          700: '#1d232b',
          600: '#2a323c',
          500: '#3d4753',
          400: '#5a6674',
        },
        sand: '#c2b280',
        crate: '#b5824a',
        // Signature drop-marker orange
        flare: {
          DEFAULT: '#f0a92e',
          dim: '#c4841c',
          glow: '#ffc55c',
        },
        zone: '#3fa9f5',
        blood: '#c0392b',
      },
      fontFamily: {
        stencil: ['"Oswald"', '"Bebas Neue"', 'Impact', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'pulse-ring': {
          '0%,100%': { opacity: '0.35', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.06)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'flicker': {
          '0%,100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '94%': { opacity: '0.4' },
          '96%': { opacity: '1' },
        },
        'rise': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        scan: 'scan 4s linear infinite',
        flicker: 'flicker 5s linear infinite',
        rise: 'rise 0.35s ease-out both',
      },
    },
  },
  plugins: [],
}
