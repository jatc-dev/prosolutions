import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { closeBrowser, renderToPdf } from '../utils/pdfGenerator';
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

function longParagraph(seed: number): string {
  return (
    `Lider de proyectos con enfoque en impacto de negocio, mejora continua y entrega medible. ` +
    `Diseño soluciones escalables con prácticas de calidad, observabilidad y colaboración cross-funcional. ` +
    `Implementé procesos de optimización operativa, gobernanza técnica y mentoring de equipos (${seed}).`
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

async function run() {
  const outputDir = path.resolve(process.cwd(), '../uploads/temp/pdf-smoke');
  await mkdir(outputDir, { recursive: true });

  try {
    const data = buildLongCvData();

    for (const template of templates) {
      const cv = {
        id: `smoke-${template}`,
        userId: 'smoke-user',
        title: `Smoke ${template}`,
        template,
        data: data as unknown as string,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      const html = buildPdfHtml(cv);
      const pdf = await renderToPdf(html);
      const filePath = path.join(outputDir, `smoke-${template}.pdf`);
      await writeFile(filePath, pdf);
      console.log(`[pdf-smoke] generated ${filePath}`);
    }

    console.log(`[pdf-smoke] completed for ${templates.length} templates`);
  } finally {
    await closeBrowser();
  }
}

run().catch(error => {
  console.error('[pdf-smoke] failed', error);
  process.exitCode = 1;
});
