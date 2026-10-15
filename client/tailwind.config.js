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
          dark: '#080B10',
          light: '#E5EBF1',
          DEFAULT: 'var(--color-canvas)',
        },
        surface: {
          dark: '#111821',
          darker: '#0D121A',
          elevated: '#171F29',
          light: '#F4F6F8',
          lightElevated: '#FFFFFF',
          DEFAULT: 'var(--color-surface)',
        },
        brand: {
          50: '#F0F7FF',
          100: '#E0EFFF',
          200: '#BAE0FF',
          300: '#7CC4FF',
          400: '#38A5FF',
          500: '#168BFF', // Electric Blue Accent
          600: '#0878E8',
          700: '#0060C4',
          800: '#004C9E',
          900: '#003A78',
          neon: '#168BFF',
          cyan: '#168BFF',
          charcoal: '#111821',
          chipGrey: '#DCE4EC',
          DEFAULT: '#168BFF',
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
        'sm': '0 1px 3px 0 rgba(16, 24, 32, 0.06), 0 1px 2px -1px rgba(16, 24, 32, 0.06)',
        'md': '0 4px 6px -1px rgba(16, 24, 32, 0.07), 0 2px 4px -2px rgba(16, 24, 32, 0.07)',
        'lg': '0 10px 15px -3px rgba(16, 24, 32, 0.08), 0 4px 6px -4px rgba(16, 24, 32, 0.06)',
        'xl': '0 20px 25px -5px rgba(16, 24, 32, 0.1), 0 8px 10px -6px rgba(16, 24, 32, 0.06)',
        'card-hover': '0 12px 24px -2px rgba(16, 24, 32, 0.12)',
        'glow-brand': '0 0 16px rgba(22, 139, 255, 0.5), 0 0 30px rgba(22, 139, 255, 0.25)',
        'glow-crimson': '0 0 16px rgba(239, 68, 68, 0.5), 0 0 32px rgba(239, 68, 68, 0.25)',
        'glow-indigo': '0 0 16px rgba(22, 139, 255, 0.4), 0 0 28px rgba(22, 139, 255, 0.2)',
        'glow-rose': '0 0 16px rgba(239, 68, 68, 0.4), 0 0 28px rgba(239, 68, 68, 0.2)',
        'glow-cyan': '0 0 16px rgba(22, 139, 255, 0.5), 0 0 32px rgba(22, 139, 255, 0.25)',
        'dock': '0 16px 40px -8px rgba(0, 0, 0, 0.65), 0 0 24px rgba(22, 139, 255, 0.18)',
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
