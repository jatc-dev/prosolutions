import type {
  ApplicationEvent,
  Company,
  CompanySummary,
  JobDetail,
  JobSummary,
  Salary,
} from '../contracts.js';

/** Columns selected for job summaries (alias j = jobs, c = companies). */
export const JOB_SUMMARY_COLUMNS = `
  j.id, j.slug, j.title, j.summary, j.employment_type, j.workplace, j.seniority,
  j.location_city, j.location_country, j.salary_min, j.salary_max, j.salary_currency,
  j.salary_period, j.skills, j.published_at,
  c.id AS company_id, c.slug AS company_slug, c.name AS company_name,
  c.logo_url AS company_logo_url, c.industry AS company_industry`;

export const JOB_DETAIL_COLUMNS = `${JOB_SUMMARY_COLUMNS},
  j.description, j.responsibilities, j.requirements, j.benefits, j.status, j.closes_at,
  c.tagline AS company_tagline, c.description AS company_description, c.website AS company_website,
  c.size_range AS company_size_range, c.headquarters AS company_headquarters`;

export const COMPANY_COLUMNS = `
  c.id, c.slug, c.name, c.logo_url, c.industry, c.tagline, c.description,
  c.website, c.size_range, c.headquarters`;

type Row = Record<string, any>;

export const iso = (value: unknown): string | null =>
  value instanceof Date ? value.toISOString() : typeof value === 'string' ? new Date(value).toISOString() : null;

const textArray = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

function salaryOf(row: Row): Salary | null {
  if (row.salary_min == null && row.salary_max == null) return null;
  return {
    min: row.salary_min == null ? null : Number(row.salary_min),
    max: row.salary_max == null ? null : Number(row.salary_max),
    currency: String(row.salary_currency ?? '').trim(),
    period: row.salary_period ?? 'month',
  };
}

export function toCompanySummary(row: Row, prefix = 'company_'): CompanySummary {
  return {
    id: row[`${prefix}id`],
    slug: row[`${prefix}slug`],
    name: row[`${prefix}name`],
    logoUrl: row[`${prefix}logo_url`] ?? null,
    industry: row[`${prefix}industry`] ?? null,
  };
}

export function toCompany(row: Row): Company {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logoUrl: row.logo_url ?? null,
    industry: row.industry ?? null,
    tagline: row.tagline ?? null,
    description: row.description ?? null,
    website: row.website ?? null,
    sizeRange: row.size_range ?? null,
    headquarters: row.headquarters ?? null,
  };
}

export function toJobSummary(row: Row): JobSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? '',
    company: toCompanySummary(row),
    employmentType: row.employment_type,
    workplace: row.workplace,
    seniority: row.seniority,
    location: { city: row.location_city ?? null, country: row.location_country?.trim() ?? null },
    salary: salaryOf(row),
    skills: textArray(row.skills),
    publishedAt: iso(row.published_at),
  };
}

export function toJobDetail(row: Row): JobDetail {
  return {
    ...toJobSummary(row),
    description: row.description,
    responsibilities: textArray(row.responsibilities),
    requirements: textArray(row.requirements),
    benefits: textArray(row.benefits),
    status: row.status,
    closesAt: iso(row.closes_at),
    companyProfile: {
      ...toCompanySummary(row),
      tagline: row.company_tagline ?? null,
      description: row.company_description ?? null,
      website: row.company_website ?? null,
      sizeRange: row.company_size_range ?? null,
      headquarters: row.company_headquarters ?? null,
    },
  };
}

/** SQL fragment: chronological timeline for application alias `a`. */
export const TIMELINE_SUBQUERY = `
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'fromStage', e.from_stage, 'toStage', e.to_stage, 'actorType', e.actor_type,
      'note', e.note, 'createdAt', e.created_at) ORDER BY e.created_at, e.id)
    FROM public.application_events e WHERE e.application_id = a.id
  ), '[]'::jsonb)`;

export function toTimeline(value: unknown): ApplicationEvent[] {
  const events = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(events)) return [];
  return events.map((event) => ({
    fromStage: event.fromStage ?? null,
    toStage: event.toStage,
    actorType: event.actorType,
    note: event.note ?? null,
    createdAt: iso(event.createdAt) ?? String(event.createdAt),
  }));
}

export const json = <T>(value: unknown): T => (typeof value === 'string' ? JSON.parse(value) : value) as T;
