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
          light: '#CBDDE3',
          DEFAULT: 'var(--color-canvas)',
        },
        surface: {
          dark: 'var(--color-surface)',
          darker: 'var(--color-surface-darker)',
          elevated: 'var(--color-surface-elevated)',
          light: '#FFFFFF',
          lightElevated: '#EDF4F7',
          DEFAULT: 'var(--color-surface)',
        },
        brand: {
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#13C8D9', // Bright Cyan / Turquoise Accent
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
          neon: '#18E2EC',
          cyan: '#13C8D9',
          charcoal: '#1C252C',
          chipGrey: '#E1ECF0',
          DEFAULT: '#13C8D9',
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
        'sm': '0 1px 3px 0 rgba(18, 38, 58, 0.06), 0 1px 2px -1px rgba(18, 38, 58, 0.06)',
        'md': '0 4px 6px -1px rgba(18, 38, 58, 0.07), 0 2px 4px -2px rgba(18, 38, 58, 0.07)',
        'lg': '0 10px 15px -3px rgba(18, 38, 58, 0.08), 0 4px 6px -4px rgba(18, 38, 58, 0.06)',
        'xl': '0 20px 25px -5px rgba(18, 38, 58, 0.1), 0 8px 10px -6px rgba(18, 38, 58, 0.06)',
        'card-hover': '0 12px 24px -2px rgba(18, 38, 58, 0.12)',
        'glow-brand': '0 0 16px rgba(19, 200, 217, 0.5), 0 0 30px rgba(24, 226, 236, 0.25)',
        'glow-crimson': '0 0 16px rgba(255, 56, 92, 0.6), 0 0 32px rgba(239, 68, 68, 0.3)',
        'glow-indigo': '0 0 16px rgba(99, 102, 241, 0.5), 0 0 28px rgba(79, 70, 229, 0.25)',
        'glow-rose': '0 0 16px rgba(244, 63, 94, 0.5), 0 0 28px rgba(239, 68, 68, 0.25)',
        'glow-cyan': '0 0 16px rgba(19, 200, 217, 0.6), 0 0 32px rgba(24, 226, 236, 0.35)',
        'dock': '0 16px 40px -8px rgba(0, 0, 0, 0.65), 0 0 24px rgba(19, 200, 217, 0.18)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'marquee': 'marquee 25s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(3px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      }
    },
  },
  plugins: [],
}
