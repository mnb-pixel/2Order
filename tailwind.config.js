/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stone: {
          50: '#FBFBF9',
          100: '#F5F5F2',
          200: '#EBEBE6',
          300: '#DCDCD5',
          400: '#BDBDB3',
          500: '#8E8E84',
          600: '#68685E',
          700: '#4A4A42',
          800: '#2A2A26',
          900: '#141412',
          950: '#0C0C0B',
        },
        atelier: {
          canvas: '#F9F9F8',
          card: '#FFFFFF',
          dark: '#111111',
          slate: '#1E2022',
          terracotta: '#9C4A2F',
          terracottaLight: '#F7EBE8',
          sand: '#EAE6E1',
          accent: '#A65335',
          forest: '#263D31',
          gold: '#C59B27',
          border: '#E8E8E3',
        }
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serif: ['"Playfair Display"', '"Newsreader"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        widest: '0.15em',
      },
      boxShadow: {
        'swiss': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
        'swiss-lg': '0 12px 32px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'floating': '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
      }
    },
  },
  plugins: [],
}
