/**
 * Shared Tailwind preset for every ProSolutions frontend.
 * Colors, fonts, radii and shadows come from src/tokens.json; apps must not
 * redefine them locally (see BRAND_AND_DESIGN_SYSTEM.md).
 */
import { readFileSync } from 'node:fs';

const tokens = JSON.parse(readFileSync(new URL('./src/tokens.json', import.meta.url), 'utf8'));
const cssVar = (name) => `var(--ui-${name})`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: tokens.palette.brand,
        // Neutral ramp through CSS variables (theme.css): Tailwind's cool slate
        // in light mode, neutral dark greys (zinc-like) in dark mode, and the
        // standard slate again inside printed documents (.ui-print).
        slate: Object.fromEntries(
          Object.keys(tokens.palette.neutral)
            .filter((step) => step !== '0')
            .map((step) => [step, `rgb(var(--ui-slate-${step}) / <alpha-value>)`]),
        ),
        ui: {
          bg: cssVar('bg'),
          surface: cssVar('surface'),
          soft: cssVar('surface-soft'),
          raised: cssVar('surface-raised'),
          floating: cssVar('surface-floating'),
          border: cssVar('border'),
          'border-strong': cssVar('border-strong'),
          text: cssVar('text'),
          muted: cssVar('text-muted'),
          subtle: cssVar('text-subtle'),
          accent: cssVar('accent'),
          'accent-hover': cssVar('accent-hover'),
          'accent-soft': cssVar('accent-soft'),
          'on-accent': cssVar('on-accent'),
          focus: cssVar('focus'),
          success: cssVar('success'),
          warning: cssVar('warning'),
          danger: cssVar('danger'),
          info: cssVar('info'),
        },
      },
      fontFamily: {
        sans: tokens.font.sans.split(',').map((family) => family.trim().replace(/^"|"$/g, '')),
        mono: tokens.font.mono.split(',').map((family) => family.trim().replace(/^"|"$/g, '')),
      },
      borderRadius: {
        'ui-sm': cssVar('radius-sm'),
        'ui-md': cssVar('radius-md'),
        'ui-lg': cssVar('radius-lg'),
        'ui-xl': cssVar('radius-xl'),
        card: cssVar('radius-lg'),
        panel: cssVar('radius-xl'),
      },
      boxShadow: {
        sm: cssVar('shadow-sm'),
        md: cssVar('shadow-md'),
        lg: cssVar('shadow-floating'),
        xl: cssVar('shadow-floating'),
        '2xl': cssVar('shadow-floating'),
        card: cssVar('shadow-sm'),
        panel: cssVar('shadow-md'),
        floating: cssVar('shadow-floating'),
      },
      transitionTimingFunction: {
        ui: tokens.motion.easing,
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
};

export { tokens };
