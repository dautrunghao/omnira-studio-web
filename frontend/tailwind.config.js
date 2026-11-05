/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter Variable'", "'Inter'", 'system-ui', '-apple-system', 'sans-serif'],
        mono: ["'JetBrains Mono Variable'", "'JetBrains Mono'", 'ui-monospace', 'monospace'],
        display: ["'Space Grotesk Variable'", "'Inter Variable'", 'sans-serif'],
      },
      colors: {
        background: 'rgb(var(--c-surface) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--c-surface) / <alpha-value>)',
          dim: 'rgb(var(--c-surface-dim) / <alpha-value>)',
          bright: 'rgb(var(--c-surface-bright) / <alpha-value>)',
          'container-lowest': 'rgb(var(--c-surface-container-lowest) / <alpha-value>)',
          'container-low': 'rgb(var(--c-surface-container-low) / <alpha-value>)',
          container: 'rgb(var(--c-surface-container) / <alpha-value>)',
          'container-high': 'rgb(var(--c-surface-container-high) / <alpha-value>)',
          'container-highest': 'rgb(var(--c-surface-container-highest) / <alpha-value>)',
          variant: 'rgb(var(--c-surface-variant) / <alpha-value>)',
        },
        'on-surface': {
          DEFAULT: 'rgb(var(--c-on-surface) / <alpha-value>)',
          variant: 'rgb(var(--c-on-surface-variant) / <alpha-value>)',
        },
        'inverse-surface': 'rgb(var(--c-inverse-surface) / <alpha-value>)',
        'inverse-on-surface': 'rgb(var(--c-inverse-on-surface) / <alpha-value>)',
        outline: {
          DEFAULT: 'rgb(var(--c-outline) / <alpha-value>)',
          variant: 'rgb(var(--c-outline-variant) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)',
          container: 'rgb(var(--c-primary-container) / <alpha-value>)',
        },
        'on-primary': {
          DEFAULT: 'rgb(var(--c-on-primary) / <alpha-value>)',
          container: 'rgb(var(--c-on-primary-container) / <alpha-value>)',
        },
        'inverse-primary': 'rgb(var(--c-inverse-primary) / <alpha-value>)',
        secondary: {
          DEFAULT: 'rgb(var(--c-secondary) / <alpha-value>)',
          container: 'rgb(var(--c-secondary-container) / <alpha-value>)',
        },
        'on-secondary': {
          DEFAULT: 'rgb(var(--c-on-secondary) / <alpha-value>)',
          container: 'rgb(var(--c-on-secondary-container) / <alpha-value>)',
        },
        tertiary: {
          DEFAULT: 'rgb(var(--c-tertiary) / <alpha-value>)',
          container: 'rgb(var(--c-tertiary-container) / <alpha-value>)',
        },
        'on-tertiary': {
          DEFAULT: 'rgb(var(--c-on-tertiary) / <alpha-value>)',
          container: 'rgb(var(--c-on-tertiary-container) / <alpha-value>)',
        },
        error: {
          DEFAULT: 'rgb(var(--c-error) / <alpha-value>)',
          container: 'rgb(var(--c-error-container) / <alpha-value>)',
        },
        'on-error': {
          DEFAULT: 'rgb(var(--c-on-error) / <alpha-value>)',
          container: 'rgb(var(--c-on-error-container) / <alpha-value>)',
        },
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        overlay: 'rgb(var(--c-overlay) / <alpha-value>)',
        brand: {
          facebook: 'rgb(var(--c-brand-facebook) / <alpha-value>)',
          tiktok: 'rgb(var(--c-brand-tiktok) / <alpha-value>)',
          'tiktok-cyan': 'rgb(var(--c-brand-tiktok-cyan) / <alpha-value>)',
          'tiktok-red': 'rgb(var(--c-brand-tiktok-red) / <alpha-value>)',
          youtube: 'rgb(var(--c-brand-youtube) / <alpha-value>)',
        },
        series: {
          facebook: 'rgb(var(--c-series-facebook) / <alpha-value>)',
          tiktok: 'rgb(var(--c-series-tiktok) / <alpha-value>)',
          instagram: 'rgb(var(--c-series-instagram) / <alpha-value>)',
          youtube: 'rgb(var(--c-series-youtube) / <alpha-value>)',
        },
      },
      spacing: {
        'space-xs': '0.375rem',
        'space-sm': '0.625rem',
        'space-md': '1rem',
        'space-lg': '1.25rem',
        'space-xl': '1.75rem',
        gutter: '1.25rem',
      },
      fontSize: {
        display: ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em', fontWeight: '700' }],
        'headline-lg': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em', fontWeight: '650' }],
        'headline-sm': ['1.0625rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'title-lg': ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'title-md': ['1rem', { lineHeight: '1.45rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'title-sm': ['0.9375rem', { lineHeight: '1.35rem', letterSpacing: '-0.005em', fontWeight: '600' }],
        'body-lg': ['0.9375rem', { lineHeight: '1.5rem' }],
        'body-md': ['0.875rem', { lineHeight: '1.35rem' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '0.005em' }],
        'label-lg': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '600' }],
        'label-md': ['0.8125rem', { lineHeight: '1.15rem', letterSpacing: '0.01em', fontWeight: '600' }],
        'label-sm': ['0.71875rem', { lineHeight: '1rem', letterSpacing: '0.02em', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};
