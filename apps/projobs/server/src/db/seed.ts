import type { Database } from './database.js';

/**
 * Demo catalog for local development and QA. Idempotent (keyed by slug).
 * Optionally links every demo company to a recruiter: SEED_RECRUITER_ID=<identity user id>.
 */
interface DemoJob {
  slug: string;
  company: string;
  title: string;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  skills: string[];
  employmentType: string;
  workplace: string;
  seniority: string;
  city: string | null;
  country: string;
  salary: [number, number, string, string] | null;
  daysAgo: number;
}

const COMPANIES = [
  { slug: 'andes-fintech', name: 'Andes Fintech', tagline: 'Pagos digitales para Latinoamérica', industry: 'Fintech', size: '201-1000', hq: 'Bogotá, Colombia', website: 'https://example.com/andes' },
  { slug: 'nodo-salud', name: 'Nodo Salud', tagline: 'Telemedicina que llega a todos', industry: 'Salud digital', size: '51-200', hq: 'Medellín, Colombia', website: 'https://example.com/nodo' },
  { slug: 'cobalto-labs', name: 'Cobalto Labs', tagline: 'Producto y datos para retail', industry: 'Software', size: '11-50', hq: 'Ciudad de México, México', website: 'https://example.com/cobalto' },
  { slug: 'verde-logistica', name: 'Verde Logística', tagline: 'Última milla sostenible', industry: 'Logística', size: '1000+', hq: 'Lima, Perú', website: 'https://example.com/verde' },
];

const lorem = (role: string, company: string) =>
  `En ${company} buscamos ${role} para fortalecer un equipo que construye productos usados por miles de personas cada día. ` +
  'Trabajarás con autonomía, objetivos claros y un proceso de selección transparente. Valoramos la colaboración, ' +
  'la comunicación escrita y las ganas de aprender. Ofrecemos onboarding acompañado y crecimiento profesional real.';

