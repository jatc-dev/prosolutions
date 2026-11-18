import {
  APPLICATION_STAGES,
  type ApplicationStage,
  type CompanySize,
  type EmployerCompany,
  type EmployerJob,
  type EmploymentType,
  type JobDetail,
  type SalaryPeriod,
  type Seniority,
  type Workplace,
} from '../contracts.js';
import type { Queryable } from '../db/database.js';
import { normalizeSkills } from '../domain/skills.js';
import { randomSuffix, slugify } from '../domain/text.js';
import { conflict, forbidden, notFound } from '../http/errors.js';
import { findJobForMember, UUID } from './jobs.js';
import { COMPANY_COLUMNS, iso, toCompany } from './mappers.js';
import { publishEvent } from './outbox.js';
import { decideVerification, PENDING_COMPANY_PUBLISHED_JOB_LIMIT } from '../domain/companyVerification.js';

export interface CompanyInput {
  name: string;
  slug?: string;
  tagline?: string | null;
  description?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  industry?: string | null;
  sizeRange?: CompanySize | null;
  headquarters?: string | null;
}

export interface JobInput {
  companyId: string;
  title: string;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  skills: string[];
  employmentType: EmploymentType;
  workplace: Workplace;
  seniority: Seniority;
  locationCity: string | null;
  locationCountry: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod | null;
  closesAt: string | null;
}

export async function listMemberCompanies(tx: Queryable, userId: string): Promise<EmployerCompany[]> {
  const { rows } = await tx.query(
    `SELECT ${COMPANY_COLUMNS}, m.role
     FROM public.company_members m JOIN public.companies c ON c.id = m.company_id
     WHERE m.user_id = $1 ORDER BY c.name`,
    [userId],
  );
  return rows.map((row) => ({ ...toCompany(row), role: (row as { role: 'owner' | 'recruiter' }).role }));
}

export async function createCompany(
  tx: Queryable,
  userId: string,
  input: CompanyInput,
  creator: { email: string | null; grantedRecruiter: boolean } = { email: null, grantedRecruiter: false },
): Promise<EmployerCompany> {
  const base = slugify(input.slug || input.name, 60);
  const taken = await tx.query('SELECT 1 FROM public.companies WHERE slug = $1', [base]);
  const slug = taken.rows.length ? `${base}-${randomSuffix(4)}` : base;
  const verification = decideVerification({ email: creator.email, website: input.website, grantedRecruiter: creator.grantedRecruiter });
  const { rows } = await tx.query<Record<string, any>>(
    `INSERT INTO public.companies (slug, name, tagline, description, website, logo_url, industry, size_range, headquarters, created_by,
       verification_status, verification_method, verified_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CASE WHEN $11 = 'verified' THEN now() END)
     RETURNING id, slug, name, logo_url, industry, tagline, description, website, size_range, headquarters, verification_status`,
    [
      slug, input.name, input.tagline ?? null, input.description ?? null, input.website ?? null,
      input.logoUrl ?? null, input.industry ?? null, input.sizeRange ?? null, input.headquarters ?? null, userId,
      verification.status, verification.method,
    ],
  );
  const company = rows[0]!;
  await tx.query(
    `INSERT INTO public.company_members (company_id, user_id, role, email) VALUES ($1, $2, 'owner', $3)`,
    [company.id, userId, creator.email],
  );
  return { ...toCompany(company), role: 'owner' };
}

export async function updateCompany(
  tx: Queryable,
  userId: string,
  companyId: string,
  input: Partial<CompanyInput>,
): Promise<EmployerCompany> {
  if (!UUID.test(companyId)) throw notFound('Company not found');
  const columns: Record<string, unknown> = {
    name: input.name,
    tagline: input.tagline,
    description: input.description,
    website: input.website,
    logo_url: input.logoUrl,
    industry: input.industry,
    size_range: input.sizeRange,
    headquarters: input.headquarters,
  };
  const entries = Object.entries(columns).filter(([, value]) => value !== undefined);
  const params: unknown[] = [companyId, userId];
  const assignments = entries.map(([column, value]) => {
    params.push(value);
    return `${column} = $${params.length}`;
  });
  const { rows } = await tx.query<Record<string, any>>(
    `UPDATE public.companies c SET ${assignments.length ? assignments.join(', ') : 'name = c.name'}
     WHERE c.id = $1
       AND EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = c.id AND m.user_id = $2)
     RETURNING ${COMPANY_COLUMNS},
       (SELECT role FROM public.company_members m WHERE m.company_id = c.id AND m.user_id = $2) AS role`,
    params,
  );
  if (!rows[0]) throw notFound('Company not found');
  return { ...toCompany(rows[0]), role: rows[0].role };
}

async function assertMember(tx: Queryable, companyId: string, userId: string) {
  if (!UUID.test(companyId)) throw forbidden('You are not a member of this company');
  const { rows } = await tx.query(
    'SELECT 1 FROM public.company_members WHERE company_id = $1 AND user_id = $2',
    [companyId, userId],
  );
  if (!rows.length) throw forbidden('You are not a member of this company');
}

const emptyStageCounts = (): Record<ApplicationStage, number> =>
  Object.fromEntries(APPLICATION_STAGES.map((stage) => [stage, 0])) as Record<ApplicationStage, number>;

