/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17261D',
        leaf: '#1E5B3F',
        beet: { DEFAULT: '#A12D5C', dark: '#862249', soft: '#F8E6EE' },
        paper: '#F5F6F2',
        line: '#DFE3DA',
        muted: '#5C6A61',
        crowd: { low: '#1F9D55', mid: '#E0A106', high: '#D13B30' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        plate: '0 1px 0 rgba(23,38,29,.04), 0 6px 18px -8px rgba(23,38,29,.18)',
      },
    },
  },
  plugins: [],
};