const JOBS: DemoJob[] = [
  { slug: 'frontend-react-senior-andes', company: 'andes-fintech', title: 'Desarrollador/a Frontend Senior (React)', summary: 'Lidera la nueva app web de pagos con React, TypeScript y un design system propio.', description: lorem('una persona Frontend Senior', 'Andes Fintech'), responsibilities: ['Diseñar la arquitectura del frontend de pagos', 'Mentorear a desarrolladores junior', 'Asegurar accesibilidad y rendimiento'], requirements: ['5+ años con React', 'TypeScript avanzado', 'Experiencia con testing automatizado'], benefits: ['Trabajo 100% remoto', 'Presupuesto de formación', 'Seguro médico'], skills: ['react', 'typescript', 'testing', 'css', 'accessibility'], employmentType: 'full_time', workplace: 'remote', seniority: 'senior', city: null, country: 'CO', salary: [12_000_000, 16_000_000, 'COP', 'month'], daysAgo: 1 },
  { slug: 'backend-node-mid-andes', company: 'andes-fintech', title: 'Backend Developer (Node.js + PostgreSQL)', summary: 'Construye APIs de alta disponibilidad para conciliación de pagos.', description: lorem('un/a Backend Developer', 'Andes Fintech'), responsibilities: ['Desarrollar servicios en Node.js', 'Optimizar consultas en PostgreSQL', 'Participar en guardias rotativas'], requirements: ['3+ años con Node.js', 'SQL sólido', 'Conocimiento de colas y eventos'], benefits: ['Esquema híbrido flexible', 'Bono anual'], skills: ['node.js', 'postgresql', 'typescript', 'docker', 'aws'], employmentType: 'full_time', workplace: 'hybrid', seniority: 'mid', city: 'Bogotá', country: 'CO', salary: [8_000_000, 11_000_000, 'COP', 'month'], daysAgo: 3 },
  { slug: 'data-analyst-nodo', company: 'nodo-salud', title: 'Analista de Datos', summary: 'Convierte datos clínicos anonimizados en decisiones de producto.', description: lorem('un/a Analista de Datos', 'Nodo Salud'), responsibilities: ['Construir tableros en Power BI', 'Modelar datos con SQL', 'Presentar hallazgos al equipo de producto'], requirements: ['2+ años en análisis de datos', 'SQL y Python', 'Comunicación clara'], benefits: ['Horario flexible', 'Días de bienestar'], skills: ['sql', 'python', 'power bi', 'excel', 'statistics'], employmentType: 'full_time', workplace: 'hybrid', seniority: 'junior', city: 'Medellín', country: 'CO', salary: [4_500_000, 6_000_000, 'COP', 'month'], daysAgo: 2 },
  { slug: 'product-designer-nodo', company: 'nodo-salud', title: 'Product Designer (UX/UI)', summary: 'Diseña experiencias de telemedicina simples para pacientes y médicos.', description: lorem('un/a Product Designer', 'Nodo Salud'), responsibilities: ['Investigación con usuarios', 'Prototipado en Figma', 'Evolucionar el design system'], requirements: ['Portafolio con casos reales', 'Dominio de Figma', 'Experiencia en investigación UX'], benefits: ['Remoto en Latinoamérica', 'Equipo de trabajo nuevo'], skills: ['figma', 'ux research', 'prototyping', 'design systems'], employmentType: 'full_time', workplace: 'remote', seniority: 'mid', city: null, country: 'CO', salary: null, daysAgo: 6 },
  { slug: 'devops-engineer-cobalto', company: 'cobalto-labs', title: 'DevOps / Platform Engineer', summary: 'Automatiza la infraestructura de una plataforma de datos para retail.', description: lorem('un/a Platform Engineer', 'Cobalto Labs'), responsibilities: ['Gestionar Kubernetes en producción', 'Infraestructura como código con Terraform', 'Observabilidad y SLOs'], requirements: ['Experiencia con Kubernetes', 'Terraform', 'CI/CD'], benefits: ['Stock options', 'Equipo pequeño y senior'], skills: ['kubernetes', 'terraform', 'aws', 'docker', 'ci/cd'], employmentType: 'full_time', workplace: 'remote', seniority: 'senior', city: null, country: 'MX', salary: [70_000, 95_000, 'MXN', 'month'], daysAgo: 4 },
  { slug: 'fullstack-junior-cobalto', company: 'cobalto-labs', title: 'Desarrollador/a Full Stack Junior', summary: 'Tu primer gran reto: features de punta a punta con mentoría diaria.', description: lorem('una persona Full Stack Junior', 'Cobalto Labs'), responsibilities: ['Implementar features en React y Node.js', 'Escribir pruebas', 'Participar en code reviews'], requirements: ['Proyectos personales o bootcamp', 'JavaScript', 'Ganas de aprender'], benefits: ['Mentoría 1:1', 'Ruta de crecimiento clara'], skills: ['javascript', 'react', 'node.js', 'git'], employmentType: 'full_time', workplace: 'onsite', seniority: 'junior', city: 'Ciudad de México', country: 'MX', salary: [25_000, 35_000, 'MXN', 'month'], daysAgo: 8 },
  { slug: 'mobile-flutter-verde', company: 'verde-logistica', title: 'Mobile Developer (Flutter)', summary: 'App de repartidores con rutas inteligentes y modo offline.', description: lorem('un/a Mobile Developer', 'Verde Logística'), responsibilities: ['Desarrollar la app con Flutter', 'Integrar mapas y geolocalización', 'Publicar en tiendas'], requirements: ['2+ años con Flutter o desarrollo móvil', 'Experiencia con APIs REST'], benefits: ['Bono por desempeño', 'Movilidad pagada'], skills: ['flutter', 'dart', 'firebase', 'rest apis'], employmentType: 'contract', workplace: 'hybrid', seniority: 'mid', city: 'Lima', country: 'PE', salary: [6_000, 8_500, 'PEN', 'month'], daysAgo: 5 },
  { slug: 'pasantia-datos-verde', company: 'verde-logistica', title: 'Pasantía en Ciencia de Datos', summary: 'Aprende optimización de rutas con datos reales de última milla.', description: lorem('practicantes de Ciencia de Datos', 'Verde Logística'), responsibilities: ['Apoyar modelos de predicción de demanda', 'Limpieza y análisis de datos'], requirements: ['Estudiante de últimos semestres', 'Python básico'], benefits: ['Apoyo de sostenimiento', 'Posibilidad de contratación'], skills: ['python', 'pandas', 'sql', 'machine learning'], employmentType: 'internship', workplace: 'onsite', seniority: 'intern', city: 'Lima', country: 'PE', salary: [1_500, 1_500, 'PEN', 'month'], daysAgo: 10 },
  { slug: 'qa-automation-andes', company: 'andes-fintech', title: 'QA Automation Engineer', summary: 'Asegura la calidad de pagos con pruebas automatizadas end-to-end.', description: lorem('un/a QA Automation Engineer', 'Andes Fintech'), responsibilities: ['Automatizar pruebas con Playwright', 'Definir estrategias de calidad', 'Integrar pruebas en CI'], requirements: ['Experiencia en automatización', 'JavaScript o TypeScript'], benefits: ['100% remoto', 'Equipo internacional'], skills: ['playwright', 'typescript', 'testing', 'ci/cd'], employmentType: 'full_time', workplace: 'remote', seniority: 'mid', city: null, country: 'CO', salary: [7_000_000, 9_000_000, 'COP', 'month'], daysAgo: 12 },
  { slug: 'engineering-manager-cobalto', company: 'cobalto-labs', title: 'Engineering Manager', summary: 'Lidera dos squads de producto y escala la cultura de ingeniería.', description: lorem('un/a Engineering Manager', 'Cobalto Labs'), responsibilities: ['Gestionar y hacer crecer al equipo', 'Planificación técnica trimestral', 'Contratación'], requirements: ['3+ años liderando equipos', 'Background técnico sólido'], benefits: ['Stock options', 'Presupuesto de liderazgo'], skills: ['leadership', 'agile', 'typescript', 'aws'], employmentType: 'full_time', workplace: 'hybrid', seniority: 'lead', city: 'Ciudad de México', country: 'MX', salary: [110_000, 140_000, 'MXN', 'month'], daysAgo: 15 },
];

