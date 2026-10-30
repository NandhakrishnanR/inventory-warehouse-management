/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffe',
          300: '#7cc2fd',
          400: '#36a2fa',
          500: '#0c84eb',
          600: '#0267c8',
          700: '#0352a1',
          800: '#074685',
          900: '#0c3c6f',
          950: '#082649',
        },
      },
    },
  },
  plugins: [],
}
