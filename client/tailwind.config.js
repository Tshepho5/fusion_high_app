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
        canvas: {
          dark: 'var(--color-canvas)',
          light: '#F8FAFC',
          DEFAULT: 'var(--color-canvas)',
        },
        surface: {
          dark: 'var(--color-surface)',
          darker: 'var(--color-surface-darker)',
          elevated: 'var(--color-surface-elevated)',
          light: '#FFFFFF',
          lightElevated: '#F1F5F9',
          DEFAULT: 'var(--color-surface)',
        },
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          cyan: '#06B6D4',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'glow-indigo': '0 2px 8px -2px rgba(79, 70, 229, 0.25)',
        'glow-indigo-lg': '0 4px 14px -2px rgba(79, 70, 229, 0.3)',
        'glow-cyan': '0 2px 8px -2px rgba(6, 182, 212, 0.25)',
        'glow-cyan-lg': '0 4px 14px -2px rgba(6, 182, 212, 0.3)',
        'glow-emerald': '0 2px 8px -2px rgba(16, 185, 129, 0.25)',
        'glow-amber': '0 2px 8px -2px rgba(245, 158, 11, 0.25)',
        'glow-rose': '0 2px 8px -2px rgba(244, 63, 94, 0.25)',
        'glow-purple': '0 2px 8px -2px rgba(168, 85, 247, 0.25)',
        'card-hover': '0 6px 16px -2px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'shimmer': 'shimmer 2.5s infinite linear',
        'marquee': 'marquee 35s linear infinite',
        'marquee-slow': 'marquee 50s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    },
  },
  plugins: [],
}
