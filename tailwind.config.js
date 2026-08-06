/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'sans-serif'],
        display: ['Tajawal', 'sans-serif'],
      },
      colors: {
        sidebar: {
          bg: '#08050f',
          surface: '#110824',
          border: 'rgba(168,85,247,0.15)',
          hover: 'rgba(168,85,247,0.1)',
        },
        brand: {
          50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
          400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce',
          800: '#6b21a8', 900: '#581c87', 950: '#3b0764',
        },
        cobalt: {
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
          400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
          800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
        },
        rose: {
          50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4',
          400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d',
        },
        emerald: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
          400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
        },
        gold: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#c9a84c', 600: '#b8962a', 700: '#9a7a1f',
          800: '#7c6019', 900: '#5e4a14',
        },
        ink: {
          50: '#f8f9fb', 100: '#f0f2f5', 200: '#e2e6ed', 300: '#c8d0dc',
          400: '#9aaabb', 500: '#6b7f94', 600: '#506070', 700: '#3d4e5e',
          800: '#2c3a47', 900: '#1a2535', 950: '#0e1520',
        },
      },
      boxShadow: {
        'luxury': '0 4px 40px rgba(168,85,247,0.06), 0 1px 4px rgba(0,0,0,0.05)',
        'luxury-lg': '0 12px 60px rgba(168,85,247,0.12)',
        'gold': '0 0 0 2px rgba(168,85,247,0.3)',
        'inner-soft': 'inset 0 1px 3px rgba(0,0,0,0.06)',
        'glow': '0 0 30px rgba(168,85,247,0.25)',
      },
      backgroundImage: {
        'gradient-luxury': 'linear-gradient(135deg, #08050f 0%, #110824 100%)',
        'gradient-gold': 'linear-gradient(135deg, #a855f7 0%, #fbbf24 100%)',
        'gradient-brand': 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
        'gradient-card': 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(248,249,251,0.5) 100%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-1000px 0' }, '100%': { backgroundPosition: '1000px 0' } },
        pulseGlow: { '0%,100%': { opacity: '0.4' }, '50%': { opacity: '0.8' } },
      },
    },
  },
  plugins: [],
}
