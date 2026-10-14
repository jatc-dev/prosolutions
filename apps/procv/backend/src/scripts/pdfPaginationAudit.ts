import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { buildPdfHtml } from '../utils/templates';

type TemplateKey =
  | 'minimal'
  | 'sidebar'
  | 'corporate'
  | 'developer'
  | 'creative'
  | 'classic'
  | 'executive'
  | 'timeline'
  | 'compact';

interface TemplateAuditResult {
  template: TemplateKey;
  status: 'PASS' | 'MINOR' | 'FAIL';
  metrics: {
    pageHeightPx: number;
    estimatedPages: number;
    splitSections: number;
    orphanHeadings: number;
    horizontalClip: number;
    firstHeaderOverflow: boolean;
  };
  findings: string[];
}

const templates: TemplateKey[] = [
  'minimal',
  'sidebar',
  'corporate',
  'developer',
  'creative',
  'classic',
  'executive',
  'timeline',
  'compact',
];

// A4 height in px at 96 DPI minus page margins (12mm top + 12mm bottom).
const PRINT_PAGE_HEIGHT_PX = ((297 - 24) / 25.4) * 96;

function longParagraph(seed: number): string {
  return (
    `Lider de proyectos con enfoque en impacto de negocio, mejora continua y entrega medible. ` +
    `Diseno soluciones escalables con practicas de calidad, observabilidad y colaboracion cross-funcional. ` +
    `Implemente procesos de optimizacion operativa, gobernanza tecnica y mentoring de equipos (${seed}).`
  );
}

function buildLongCvData() {
  const experience = Array.from({ length: 14 }).map((_, i) => ({
    id: `exp-${i + 1}`,
    role: `Senior Product Engineer ${i + 1}`,
    company: `Global Company ${i + 1}`,
    from: `202${i % 5}-0${(i % 9) + 1}`,
    to: i === 0 ? undefined : `202${(i + 1) % 6}-1${(i % 2) + 1}`,
    city: 'Madrid',
    country: 'Espana',
    description: `${longParagraph(i + 1)}\n${longParagraph(i + 101)}`,
  }));

  const education = Array.from({ length: 6 }).map((_, i) => ({
    id: `edu-${i + 1}`,
    degree: `Master Program ${i + 1}`,
    institution: `University ${i + 1}`,
    from: `201${i}-09`,
    to: `201${i + 1}-06`,
    city: 'Barcelona',
    country: 'Espana',
  }));

  const skills = Array.from({ length: 18 }).map((_, i) => ({
    id: `skill-${i + 1}`,
    name: `Skill ${i + 1}`,
    level: (i % 5) + 1,
  }));

  const languages = [
    { id: 'lang-1', name: 'Espanol', level: 'C2', certificateUrl: 'https://example.com/es' },
    { id: 'lang-2', name: 'English', level: 'C1', certificateUrl: 'https://example.com/en' },
    { id: 'lang-3', name: 'French', level: 'B2', certificateUrl: 'https://example.com/fr' },
  ];

  const certificates = Array.from({ length: 8 }).map((_, i) => ({
    id: `cert-${i + 1}`,
    title: `Professional Certificate ${i + 1}`,
    url: `https://example.com/cert/${i + 1}`,
  }));

  return {
    personal: {
      name: 'Alex Rivera',
      role: 'Head of Product Engineering',
      city: 'Madrid',
      country: 'Espana',
      summary: `${longParagraph(999)}\n${longParagraph(1000)}\n${longParagraph(1001)}`,
      emails: [
        { type: 'Personal', value: 'alex.rivera@example.com' },
        { type: 'Trabajo', value: 'arivera@company.com' },
      ],
      phones: [
        { type: 'Movil', value: '+34 600 000 001' },
        { type: 'Oficina', value: '+34 91 000 0001' },
      ],
    },
    experience,
    education,
    skills,
    languages,
    certificates,
    links: {
      linkedin: 'https://linkedin.com/in/alex-rivera',
      github: 'https://github.com/alex-rivera',
      portfolio: 'https://alexrivera.dev',
    },
    settings: {
      sidebarBg: '#0f172a',
    },
  };
}

function classifyStatus(metrics: TemplateAuditResult['metrics']): TemplateAuditResult['status'] {
  if (metrics.horizontalClip > 0 || metrics.firstHeaderOverflow) return 'FAIL';
  if (metrics.orphanHeadings > 0 || metrics.splitSections > 0) return 'MINOR';
  return 'PASS';
}

