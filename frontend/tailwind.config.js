/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#080808',
        base: '#111111',
        surface: '#1a1a1a',
        border: '#2a2a2a',
        acid: '#C8FF00',
        critical: '#FF3B3B',
        high: '#FF9500',
        medium: '#FFE500',
        safe: '#00FF88',
        muted: '#555555',
      },
      fontFamily: {
        grotesk: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
