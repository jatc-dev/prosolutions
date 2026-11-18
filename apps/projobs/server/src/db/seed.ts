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
  { slug: 'banco-andes', name: 'Banco Andes', tagline: 'Servicios financieros cercanos para familias y pequeñas empresas', industry: 'Banca y finanzas', size: '201-1000', hq: 'Bogotá, Colombia', website: 'https://example.com/andes' },
  { slug: 'nodo-salud', name: 'Nodo Salud', tagline: 'Red de clínicas que llega a todos', industry: 'Salud', size: '51-200', hq: 'Medellín, Colombia', website: 'https://example.com/nodo' },
  { slug: 'cobalto-retail', name: 'Cobalto Retail', tagline: 'Tiendas de barrio con precios justos', industry: 'Comercio minorista', size: '1000+', hq: 'Ciudad de México, México', website: 'https://example.com/cobalto' },
  { slug: 'verde-logistica', name: 'Verde Logística', tagline: 'Última milla sostenible', industry: 'Logística y transporte', size: '1000+', hq: 'Lima, Perú', website: 'https://example.com/verde' },
];

const lorem = (role: string, company: string) =>
  `En ${company} buscamos ${role} para fortalecer un equipo que atiende a miles de personas cada día. ` +
  'Trabajarás con autonomía, objetivos claros y un proceso de selección transparente. Valoramos la colaboración, ' +
  'la buena comunicación y las ganas de aprender. Ofrecemos inducción acompañada y crecimiento profesional real.';

