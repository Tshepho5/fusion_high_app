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
          light: '#F5F5F7',
          DEFAULT: 'var(--color-canvas)',
        },
        surface: {
          dark: 'var(--color-surface)',
          darker: 'var(--color-surface-darker)',
          elevated: 'var(--color-surface-elevated)',
          light: '#FFFFFF',
          lightElevated: '#F4F4F6',
          DEFAULT: 'var(--color-surface)',
        },
        brand: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#9333EA', // Soft Purple / Lavender Accent
          600: '#7E22CE',
          700: '#6B21A8',
          800: '#581C87',
          900: '#3B0764',
          neon: '#9333EA',
          cyan: '#9333EA',
          DEFAULT: '#9333EA',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'lg': '10px',
        'xl': '14px',
        '2xl': '18px',
        '3xl': '24px',
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 8px 20px -2px rgba(0, 0, 0, 0.2)',
        'glow-brand': '0 0 16px rgba(255, 56, 92, 0.5), 0 0 30px rgba(239, 68, 68, 0.25)',
        'glow-crimson': '0 0 16px rgba(255, 56, 92, 0.6), 0 0 32px rgba(239, 68, 68, 0.3)',
        'glow-indigo': '0 0 16px rgba(255, 56, 92, 0.5), 0 0 28px rgba(239, 68, 68, 0.25)',
        'glow-rose': '0 0 16px rgba(244, 63, 94, 0.5), 0 0 28px rgba(239, 68, 68, 0.25)',
        'glow-cyan': '0 0 16px rgba(255, 56, 92, 0.5), 0 0 28px rgba(239, 68, 68, 0.25)',
        'dock': '0 16px 40px -8px rgba(0, 0, 0, 0.5), 0 0 24px rgba(255, 56, 92, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(3px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        }
      }
    },
  },
  plugins: [],
}
