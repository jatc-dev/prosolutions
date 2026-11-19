#!/usr/bin/env node
/**
 * Design-system guard: UI code must use the shared palette (brand, slate, ui-*
 * semantic tokens, plus status hues). Raw palettes that previously made the
 * apps look like different products are rejected in CI.
 *   node packages/ui/scripts/check-palette.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['apps/core/src', 'apps/projobs/src', 'apps/procv/frontend/src', 'packages/ui/src'];
const FORBIDDEN = ['blue', 'gray', 'indigo', 'sky', 'emerald', 'zinc', 'neutral', 'stone', 'purple', 'cyan', 'teal', 'lime', 'fuchsia', 'pink'];
const PREFIX = '(?:bg|text|border|border-[trblxy]|from|via|to|ring|ring-offset|divide|outline|fill|stroke|placeholder|accent|caret|decoration|shadow)';
const pattern = new RegExp(`(?<![\w-])${PREFIX}-(${FORBIDDEN.join('|')})-(?:50|[1-9]00|950)(?![\w-])`, 'g');

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(tsx?|css)$/.test(name)) yield path;
  }
}

const problems = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const match of line.matchAll(pattern)) problems.push(`${relative('.', file)}:${index + 1}  ${match[0]}`);
    });
  }
}

if (problems.length) {
  console.error(`Raw palette classes found (use brand-*, slate-* or ui-* tokens):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('Palette check passed: only design-system colors are used.');
