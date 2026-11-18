import type { MatchResult } from '../contracts.js';

/** Canonical names for common spelling variants (applied after folding). */
const ALIASES: Record<string, string> = {
  js: 'javascript',
  'java script': 'javascript',
  ts: 'typescript',
  node: 'node.js',
  nodejs: 'node.js',
  'node js': 'node.js',
  reactjs: 'react',
  'react.js': 'react',
  'react js': 'react',
  vuejs: 'vue',
  'vue.js': 'vue',
  'next.js': 'nextjs',
  'next js': 'nextjs',
  postgres: 'postgresql',
  psql: 'postgresql',
  k8s: 'kubernetes',
  golang: 'go',
  'c sharp': 'c#',
  csharp: 'c#',
  'amazon web services': 'aws',
  gcp: 'google cloud',
  'ms excel': 'excel',
  'microsoft excel': 'excel',
  'ingles': 'english',
};

const MAX_SKILL_LENGTH = 40;

/** Lowercase, strip accents, collapse whitespace and resolve aliases. */
export function normalizeSkill(raw: string): string {
  const folded = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SKILL_LENGTH);
  return ALIASES[folded] ?? folded;
}

/** Normalize, de-duplicate and drop empty values while keeping first-seen order. */
export function normalizeSkills(values: Iterable<string>, limit = 40): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const skill = normalizeSkill(value);
    if (skill && !seen.has(skill)) seen.add(skill);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

/**
 * Affinity between a job and a candidate, based on required-skill coverage.
 * Deliberately transparent: candidates and recruiters see exactly which
 * skills matched and which are missing. Jobs without skills score neutral.
 */
export function computeMatch(jobSkills: string[], candidateSkills: string[]): MatchResult {
  const required = normalizeSkills(jobSkills);
  const owned = new Set(normalizeSkills(candidateSkills, 200));
  if (required.length === 0) {
    return { score: 50, matchedSkills: [], missingSkills: [] };
  }
  const matchedSkills = required.filter((skill) => owned.has(skill));
  const missingSkills = required.filter((skill) => !owned.has(skill));
  const score = Math.round((matchedSkills.length / required.length) * 100);
  return { score, matchedSkills, missingSkills };
}
