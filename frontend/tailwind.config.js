/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darcula: {
          bg: '#2B2B2B',
          surface: '#3C3F41',
          border: '#515151',
          text: '#BBBBBB',
          muted: '#808080',
          highlight: '#4E5254',
          add: '#364135',
          addText: '#6A8759',
          del: '#5B3636',
          delText: '#BC3F3C',
          info: '#3592C4',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
