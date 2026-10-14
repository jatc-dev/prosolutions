type RecommendationPriority = 'high' | 'medium' | 'low';

interface ATSRecommendation {
  id: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  section: 'general' | 'personal' | 'experience' | 'education' | 'skills' | 'keywords';
}

interface ATSSectionScores {
  completeness: number;
  keywordMatch: number;
  impact: number;
  clarity: number;
}

export interface TailoredExperienceSuggestion {
  id?: string;
  index: number;
  original: string;
  tailored: string;
}

export interface ATSTailoringResult {
  summary: string;
  experience: TailoredExperienceSuggestion[];
  insertedKeywords: string[];
}

export interface ATSAnalysisResult {
  score: number;
  sections: ATSSectionScores;
  keywordCoverage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendations: ATSRecommendation[];
  highlights: string[];
}

const STOP_WORDS = new Set([
  'about',
  'above',
  'after',
  'again',
  'against',
  'algo',
  'algunos',
  'and',
  'any',
  'are',
  'area',
  'back',
  'been',
  'before',
  'being',
  'below',
  'between',
  'both',
  'cada',
  'como',
  'con',
  'could',
  'desde',
  'donde',
  'during',
  'each',
  'ellos',
  'ellas',
  'entre',
  'este',
  'esta',
  'esto',
  'for',
  'from',
  'fue',
  'had',
  'has',
  'have',
  'having',
  'her',
  'here',
  'hers',
  'him',
  'his',
  'how',
  'into',
  'itself',
  'just',
  'las',
  'les',
  'los',
  'more',
  'most',
  'muy',
  'need',
  'nuestra',
  'nuestro',
  'only',
  'otra',
  'otro',
  'ours',
  'para',
  'pero',
  'por',
  'que',
  'same',
  'should',
  'sobre',
  'some',
  'such',
  'than',
  'that',
  'their',
  'theirs',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'todo',
  'todos',
  'under',
  'very',
  'want',
  'well',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'with',
  'would',
  'your',
  'yours',
]);

const ACTION_VERBS = [
  'achieved',
  'improved',
  'increased',
  'decreased',
  'optimized',
  'led',
  'managed',
  'designed',
  'developed',
  'implemented',
  'created',
  'delivered',
  'built',
  'reduced',
  'grew',
  'launched',
  'automated',
  'analyzed',
  'coordinated',
  'mentored',
  'dirigi',
  'lider',
  'gestione',
  'desarrolle',
  'implemente',
  'optimice',
  'aumente',
  'reduje',
  'mejore',
  'cree',
  'disene',
  'coordine',
  'entregue',
];

const SKILL_HINTS = [
  'javascript',
  'typescript',
  'node',
  'react',
  'angular',
  'vue',
  'python',
  'java',
  'c#',
  'c++',
  'sql',
  'postgres',
  'mysql',
  'mongodb',
  'redis',
  'docker',
  'kubernetes',
  'aws',
  'azure',
  'gcp',
  'git',
  'linux',
  'ci/cd',
  'terraform',
  'prisma',
  'tailwind',
  'express',
  'graphql',
  'rest',
  'api',
  'agile',
  'scrum',
  'kanban',
  'figma',
  'seo',
  'analytics',
  'tableau',
  'power bi',
  'excel',
  'salesforce',
  'sap',
  'machine learning',
  'ai',
  'llm',
];

type NormalizedCV = {
  role: string;
  summary: string;
  experienceCount: number;
  educationCount: number;
  skills: string[];
  experienceDescriptions: string[];
  linksCount: number;
  certificatesCount: number;
};

type ExperienceItem = {
  id?: string;
  description: string;
};

function normalizeCVData(data: any): NormalizedCV {
  const personal = data?.personal || {};
  const experience = Array.isArray(data?.experience) ? data.experience : [];
  const education = Array.isArray(data?.education) ? data.education : [];
  const skills = Array.isArray(data?.skills) ? data.skills : [];
  const links = Array.isArray(data?.links)
    ? data.links
    : data?.links && typeof data.links === 'object'
      ? Object.keys(data.links).map(label => ({ label, url: data.links[label] }))
      : [];
  const certificates = Array.isArray(data?.certificates) ? data.certificates : [];

  const experienceDescriptions = experience.flatMap((item: any) => {
    const description = String(item?.description || '').trim();
    const achievements = Array.isArray(item?.achievements)
      ? item.achievements.map((a: unknown) => String(a || ''))
      : [];
    return [description, ...achievements].filter(Boolean);
  });

  const skillNames = skills
    .map((item: any) => String(item?.name || item?.skill || '').trim())
    .filter((value: string) => value.length > 0);

  return {
    role: String(personal.professionalTitle || personal.role || '').trim(),
    summary: String(personal.summary || '').trim(),
    experienceCount: experience.length,
    educationCount: education.length,
    skills: skillNames,
    experienceDescriptions,
    linksCount: links.length,
    certificatesCount: certificates.length,
  };
}

