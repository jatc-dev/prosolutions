import { pathToFileURL } from 'node:url';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

PDFParse.setWorker(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href);

type ParsedDraft = {
  personal: {
    fullName?: string;
    professionalTitle?: string;
    summary?: string;
    address?: string;
    website?: string;
    linkedin?: string;
    github?: string;
    emails?: Array<{
      value: string;
      type: 'personal' | 'work';
      label: string;
      isPrimary?: boolean;
    }>;
    phones?: Array<{
      number: string;
      type: 'personal' | 'office' | 'whatsapp';
      label?: string;
      isPrimary?: boolean;
    }>;
  };
  experience: Array<{
    position: string;
    company: string;
    description: string;
    location?: string;
    employmentType: 'full-time';
    isCurrentPosition: boolean;
    startDate: string;
    endDate?: string;
    achievements: string[];
    technologies: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    fieldOfStudy: string;
    isCurrentlyStudying: boolean;
    startDate: string;
    endDate?: string;
    location?: string;
    activities: string[];
    achievements: string[];
  }>;
  skills: Array<{
    name: string;
    category: 'technical';
    level: 'intermediate';
    isCertified: boolean;
  }>;
  languages: Array<{
    language: string;
    listeningLevel: 'B1';
    readingLevel: 'B1';
    speakingLevel: 'B1';
    writingLevel: 'B1';
  }>;
  certificates: Array<{
    title: string;
    issuingOrganization: string;
    issueDate: string;
  }>;
  links: Array<{ label: string; url: string; type: 'other'; isVisible: true }>;
};

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const SECTION_MARKERS = {
  experience: [
    'experience',
    'work experience',
    'professional experience',
    'experiencia',
    'experiencia laboral',
  ],
  education: ['education', 'academic', 'educacion', 'formacion'],
  skills: ['skills', 'technical skills', 'habilidades', 'competencias'],
  languages: ['languages', 'idiomas', 'language proficiency'],
  certificates: ['certifications', 'certificates', 'certificaciones', 'certificados'],
  summary: ['summary', 'profile', 'professional summary', 'resumen', 'perfil', 'acerca de'],
};

const LANGUAGE_CANDIDATES = [
  'english',
  'spanish',
  'french',
  'german',
  'italian',
  'portuguese',
  'mandarin',
  'japanese',
  'korean',
  'arabic',
  'russian',
  'ingles',
  'espanol',
  'frances',
  'aleman',
  'italiano',
  'portugues',
  'chino',
  'japones',
  'coreano',
  'arabe',
  'ruso',
];