function findingsFromMetrics(metrics: TemplateAuditResult['metrics']): string[] {
  const findings: string[] = [];
  if (metrics.horizontalClip > 0) {
    findings.push(`Horizontal clipping candidates: ${metrics.horizontalClip}`);
  }
  if (metrics.firstHeaderOverflow) {
    findings.push('Header overflows first print page boundary.');
  }
  if (metrics.orphanHeadings > 0) {
    findings.push(`Potential orphan headings near page break: ${metrics.orphanHeadings}`);
  }
  if (metrics.splitSections > 0) {
    findings.push(`Section-like blocks crossing page boundaries: ${metrics.splitSections}`);
  }
  if (findings.length === 0) {
    findings.push('No automated pagination risks detected.');
  }
  return findings;
}

async function run() {
  const outputDir = path.resolve(process.cwd(), '../uploads/temp/pdf-smoke');
  await mkdir(outputDir, { recursive: true });

  const data = buildLongCvData();
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  try {
    const results: TemplateAuditResult[] = [];

    for (const template of templates) {
      const cv = {
        id: `audit-${template}`,
        userId: 'audit-user',
        title: `Audit ${template}`,
        template,
        data: data as unknown as string,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      const html = buildPdfHtml(cv);
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123 });
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.emulateMediaType('print');

      const metrics = await page.evaluate(pageHeightPx => {
        const docEl = document.documentElement;
        const body = document.body;
        const contentHeight = Math.max(
          body.scrollHeight,
          body.offsetHeight,
          docEl.clientHeight,
          docEl.scrollHeight,
          docEl.offsetHeight,
        );
        const estimatedPages = Math.max(1, Math.ceil(contentHeight / pageHeightPx));

        const sectionLike = Array.from(
          document.querySelectorAll('section, .section, .item, .card, article, aside, main'),
        ) as HTMLElement[];

        let splitSections = 0;
        for (const el of sectionLike) {
          const rect = el.getBoundingClientRect();
          if (rect.height < pageHeightPx * 0.82) {
            const top = rect.top + window.scrollY;
            const bottom = rect.bottom + window.scrollY;
            const startPage = Math.floor(top / pageHeightPx);
            const endPage = Math.floor(bottom / pageHeightPx);
            if (endPage > startPage) splitSections += 1;
          }
        }

        const headingEls = Array.from(document.querySelectorAll('h1, h2, h3')) as HTMLElement[];
        let orphanHeadings = 0;
        for (const h of headingEls) {
          const r = h.getBoundingClientRect();
          const top = r.top + window.scrollY;
          const pageBottom = (Math.floor(top / pageHeightPx) + 1) * pageHeightPx;
          const remaining = pageBottom - (r.bottom + window.scrollY);
          if (remaining > 0 && remaining < 28) orphanHeadings += 1;
        }

        const allEls = Array.from(document.querySelectorAll('*') as unknown as HTMLElement[]);
        let horizontalClip = 0;
        for (const el of allEls) {
          const r = el.getBoundingClientRect();
          if (r.right > window.innerWidth + 1) {
            horizontalClip += 1;
          }
        }

        const header = document.querySelector('header') as HTMLElement | null;
        let firstHeaderOverflow = false;
        if (header) {
          const r = header.getBoundingClientRect();
          const bottom = r.bottom + window.scrollY;
          firstHeaderOverflow = bottom > pageHeightPx;
        }

        return {
          pageHeightPx,
          estimatedPages,
          splitSections,
          orphanHeadings,
          horizontalClip,
          firstHeaderOverflow,
        };
      }, PRINT_PAGE_HEIGHT_PX);

      await page.close();

      const status = classifyStatus(metrics);
      const findings = findingsFromMetrics(metrics);
      results.push({ template, status, metrics, findings });
    }

    const reportPath = path.join(outputDir, 'pagination-audit.json');
    await writeFile(
      reportPath,
      JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
      'utf-8',
    );

    const summary = results
      .map(
        r =>
          `${r.template}: ${r.status} | pages=${r.metrics.estimatedPages} | split=${r.metrics.splitSections} | orphan=${r.metrics.orphanHeadings} | clip=${r.metrics.horizontalClip}`,
      )
      .join('\n');

    console.log('[pdf-audit] completed');
    console.log(summary);
    console.log(`[pdf-audit] report ${reportPath}`);
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error('[pdf-audit] failed', error);
  process.exit(1);
});