function getKeywordCandidates(jobDescription: string): string[] {
  const tokens = jobDescription.toLowerCase().match(/[a-z0-9+#]{3,}/g) || [];

  const frequency = new Map<string, number>();
  for (const token of tokens) {
    if (STOP_WORDS.has(token)) {
      continue;
    }
    frequency.set(token, (frequency.get(token) || 0) + 1);
  }

  const hintedSkills = SKILL_HINTS.filter(skill => jobDescription.toLowerCase().includes(skill));
  hintedSkills.forEach(skill => frequency.set(skill, Math.max(frequency.get(skill) || 0, 2)));

  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([keyword]) => keyword);
}

function extractExperienceItems(data: any): ExperienceItem[] {
  const experience = Array.isArray(data?.experience) ? data.experience : [];
  return experience.map((item: any, index: number) => ({
    id: item?.id || `exp-${index}`,
    description: String(item?.description || '').trim(),
  }));
}

function normalizeKeyword(keyword: string): string {
  return String(keyword || '')
    .trim()
    .toLowerCase();
}

function buildTailoredSummary(summary: string, role: string, keywords: string[]): string {
  const compactKeywords = keywords.slice(0, 4);
  const keywordLine =
    compactKeywords.length > 0 ? `Especializado en ${compactKeywords.join(', ')}.` : '';

  if (summary && keywordLine) {
    return `${summary} ${keywordLine}`.trim();
  }

  if (summary) {
    return summary;
  }

  if (!role && compactKeywords.length === 0) {
    return 'Profesional orientado a resultados con foco en ejecucion y mejora continua.';
  }

  return [
    role ? `Profesional ${role}` : 'Profesional orientado a resultados',
    keywordLine || 'con experiencia en entornos dinamicos y colaborativos.',
  ]
    .join(' ')
    .trim();
}

function buildTailoredExperience(
  items: ExperienceItem[],
  keywords: string[],
): TailoredExperienceSuggestion[] {
  const normalizedKeywords = keywords.map(normalizeKeyword).filter(Boolean);

  return items.map((item, index) => {
    const base = item.description || 'Responsable de ejecutar objetivos clave del rol.';
    const lowerBase = base.toLowerCase();
    const missingKeywords = normalizedKeywords.filter(keyword => !lowerBase.includes(keyword));
    const attach = missingKeywords.slice(0, 2);

    if (attach.length === 0) {
      return {
        id: item.id,
        index,
        original: base,
        tailored: base,
      };
    }

    const suffix = ` Enfoque ATS: ${attach.join(', ')}.`;
    return {
      id: item.id,
      index,
      original: base,
      tailored: `${base}${suffix}`,
    };
  });
}

function buildCVText(normalized: NormalizedCV): string {
  return [
    normalized.role,
    normalized.summary,
    normalized.skills.join(' '),
    normalized.experienceDescriptions.join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

function computeCompletenessScore(normalized: NormalizedCV): number {
  let points = 0;
  if (normalized.role.length >= 3) points += 4;
  if (normalized.summary.length >= 50) points += 6;
  if (normalized.experienceCount > 0) points += 8;
  if (normalized.educationCount > 0) points += 4;
  if (normalized.skills.length >= 5) points += 6;
  if (normalized.linksCount > 0 || normalized.certificatesCount > 0) points += 2;
  return Math.min(points, 30);
}

function computeImpactScore(normalized: NormalizedCV): number {
  if (normalized.experienceDescriptions.length === 0) {
    return 0;
  }

  const content = normalized.experienceDescriptions.join(' \n ').toLowerCase();
  const quantifiedMatches = content.match(/(\d+%|\$\s?\d+|\d+\s?(k|m|b)?\+?)/g) || [];
  const verbMatches = ACTION_VERBS.filter(verb => content.includes(verb)).length;

  const quantifiedScore = Math.min(12, quantifiedMatches.length * 2);
  const verbScore = Math.min(8, verbMatches);
  return Math.min(20, quantifiedScore + verbScore);
}

function computeClarityScore(normalized: NormalizedCV): number {
  let score = 0;

  if (normalized.summary.length >= 50 && normalized.summary.length <= 350) {
    score += 8;
  } else if (normalized.summary.length > 0) {
    score += 4;
  }

  const avgDescLength = normalized.experienceDescriptions.length
    ? normalized.experienceDescriptions.reduce((sum, text) => sum + text.length, 0) /
      normalized.experienceDescriptions.length
    : 0;

  if (avgDescLength > 30 && avgDescLength < 260) {
    score += 8;
  } else if (avgDescLength > 0) {
    score += 4;
  }

  if (normalized.skills.length >= 5) {
    score += 4;
  } else if (normalized.skills.length > 0) {
    score += 2;
  }

  return Math.min(20, score);
}

export class ATSService {
  static extractKeywords(jobDescription: string): string[] {
    return getKeywordCandidates(jobDescription || '');
  }

  static analyzeCV(data: any, jobDescription: string): ATSAnalysisResult {
    const normalized = normalizeCVData(data);
    const cvText = buildCVText(normalized);

    const keywords = getKeywordCandidates(jobDescription || '');
    const matchedKeywords = keywords.filter(keyword => cvText.includes(keyword));
    const missingKeywords = keywords.filter(keyword => !cvText.includes(keyword));

    const keywordCoverage =
      keywords.length > 0 ? Math.round((matchedKeywords.length / keywords.length) * 100) : 0;

    const completeness = computeCompletenessScore(normalized);
    const keywordMatch = Math.round((keywordCoverage / 100) * 30);
    const impact = computeImpactScore(normalized);
    const clarity = computeClarityScore(normalized);

    const totalScore = Math.max(0, Math.min(100, completeness + keywordMatch + impact + clarity));

    const recommendations: ATSRecommendation[] = [];
    if (!normalized.role) {
      recommendations.push({
        id: 'missing-role',
        title: 'Define un titulo profesional claro',
        description:
          'Agrega un titulo profesional especifico para que el ATS clasifique mejor tu perfil.',
        priority: 'high',
        section: 'personal',
      });
    }

    if (keywordCoverage < 45 && keywords.length > 0) {
      recommendations.push({
        id: 'keyword-gap',
        title: 'Incrementa cobertura de keywords',
        description: `Incorpora al menos ${Math.min(8, missingKeywords.length)} keywords relevantes de la vacante en resumen, experiencia y skills.`,
        priority: 'high',
        section: 'keywords',
      });
    }

    if (normalized.experienceCount === 0) {
      recommendations.push({
        id: 'missing-experience',
        title: 'Completa la seccion de experiencia',
        description:
          'Anade experiencia laboral o proyectos relevantes para mejorar el filtrado ATS.',
        priority: 'high',
        section: 'experience',
      });
    }

    if (impact < 8) {
      recommendations.push({
        id: 'quantify-impact',
        title: 'Incluye logros medibles',
        description:
          'Usa metricas (% , montos o volumenes) en tus bullets para aumentar la fuerza del CV.',
        priority: 'medium',
        section: 'experience',
      });
    }

    if (normalized.skills.length < 5) {
      recommendations.push({
        id: 'expand-skills',
        title: 'Amplia skills relevantes',
        description: 'Incluye habilidades tecnicas y funcionales vinculadas al rol objetivo.',
        priority: 'medium',
        section: 'skills',
      });
    }

    if (normalized.summary.length < 50) {
      recommendations.push({
        id: 'summary-strength',
        title: 'Fortalece el resumen profesional',
        description:
          'Escribe un resumen de 3-5 lineas con rol, anos de experiencia, especialidad y resultados.',
        priority: 'medium',
        section: 'personal',
      });
    }

    const highlights: string[] = [];
    if (normalized.experienceCount > 0)
      highlights.push(`Experiencia registrada: ${normalized.experienceCount} entradas`);
    if (normalized.skills.length > 0)
      highlights.push(`Skills registradas: ${normalized.skills.length}`);
    if (matchedKeywords.length > 0)
      highlights.push(`Keywords alineadas: ${matchedKeywords.slice(0, 6).join(', ')}`);

    return {
      score: totalScore,
      sections: {
        completeness,
        keywordMatch,
        impact,
        clarity,
      },
      keywordCoverage,
      matchedKeywords,
      missingKeywords,
      recommendations,
      highlights,
    };
  }

  static tailorCV(data: any, jobDescription: string): ATSTailoringResult {
    const normalized = normalizeCVData(data);
    const keywords = getKeywordCandidates(jobDescription || '');
    const summary = buildTailoredSummary(normalized.summary, normalized.role, keywords);
    const experienceItems = extractExperienceItems(data);
    const tailoredExperience = buildTailoredExperience(experienceItems, keywords);

    const insertedKeywords = keywords
      .filter(keyword => {
        const block =
          `${summary} ${tailoredExperience.map(item => item.tailored).join(' ')}`.toLowerCase();
        return block.includes(keyword.toLowerCase());
      })
      .slice(0, 12);

    return {
      summary,
      experience: tailoredExperience,
      insertedKeywords,
    };
  }
}
