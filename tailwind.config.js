/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#232b3b',
          100: '#232b3b',
          200: '#232b3b',
          300: '#232b3b',
          400: '#232b3b',
          500: '#232b3b',
          600: '#232b3b',
          700: '#232b3b',
          800: '#232b3b',
          900: '#232b3b',
        },
        accent: {
          50: '#E6F2FF',
          100: '#B3D9FF',
          200: '#80BFFF',
          300: '#4DA6FF',
          400: '#1A8CFF',
          500: '#0073E6',
          600: '#005AB3',
          700: '#004080',
          800: '#00264D',
          900: '#000D1A',
        },
        // Add dark background and light text for footer
        'footer-bg': '#1A1100',
        'footer-text': '#F3F3F3',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};