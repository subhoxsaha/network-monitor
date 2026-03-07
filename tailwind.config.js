import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          light: 'var(--color-surface-light)',
          lighter: 'var(--color-surface-lighter)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          secondary: 'var(--color-ink-secondary)',
          tertiary: 'var(--color-ink-tertiary)',
          quaternary: 'var(--color-ink-quaternary)',
        },
        accent: {
          primary: 'var(--color-accent)',
          secondary: 'var(--color-accent)',
          danger: 'var(--color-accent)',
          info: 'var(--color-accent)',
          success: 'var(--color-accent)',
          warning: 'var(--color-accent)',
        },
        border: 'var(--color-border)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        serif: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px', letterSpacing: '-0.01em' }],
        sm: ['13px', { lineHeight: '18px', letterSpacing: '-0.01em' }],
        base: ['15px', { lineHeight: '22px', letterSpacing: '-0.01em' }],
        lg: ['17px', { lineHeight: '24px', letterSpacing: '-0.015em' }],
        xl: ['20px', { lineHeight: '28px', letterSpacing: '-0.02em' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
        '3xl': ['28px', { lineHeight: '36px', letterSpacing: '-0.025em' }],
        '4xl': ['34px', { lineHeight: '40px', letterSpacing: '-0.03em' }],
        '5xl': ['48px', { lineHeight: '52px', letterSpacing: '-0.03em' }],
      },
      animation: {
        breathe: 'breathe 3s ease-in-out infinite',
        'rise-in': 'riseIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        spin: 'spin 1s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px var(--glow-color)' },
          '50%': { boxShadow: '0 0 30px var(--glow-color-strong)' },
        },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-lg': 'var(--shadow-card-lg)',
        glow: '0 0 20px var(--glow-color)',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
      },
    },
  },
  plugins: [
    forms,
    typography,
  ],
}