function normalizeText(text: string): string {
  return text
    .replace(/\0/g, '')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function findSectionBounds(
  text: string,
): Array<{ key: keyof typeof SECTION_MARKERS; index: number }> {
  const lower = text.toLowerCase();
  const entries: Array<{ key: keyof typeof SECTION_MARKERS; index: number }> = [];

  (Object.keys(SECTION_MARKERS) as Array<keyof typeof SECTION_MARKERS>).forEach(key => {
    for (const marker of SECTION_MARKERS[key]) {
      const idx = lower.indexOf(`\n${marker}`);
      if (idx >= 0) {
        entries.push({ key, index: idx });
        break;
      }
    }
  });

  return entries.sort((a, b) => a.index - b.index);
}

function extractSectionText(text: string, key: keyof typeof SECTION_MARKERS): string {
  const bounds = findSectionBounds(text);
  const current = bounds.find(b => b.key === key);
  if (!current) {
    return '';
  }

  const currentIndex = bounds.indexOf(current);
  const next = bounds[currentIndex + 1];
  const start = current.index;
  const end = next ? next.index : text.length;
  return text.slice(start, end).trim();
}

function pickLikelyName(lines: string[]): string {
  const banned = /@|http|linkedin|github|telefono|phone|email|curriculum|resume|cv/i;
  const candidate = lines.find(line => {
    if (line.length < 4 || line.length > 60) return false;
    if (banned.test(line)) return false;
    const words = line.split(/\s+/);
    return words.length >= 2 && words.length <= 5;
  });
  return candidate || '';
}

function pickLikelyTitle(lines: string[], name: string): string {
  const lowerName = name.toLowerCase();
  const banned = /@|http|linkedin|github|telefono|phone|email/i;
  const candidate = lines.find(line => {
    if (line.toLowerCase() === lowerName) return false;
    if (line.length < 4 || line.length > 80) return false;
    return !banned.test(line);
  });
  return candidate || '';
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `https://${url}`;
}

function parseSkills(sectionText: string): ParsedDraft['skills'] {
  if (!sectionText) return [];
  const parts = sectionText
    .replace(/^[\s\S]*?\n/, '')
    .split(/\n|,|\u2022|-/)
    .map(p => p.trim())
    .filter(p => p.length >= 2 && p.length <= 40)
    .slice(0, 20);

  return unique(parts).map(name => ({
    name,
    category: 'technical',
    level: 'intermediate',
    isCertified: false,
  }));
}

function parseLanguages(sectionText: string): ParsedDraft['languages'] {
  const lower = sectionText.toLowerCase();
  if (!lower) return [];

  const found = LANGUAGE_CANDIDATES.filter(language => lower.includes(language)).slice(0, 8);
  return unique(found).map(name => ({
    language: name.charAt(0).toUpperCase() + name.slice(1),
    listeningLevel: 'B1',
    readingLevel: 'B1',
    speakingLevel: 'B1',
    writingLevel: 'B1',
  }));
}

function parseExperience(sectionText: string): ParsedDraft['experience'] {
  if (!sectionText) return [];
  const entries = sectionText
    .split(/\n\s*\n/)
    .map(block => splitLines(block))
    .filter(lines => lines.length >= 2)
    .slice(0, 6);

  return entries
    .map(lines => {
      const headline = lines[0];
      const match = headline.match(/^(.*?)\s+(?:at|@|en)\s+(.*)$/i);
      const position = match?.[1]?.trim() || lines[0];
      const company = match?.[2]?.trim() || lines[1] || '';
      const description = lines.slice(2).join(' ').slice(0, 600);

      return {
        position,
        company,
        description,
        employmentType: 'full-time' as const,
        isCurrentPosition: false,
        startDate: '',
        achievements: [],
        technologies: [],
      };
    })
    .filter(item => item.position && item.company);
}

function parseEducation(sectionText: string): ParsedDraft['education'] {
  if (!sectionText) return [];
  const entries = sectionText
    .split(/\n\s*\n/)
    .map(block => splitLines(block))
    .filter(lines => lines.length >= 2)
    .slice(0, 4);

  return entries.map(lines => ({
    degree: lines[0],
    institution: lines[1],
    fieldOfStudy: '',
    isCurrentlyStudying: false,
    startDate: '',
    activities: [],
    achievements: [],
  }));
}

function parseCertificates(sectionText: string): ParsedDraft['certificates'] {
  if (!sectionText) return [];
  const lines = splitLines(sectionText).slice(1);
  return lines.slice(0, 8).map(line => ({
    title: line,
    issuingOrganization: '',
    issueDate: '',
  }));
}

function parseSummary(text: string): string {
  const summarySection = extractSectionText(text, 'summary');
  if (summarySection) {
    return splitLines(summarySection).slice(1).join(' ').slice(0, 1000);
  }

  const firstParagraph = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .find(p => p.length > 80 && p.length < 1200);

  return firstParagraph || '';
}

async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const lowerName = fileName.toLowerCase();

  if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const options: ConstructorParameters<typeof PDFParse>[0] & { disableWorker: boolean } = {
      data: buffer,
      disableWorker: true,
    };
    const parser = new PDFParse(options);
    try {
      const result = await parser.getText();
      return result.text || '';
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  if (mimeType === 'text/plain' || lowerName.endsWith('.txt')) {
    return buffer.toString('utf8');
  }

  throw new Error('Unsupported file format. Use PDF, DOCX or TXT.');
}

export async function parseCVFileToDraft(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<{
  parsedData: ParsedDraft;
  extractedTextPreview: string;
}> {
  const lowerName = fileName.toLowerCase();
  const isValidFormat =
    SUPPORTED_MIME_TYPES.has(mimeType) ||
    lowerName.endsWith('.pdf') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.txt');
  if (!isValidFormat) {
    throw new Error('Unsupported file format. Use PDF, DOCX or TXT.');
  }

  const rawText = await extractTextFromFile(buffer, mimeType, fileName);
  const text = normalizeText(rawText);
  if (!text) {
    throw new Error('Could not extract readable text from the uploaded file.');
  }

  const lines = splitLines(text).slice(0, 40);
  const emails = unique(
    (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).map(email =>
      email.trim(),
    ),
  ).slice(0, 3);
  const phones = unique(
    (text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || []).map(phone => phone.trim()),
  ).slice(0, 3);
  const urls = unique(
    (text.match(/(?:https?:\/\/|www\.)[^\s)]+/gi) || []).map(url => normalizeUrl(url.trim())),
  ).slice(0, 8);

  const fullName = pickLikelyName(lines);
  const professionalTitle = pickLikelyTitle(lines.slice(1, 12), fullName);
  const summary = parseSummary(text);

  const experience = parseExperience(extractSectionText(text, 'experience'));
  const education = parseEducation(extractSectionText(text, 'education'));
  const skills = parseSkills(extractSectionText(text, 'skills'));
  const languages = parseLanguages(extractSectionText(text, 'languages') || text);
  const certificates = parseCertificates(extractSectionText(text, 'certificates'));

  const linkedin = urls.find(url => /linkedin\.com/i.test(url));
  const github = urls.find(url => /github\.com/i.test(url));
  const website = urls.find(url => !/linkedin\.com|github\.com/i.test(url));

  const links = urls.map(url => {
    const host = url.replace(/^https?:\/\//i, '').split('/')[0];
    return {
      label: host,
      url,
      type: 'other' as const,
      isVisible: true as const,
    };
  });

  const parsedData: ParsedDraft = {
    personal: {
      fullName,
      professionalTitle,
      summary,
      website,
      linkedin,
      github,
      emails: emails.map((value, index) => ({
        value,
        type: index === 0 ? 'personal' : 'work',
        label: index === 0 ? 'Email' : 'Email alterno',
        isPrimary: index === 0,
      })),
      phones: phones.map((number, index) => ({
        number,
        type: index === 0 ? 'personal' : 'office',
        label: index === 0 ? 'Telefono' : 'Telefono alterno',
        isPrimary: index === 0,
      })),
    },
    experience,
    education,
    skills,
    languages,
    certificates,
    links,
  };

  return {
    parsedData,
    extractedTextPreview: text.slice(0, 1200),
  };
}
