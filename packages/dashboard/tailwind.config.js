/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fp: {
          bg: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
          primary: '#6366f1',
          text: '#e2e8f0',
          muted: '#94a3b8',
          low: '#22c55e',
          med: '#eab308',
          high: '#ef4444'
        }
      }
    }
  },
  plugins: []
}
