/** @type {import('tailwindcss').Config} */
// Paleta base: #DAD7CD, #A3B18A, #588157, #3A5A40, #344E41.
// Se generó una escala completa (50-950) interpolando los tonos base para
// obtener contrastes AA/AAA. Ej.: moss-800 sobre moss-200 ≈ 6.3:1,
// blanco sobre moss-600 ≈ 4.6:1, blanco sobre moss-700 ≈ 7.4:1.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        timberwolf: '#DAD7CD',
        sage: '#A3B18A',
        fern: '#588157',
        hunter: '#3A5A40',
        brunswick: '#344E41',
        moss: {
          50: '#f6f6f2',
          100: '#ecebe4',
          200: '#DAD7CD',
          300: '#c0c8ab',
          400: '#A3B18A',
          500: '#7a9868',
          600: '#588157',
          700: '#3A5A40',
          800: '#344E41',
          900: '#263a30',
          950: '#18251e',
        },
        // Semánticos armonizados (tonos terrosos desaturados) que mantienen
        // la identidad visual sin romper la accesibilidad.
        danger: {
          50: '#fbf2ef',
          100: '#f5ddd6',
          200: '#ebbcae',
          500: '#c0583f',
          600: '#a6452f',
          700: '#863625',
        },
        warning: {
          50: '#fcf8ea',
          100: '#f6eac4',
          200: '#ecd58a',
          500: '#c9962a',
          600: '#a5781b',
          700: '#7f5c14',
        },
        info: {
          50: '#eef5f6',
          100: '#d5e7ea',
          200: '#acd0d6',
          500: '#4b8494',
          600: '#3c6c7a',
          700: '#2e535e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(24,37,30,0.06), 0 4px 16px -4px rgba(24,37,30,0.10)',
        lift: '0 2px 4px rgba(24,37,30,0.06), 0 16px 40px -12px rgba(24,37,30,0.25)',
        glow: '0 0 0 4px rgba(88,129,87,0.18)',
      },
      borderRadius: {
        xl2: '1.125rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': {
          from: { opacity: 0, transform: 'translateY(12px) scale(0.98)' },
          to: { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: 0, transform: 'translateX(24px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        shrink: { from: { width: '100%' }, to: { width: '0%' } },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(88,129,87,0.55)' },
          '100%': { boxShadow: '0 0 0 10px rgba(88,129,87,0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
        'slide-up': 'slide-up 260ms cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-right': 'slide-in-right 300ms cubic-bezier(0.16,1,0.3,1) both',
        shimmer: 'shimmer 1.4s linear infinite',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