export async function listEmployerJobs(tx: Queryable, userId: string, companyId?: string): Promise<EmployerJob[]> {
  const params: unknown[] = [userId];
  let companyFilter = '';
  if (companyId) {
    if (!UUID.test(companyId)) return [];
    params.push(companyId);
    companyFilter = 'AND j.company_id = $2';
  }
  const { rows } = await tx.query<Record<string, any>>(
    `SELECT j.id, j.slug, j.title, j.status, j.workplace, j.employment_type, j.seniority,
            j.published_at, j.updated_at, stats.counts, COALESCE(stats.total, 0)::int AS applicants
     FROM public.jobs j
     JOIN public.company_members m ON m.company_id = j.company_id AND m.user_id = $1
     LEFT JOIN LATERAL (
       SELECT jsonb_object_agg(stage, n) AS counts, sum(n) FILTER (WHERE stage <> 'withdrawn') AS total
       FROM (SELECT a.stage, count(*)::int AS n FROM public.applications a WHERE a.job_id = j.id GROUP BY a.stage) s
     ) stats ON true
     WHERE true ${companyFilter}
     ORDER BY CASE j.status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END, j.updated_at DESC`,
    params,
  );
  return rows.map((row) => {
    const counts = typeof row.counts === 'string' ? JSON.parse(row.counts) : row.counts ?? {};
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      status: row.status,
      workplace: row.workplace,
      employmentType: row.employment_type,
      seniority: row.seniority,
      publishedAt: iso(row.published_at),
      updatedAt: iso(row.updated_at) ?? '',
      applicants: Number(row.applicants),
      stageCounts: { ...emptyStageCounts(), ...counts },
    };
  });
}

function jobValues(input: Omit<JobInput, 'companyId'>) {
  return [
    input.title, input.summary, input.description, input.responsibilities, input.requirements,
    input.benefits, normalizeSkills(input.skills, 25), input.employmentType, input.workplace, input.seniority,
    input.locationCity, input.locationCountry, input.salaryMin, input.salaryMax,
    input.salaryMin == null && input.salaryMax == null ? null : input.salaryCurrency,
    input.salaryMin == null && input.salaryMax == null ? null : input.salaryPeriod ?? 'month',
    input.closesAt,
  ];
}

export async function createJob(tx: Queryable, userId: string, input: JobInput): Promise<JobDetail> {
  await assertMember(tx, input.companyId, userId);
  const slug = `${slugify(input.title, 50)}-${randomSuffix(6)}`;
  const { rows } = await tx.query<{ id: string }>(
    `INSERT INTO public.jobs (
       title, summary, description, responsibilities, requirements, benefits, skills, employment_type,
       workplace, seniority, location_city, location_country, salary_min, salary_max, salary_currency,
       salary_period, closes_at, company_id, slug, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
     RETURNING id`,
    [...jobValues(input), input.companyId, slug, userId],
  );
  return (await findJobForMember(tx, rows[0]!.id, userId))!;
}

export async function updateJob(tx: Queryable, userId: string, jobId: string, input: Omit<JobInput, 'companyId'>) {
  if (!UUID.test(jobId)) throw notFound('Job not found');
  const { rows } = await tx.query<{ id: string }>(
    `UPDATE public.jobs j SET
       title = $1, summary = $2, description = $3, responsibilities = $4, requirements = $5, benefits = $6,
       skills = $7, employment_type = $8, workplace = $9, seniority = $10, location_city = $11,
       location_country = $12, salary_min = $13, salary_max = $14, salary_currency = $15,
       salary_period = $16, closes_at = $17
     WHERE j.id = $18
       AND EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = j.company_id AND m.user_id = $19)
     RETURNING j.id`,
    [...jobValues(input), jobId, userId],
  );
  if (!rows[0]) throw notFound('Job not found');
  return (await findJobForMember(tx, jobId, userId))!;
}

/** Publish a draft (or reopen a closed job) and emit `projobs.job.published`. */
export async function publishJob(tx: Queryable, userId: string, jobId: string) {
  const job = await findJobForMember(tx, jobId, userId);
  if (!job) throw notFound('Job not found');
  if (job.status === 'published') return job;
  if (job.description.trim().length < 50) throw conflict('Add a description of at least 50 characters before publishing', 'job_incomplete');
  const status = job.companyProfile.verificationStatus;
  if (status === 'rejected') throw forbidden('This company did not pass verification', 'company_rejected');
  if (status === 'pending') {
    const { rows: published } = await tx.query<{ total: string }>(
      `SELECT count(*)::text AS total FROM public.jobs WHERE company_id = $1 AND status = 'published'`,
      [job.company.id],
    );
    if (Number(published[0]?.total ?? 0) >= PENDING_COMPANY_PUBLISHED_JOB_LIMIT) {
      throw conflict(
        `Unverified companies can keep up to ${PENDING_COMPANY_PUBLISHED_JOB_LIMIT} published jobs. Use a corporate email on your company domain or wait for review.`,
        'verification_pending_limit',
      );
    }
  }
  await tx.query(
    `UPDATE public.jobs SET status = 'published', published_at = now(),
       closes_at = CASE WHEN closes_at IS NOT NULL AND closes_at <= now() THEN NULL ELSE closes_at END
     WHERE id = $1`,
    [jobId],
  );
  const published = (await findJobForMember(tx, jobId, userId))!;
  await publishEvent(tx, 'projobs.job.published', 'job', jobId, {
    jobId,
    companyId: published.company.id,
    title: published.title,
    skills: published.skills,
    workplace: published.workplace,
    seniority: published.seniority,
    publishedAt: published.publishedAt,
  });
  return published;
}

export async function closeJob(tx: Queryable, userId: string, jobId: string) {
  const job = await findJobForMember(tx, jobId, userId);
  if (!job) throw notFound('Job not found');
  if (job.status === 'closed') return job;
  if (job.status === 'draft') throw conflict('Draft jobs cannot be closed', 'job_not_published');
  await tx.query(`UPDATE public.jobs SET status = 'closed' WHERE id = $1`, [jobId]);
  await publishEvent(tx, 'projobs.job.closed', 'job', jobId, { jobId, companyId: job.company.id });
  return (await findJobForMember(tx, jobId, userId))!;
}
