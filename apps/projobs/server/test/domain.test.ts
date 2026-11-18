import { describe, expect, it } from 'vitest';
import { contextSettingsSql } from '../src/db/database.js';
import { computeMatch, normalizeSkill, normalizeSkills } from '../src/domain/skills.js';
import { slugify, toPrefixTsQuery } from '../src/domain/text.js';
import { toCandidateProfile } from '../src/integrations/procv.js';

describe('skills', () => {
  it('folds case, accents and aliases', () => {
    expect(normalizeSkill('  ReactJS ')).toBe('react');
    expect(normalizeSkill('Node JS')).toBe('node.js');
    expect(normalizeSkill('Diseño   UX')).toBe('diseno ux');
    expect(normalizeSkills(['TS', 'typescript', '', 'Postgres'])).toEqual(['typescript', 'postgresql']);
  });

  it('scores coverage of required skills transparently', () => {
    expect(computeMatch(['react', 'typescript', 'graphql', 'css'], ['React', 'TS', 'Figma'])).toEqual({
      score: 50,
      matchedSkills: ['react', 'typescript'],
      missingSkills: ['graphql', 'css'],
    });
    expect(computeMatch([], ['react']).score).toBe(50);
    expect(computeMatch(['go'], []).score).toBe(0);
  });
});

describe('text', () => {
  it('builds injection-safe prefix tsqueries', () => {
    expect(toPrefixTsQuery('Desarrollador React')).toBe('desarrollador:* & react:*');
    expect(toPrefixTsQuery("análisis' | !drop")).toBe('analisis:* & drop:*');
    expect(toPrefixTsQuery('  &|!  ')).toBeNull();
  });

  it('slugifies accented titles', () => {
    expect(slugify('Diseñador/a UX Señor!')).toBe('disenador-a-ux-senor');
  });
});

describe('database context', () => {
  it('inlines only validated identifiers', () => {
    expect(contextSettingsSql({ userId: 'user_1' }, 'projobs_api')).toBe(
      "SELECT set_config('role', 'projobs_api', true), set_config('projobs.user_id', 'user_1', true)",
    );
    expect(() => contextSettingsSql({ userId: "x'; DROP TABLE jobs; --" }, null)).toThrow();
    expect(() => contextSettingsSql({ userId: null }, 'bad role')).toThrow();
  });
});

describe('ProCV mapping', () => {
  it('maps a ProCV CV document into an application snapshot', () => {
    const profile = toCandidateProfile({
      personal: {
        fullName: 'Luis Gómez',
        professionalTitle: 'Backend Engineer',
        summary: 'APIs y datos',
        city: 'Lima',
        country: 'Perú',
        emails: [{ value: 'old@example.com' }, { value: 'luis@example.com', isPrimary: true }],
        phones: [{ number: '+51 999', isVisible: false }],
        linkedin: 'https://linkedin.com/in/luis',
        github: 'javascript:alert(1)',
      },
      skills: [{ name: 'Node JS' }, { name: 'PostgreSQL' }, { name: 'Oculta', isVisible: false }],
      experience: [{ position: 'Dev', company: 'X', technologies: ['Docker'], isCurrentPosition: true }],
      links: [{ label: 'Blog', url: 'https://luis.dev', isVisible: true }],
    });
    expect(profile.fullName).toBe('Luis Gómez');
    expect(profile.email).toBe('luis@example.com');
    expect(profile.phone).toBeNull();
    expect(profile.location).toBe('Lima, Perú');
    expect(profile.skills).toEqual(['node.js', 'postgresql', 'docker']);
    expect(profile.links).toEqual([
      { label: 'linkedin', url: 'https://linkedin.com/in/luis' },
      { label: 'Blog', url: 'https://luis.dev' },
    ]);
    expect(toCandidateProfile(null).fullName).toBe('Candidato');
  });
});