const sqlText = (value: string | null) => (value == null ? 'NULL' : `'${value.replace(/'/g, "''")}'`);
const sqlArray = (values: string[]) => `ARRAY[${values.map(sqlText).join(', ')}]::text[]`;

export async function seedDemoData(db: Database, recruiterId: string | null = process.env.SEED_RECRUITER_ID ?? null): Promise<void> {
  if (recruiterId && !/^[A-Za-z0-9_-]{1,128}$/.test(recruiterId)) throw new Error('Invalid SEED_RECRUITER_ID');
  const statements: string[] = ['BEGIN;'];
  for (const company of COMPANIES) {
    statements.push(
      `INSERT INTO public.companies (slug, name, tagline, industry, size_range, headquarters, website, description, created_by)
       VALUES (${sqlText(company.slug)}, ${sqlText(company.name)}, ${sqlText(company.tagline)}, ${sqlText(company.industry)},
               ${sqlText(company.size)}, ${sqlText(company.hq)}, ${sqlText(company.website)},
               ${sqlText(`${company.name}: ${company.tagline}. Empresa de demostración para entornos de desarrollo y QA.`)}, 'seed')
       ON CONFLICT (slug) DO NOTHING;`,
    );
    if (recruiterId) {
      statements.push(
        `INSERT INTO public.company_members (company_id, user_id, role)
         SELECT id, ${sqlText(recruiterId)}, 'owner' FROM public.companies WHERE slug = ${sqlText(company.slug)}
         ON CONFLICT DO NOTHING;`,
      );
    }
  }
  for (const job of JOBS) {
    const [min, max, currency, period] = job.salary ?? [null, null, null, null];
    statements.push(
      `INSERT INTO public.jobs (company_id, slug, title, summary, description, responsibilities, requirements, benefits,
         skills, employment_type, workplace, seniority, location_city, location_country, salary_min, salary_max,
         salary_currency, salary_period, status, published_at, created_by)
       SELECT c.id, ${sqlText(job.slug)}, ${sqlText(job.title)}, ${sqlText(job.summary)}, ${sqlText(job.description)},
         ${sqlArray(job.responsibilities)}, ${sqlArray(job.requirements)}, ${sqlArray(job.benefits)}, ${sqlArray(job.skills)},
         ${sqlText(job.employmentType)}, ${sqlText(job.workplace)}, ${sqlText(job.seniority)}, ${sqlText(job.city)},
         ${sqlText(job.country)}, ${min ?? 'NULL'}, ${max ?? 'NULL'}, ${sqlText(currency)}, ${sqlText(period)},
         'published', now() - interval '${job.daysAgo} days', 'seed'
       FROM public.companies c WHERE c.slug = ${sqlText(job.company)}
       ON CONFLICT (slug) DO NOTHING;`,
    );
  }
  statements.push('COMMIT;');
  await db.exec(statements.join('\n'));
}
