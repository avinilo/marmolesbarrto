/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html'
  ],
  theme: {
    extend: {
      colors: {
        'marble-dark': '#1a1a1a',
        'marble-gray': '#f4f4f4',
        'gold-accent': '#c5a059',
        'gold-dark': '#8f6b29',
        'stone-500': '#78716c',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Lato"', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
