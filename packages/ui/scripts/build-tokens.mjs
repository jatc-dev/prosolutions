#!/usr/bin/env node
/**
 * Generates src/theme.css from src/tokens.json (the design-system source of truth).
 *   node scripts/build-tokens.mjs          write theme.css
 *   node scripts/build-tokens.mjs --check  fail if theme.css is out of date (CI)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../src/', import.meta.url);
const tokens = JSON.parse(readFileSync(new URL('tokens.json', root), 'utf8'));

const vars = (scheme) =>
  Object.entries(tokens.semantic[scheme])
    .map(([name, value]) => `  --ui-${name}: ${value};`)
    .join('\n');

/** "#rrggbb" -> "r g b", so Tailwind can apply opacity (bg-slate-900/50). */
const channels = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const slateVars = (ramp) =>
  Object.entries(ramp)
    .filter(([step]) => step !== '0')
    .map(([step, value]) => `  --ui-slate-${step}: ${channels(value)};`)
    .join('\n');

const css = `/* GENERATED from tokens.json by scripts/build-tokens.mjs. Do not edit by hand. */
:root {
  color-scheme: light;
${vars('light')}
${slateVars(tokens.palette.neutral)}
  --ui-radius-sm: ${tokens.radius.sm};
  --ui-radius-md: ${tokens.radius.md};
  --ui-radius-lg: ${tokens.radius.lg};
  --ui-radius-xl: ${tokens.radius.xl};
  --ui-font-sans: ${tokens.font.sans};
  --ui-font-mono: ${tokens.font.mono};
  --ui-motion-fast: ${tokens.motion.fast};
  --ui-motion-base: ${tokens.motion.base};
  --ui-motion-slow: ${tokens.motion.slow};
  --ui-easing: ${tokens.motion.easing};
}

.dark,
[data-theme="dark"] {
  color-scheme: dark;
${vars('dark')}
${slateVars(tokens.palette.neutralDark)}
}

/* Printed documents (CV templates, cover letters, PDF export) are paper, not
   app chrome: in every theme they use the light tokens, the standard neutral
   ramp and the light text colour, so nothing inherits the dark theme. */
.ui-print {
  color-scheme: light;
${vars('light')}
${slateVars(tokens.palette.neutral)}
  color: var(--ui-text);
}

html {
  font-family: var(--ui-font-sans);
  font-feature-settings: "cv11", "ss01";
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-color: var(--ui-bg);
  color: var(--ui-text);
}

.tabular-nums,
[data-numeric] {
  font-variant-numeric: tabular-nums;
}

:focus-visible {
  outline: 2px solid var(--ui-focus);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
`;

const target = fileURLToPath(new URL('theme.css', root));
if (process.argv.includes('--check')) {
  const current = readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
  if (current !== css) {
    console.error('packages/ui/src/theme.css is out of date. Run: npm run build:tokens --workspace=packages/ui');
    process.exit(1);
  }
  console.log('theme.css matches tokens.json');
} else {
  writeFileSync(target, css);
  console.log('theme.css generated from tokens.json');
}
