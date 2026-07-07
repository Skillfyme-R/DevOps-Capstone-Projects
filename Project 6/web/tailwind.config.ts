import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // NexaFlow brand palette
        navy: {
          50:  '#e8ecf0',
          100: '#c5cfd9',
          200: '#9eafbf',
          300: '#778fa5',
          400: '#5a7891',
          500: '#3d617d',
          600: '#2e4f6b',
          700: '#1e3d59',
          800: '#112b47',
          900: '#0d1b2a',  // primary brand navy
        },
        cyan: {
          50:  '#e0faff',
          100: '#b3f3ff',
          200: '#80ebff',
          300: '#4de3ff',
          400: '#26ddff',
          500: '#00d4ff',  // primary brand cyan
          600: '#00b8dd',
          700: '#009ab8',
          800: '#007d93',
          900: '#005e6e',
        },
        orange: {
          50:  '#fff0eb',
          100: '#ffd8c8',
          200: '#ffbea3',
          300: '#ffa47e',
          400: '#ff8c5a',
          500: '#ff6b35',  // primary brand orange
          600: '#e05420',
          700: '#bf3e0e',
          800: '#9c2b00',
          900: '#7a1c00',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(13,27,42,0.08), 0 1px 2px -1px rgba(13,27,42,0.08)',
        'card-md': '0 4px 6px -1px rgba(13,27,42,0.12), 0 2px 4px -2px rgba(13,27,42,0.08)',
      },
    },
  },
  plugins: [],
}

export default config