const JOBS: DemoJob[] = [
  { slug: 'asesor-credito-senior-andes', company: 'banco-andes', title: 'Asesor/a de Crédito Senior', summary: 'Acompaña a pequeñas empresas desde la solicitud de crédito hasta el desembolso.', description: lorem('una persona Asesora de Crédito Senior', 'Banco Andes'), responsibilities: ['Evaluar solicitudes de crédito de pequeñas empresas', 'Asesorar a clientes sobre productos financieros', 'Hacer seguimiento a la cartera asignada'], requirements: ['5+ años en asesoría comercial o de crédito', 'Manejo avanzado de Excel', 'Habilidades de negociación'], benefits: ['Trabajo 100% remoto', 'Presupuesto de formación', 'Seguro médico'], skills: ['credito', 'negociacion', 'excel', 'ventas', 'cartera'], employmentType: 'full_time', workplace: 'remote', seniority: 'senior', city: null, country: 'CO', salary: [6_000_000, 8_000_000, 'COP', 'month'], daysAgo: 1 },
  { slug: 'analista-riesgo-andes', company: 'banco-andes', title: 'Analista de Riesgo', summary: 'Analiza el comportamiento de la cartera y propone políticas de riesgo.', description: lorem('un/a Analista de Riesgo', 'Banco Andes'), responsibilities: ['Monitorear indicadores de cartera', 'Preparar informes para el comité de riesgo', 'Proponer ajustes a las políticas de crédito'], requirements: ['3+ años en análisis financiero o de riesgo', 'Excel avanzado', 'Profesional en economía, finanzas o afines'], benefits: ['Esquema híbrido flexible', 'Bono anual'], skills: ['analisis financiero', 'riesgo', 'excel', 'power bi'], employmentType: 'full_time', workplace: 'hybrid', seniority: 'mid', city: 'Bogotá', country: 'CO', salary: [5_000_000, 7_000_000, 'COP', 'month'], daysAgo: 3 },
  { slug: 'auxiliar-enfermeria-nodo', company: 'nodo-salud', title: 'Auxiliar de Enfermería', summary: 'Brinda atención cercana a pacientes en consulta externa.', description: lorem('un/a Auxiliar de Enfermería', 'Nodo Salud'), responsibilities: ['Preparar a los pacientes para la consulta', 'Tomar signos vitales', 'Apoyar procedimientos ambulatorios'], requirements: ['Técnico en auxiliar de enfermería', 'Tarjeta profesional vigente', 'Vocación de servicio'], benefits: ['Turnos estables', 'Días de bienestar'], skills: ['atencion al paciente', 'signos vitales', 'primeros auxilios', 'trabajo en equipo'], employmentType: 'full_time', workplace: 'onsite', seniority: 'junior', city: 'Medellín', country: 'CO', salary: [2_200_000, 2_800_000, 'COP', 'month'], daysAgo: 2 },
  { slug: 'agente-atencion-paciente-nodo', company: 'nodo-salud', title: 'Agente de Atención al Paciente', summary: 'Orienta a pacientes por teléfono y chat, y agenda sus citas.', description: lorem('un/a Agente de Atención al Paciente', 'Nodo Salud'), responsibilities: ['Atender llamadas y mensajes de pacientes', 'Agendar y reprogramar citas', 'Registrar cada caso en el sistema'], requirements: ['1+ año en servicio al cliente', 'Excelente comunicación oral y escrita'], benefits: ['Remoto en Latinoamérica', 'Equipo de trabajo nuevo'], skills: ['servicio al cliente', 'agendamiento', 'comunicacion', 'crm'], employmentType: 'full_time', workplace: 'remote', seniority: 'mid', city: null, country: 'CO', salary: null, daysAgo: 6 },
  { slug: 'comprador-senior-cobalto', company: 'cobalto-retail', title: 'Comprador/a Senior', summary: 'Negocia con proveedores para mantener precios justos en más de 300 tiendas.', description: lorem('un/a Comprador/a Senior', 'Cobalto Retail'), responsibilities: ['Negociar condiciones con proveedores', 'Planificar el abastecimiento por temporada', 'Controlar márgenes y niveles de inventario'], requirements: ['5+ años en compras de consumo masivo', 'Experiencia negociando con proveedores nacionales'], benefits: ['Bono por resultados', 'Descuentos en tiendas'], skills: ['negociacion', 'proveedores', 'inventarios', 'abastecimiento'], employmentType: 'full_time', workplace: 'remote', seniority: 'senior', city: null, country: 'MX', salary: [70_000, 95_000, 'MXN', 'month'], daysAgo: 4 },
  { slug: 'asesor-comercial-junior-cobalto', company: 'cobalto-retail', title: 'Asesor/a Comercial Junior', summary: 'Tu primer gran reto: atención al cliente y ventas en tienda con acompañamiento diario.', description: lorem('una persona Asesora Comercial Junior', 'Cobalto Retail'), responsibilities: ['Atender y asesorar a clientes en tienda', 'Mantener la exhibición de productos', 'Apoyar el cierre de caja'], requirements: ['Bachillerato completo', 'Gusto por el servicio', 'Ganas de aprender'], benefits: ['Acompañamiento 1:1', 'Ruta de crecimiento clara'], skills: ['ventas', 'servicio al cliente', 'caja', 'inventarios'], employmentType: 'full_time', workplace: 'onsite', seniority: 'junior', city: 'Ciudad de México', country: 'MX', salary: [12_000, 16_000, 'MXN', 'month'], daysAgo: 8 },
  { slug: 'coordinador-rutas-verde', company: 'verde-logistica', title: 'Coordinador/a de Rutas', summary: 'Organiza las rutas diarias de entrega y acompaña al equipo de repartidores.', description: lorem('un/a Coordinador/a de Rutas', 'Verde Logística'), responsibilities: ['Planificar las rutas de entrega del día', 'Resolver incidencias en ruta', 'Medir tiempos y cumplimiento de entregas'], requirements: ['2+ años en logística o distribución', 'Manejo de Excel'], benefits: ['Bono por desempeño', 'Movilidad pagada'], skills: ['planeacion de rutas', 'gestion de flota', 'excel', 'liderazgo'], employmentType: 'contract', workplace: 'hybrid', seniority: 'mid', city: 'Lima', country: 'PE', salary: [4_000, 5_500, 'PEN', 'month'], daysAgo: 5 },
  { slug: 'pasantia-logistica-verde', company: 'verde-logistica', title: 'Pasantía en Logística', summary: 'Aprende cómo funciona la última milla con operaciones reales.', description: lorem('practicantes de Logística', 'Verde Logística'), responsibilities: ['Apoyar el control de inventarios del almacén', 'Registrar indicadores de entrega'], requirements: ['Estudiante de últimos semestres', 'Excel básico'], benefits: ['Apoyo de sostenimiento', 'Posibilidad de contratación'], skills: ['inventarios', 'almacen', 'excel basico', 'organizacion'], employmentType: 'internship', workplace: 'onsite', seniority: 'intern', city: 'Lima', country: 'PE', salary: [1_500, 1_500, 'PEN', 'month'], daysAgo: 10 },
  { slug: 'ejecutivo-cobranza-andes', company: 'banco-andes', title: 'Ejecutivo/a de Cobranza', summary: 'Gestiona la recuperación de cartera con trato respetuoso y acuerdos de pago.', description: lorem('un/a Ejecutivo/a de Cobranza', 'Banco Andes'), responsibilities: ['Contactar a clientes con pagos pendientes', 'Negociar acuerdos de pago', 'Reportar el estado de la cartera'], requirements: ['Experiencia en cobranza o servicio al cliente', 'Manejo de Excel'], benefits: ['100% remoto', 'Comisiones por recuperación'], skills: ['cobranza', 'negociacion', 'excel', 'crm'], employmentType: 'full_time', workplace: 'remote', seniority: 'mid', city: null, country: 'CO', salary: [2_800_000, 3_600_000, 'COP', 'month'], daysAgo: 12 },
  { slug: 'gerente-regional-tiendas-cobalto', company: 'cobalto-retail', title: 'Gerente Regional de Tiendas', summary: 'Lidera 25 tiendas y a sus equipos para crecer en ventas y servicio.', description: lorem('un/a Gerente Regional de Tiendas', 'Cobalto Retail'), responsibilities: ['Gestionar y hacer crecer a los equipos de tienda', 'Definir metas de venta trimestrales', 'Contratación y formación de gerentes de tienda'], requirements: ['3+ años liderando equipos en retail', 'Manejo de presupuestos'], benefits: ['Auto de la empresa', 'Presupuesto de liderazgo'], skills: ['liderazgo', 'gestion comercial', 'presupuestos', 'servicio al cliente'], employmentType: 'full_time', workplace: 'hybrid', seniority: 'lead', city: 'Ciudad de México', country: 'MX', salary: [110_000, 140_000, 'MXN', 'month'], daysAgo: 15 },
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
