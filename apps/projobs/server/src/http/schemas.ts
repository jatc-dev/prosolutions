import { z } from 'zod';
import {
  COMPANY_SIZES,
  EMPLOYMENT_TYPES,
  JOB_SORTS,
  PIPELINE_STAGES,
  SALARY_PERIODS,
  SENIORITIES,
  WORKPLACES,
} from '../contracts.js';
import { normalizeSkills } from '../domain/skills.js';

/** Comma-separated query values ("remote,hybrid") restricted to an allow-list. */
const csvEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .optional()
    .transform((raw) => (raw ? raw.split(',').map((value) => value.trim()).filter(Boolean) : []))
    .pipe(z.array(z.enum(values)).max(values.length));

const csvSkills = z
  .string()
  .max(1000)
  .optional()
  .transform((raw) => (raw ? normalizeSkills(raw.split(','), 30) : []));

/** Partner feed search (Careerjet): only keywords, location and page are forwarded. */
export const externalJobsQuery = z.object({
  q: z.string().trim().max(120).default(''),
  location: z.string().trim().max(80).default(''),
  page: z.coerce.number().int().min(1).max(10).default(1),
});

export const jobSearchQuery = z.object({
  q: z.string().trim().max(120).optional(),
  workplace: csvEnum(WORKPLACES),
  type: csvEnum(EMPLOYMENT_TYPES),
  seniority: csvEnum(SENIORITIES),
  skills: csvSkills,
  /** Candidate skills (from the user's ProCV profile) for match badges/sorting. */
  mySkills: csvSkills,
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional(),
  location: z.string().trim().max(80).optional(),
  salaryMin: z.coerce.number().int().min(0).max(100_000_000).optional(),
  postedWithin: z.coerce.number().int().refine((days) => [1, 3, 7, 14, 30].includes(days)).optional(),
  sort: z.enum(JOB_SORTS).default('relevance'),
  page: z.coerce.number().int().min(1).max(100).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

const httpsUrl = z.string().trim().url().max(300).regex(/^https:\/\//, 'Must use https');
const bulletList = z.array(z.string().trim().min(1).max(300)).max(20).default([]);

export const companyInput = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(80).optional(),
  tagline: optionalText(160),
  description: optionalText(5000),
  website: z.string().trim().url().max(300).regex(/^https?:\/\//).nullish().transform((v) => v ?? null),
  logoUrl: httpsUrl.nullish().transform((v) => v ?? null),
  industry: optionalText(80),
  sizeRange: z.enum(COMPANY_SIZES).nullish().transform((v) => v ?? null),
  headquarters: optionalText(120),
});

export const companyPatch = companyInput.partial();

const jobBase = z.object({
    companyId: z.string().uuid(),
    title: z.string().trim().min(3).max(140),
    summary: z.string().trim().max(300).default(''),
    description: z.string().trim().min(1).max(20_000),
    responsibilities: bulletList,
    requirements: bulletList,
    benefits: bulletList,
    skills: z.array(z.string().trim().min(1).max(40)).max(25).default([]),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    workplace: z.enum(WORKPLACES),
    seniority: z.enum(SENIORITIES),
    locationCity: optionalText(80),
    locationCountry: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).nullish().transform((v) => v ?? null),
    salaryMin: z.number().int().min(0).max(100_000_000).nullish().transform((v) => v ?? null),
    salaryMax: z.number().int().min(0).max(100_000_000).nullish().transform((v) => v ?? null),
    salaryCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).nullish().transform((v) => v ?? null),
    salaryPeriod: z.enum(SALARY_PERIODS).nullish().transform((v) => v ?? null),
    closesAt: z.string().datetime({ offset: true }).nullish().transform((v) => v ?? null),
});

type JobFields = Omit<z.infer<typeof jobBase>, 'companyId'>;

function validateJob(job: JobFields, ctx: z.RefinementCtx) {
    if (job.salaryMin != null && job.salaryMax != null && job.salaryMax < job.salaryMin) {
      ctx.addIssue({ code: 'custom', path: ['salaryMax'], message: 'salaryMax must be >= salaryMin' });
    }
    if ((job.salaryMin != null || job.salaryMax != null) && !job.salaryCurrency) {
      ctx.addIssue({ code: 'custom', path: ['salaryCurrency'], message: 'Currency is required with a salary' });
    }
    if (job.workplace !== 'remote' && !job.locationCity) {
      ctx.addIssue({ code: 'custom', path: ['locationCity'], message: 'City is required for hybrid/onsite jobs' });
    }
}

export const jobInput = jobBase.superRefine(validateJob);
export const jobUpdate = jobBase.omit({ companyId: true }).superRefine(validateJob);

export const applicationInput = z
  .object({
    cvId: z.string().trim().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(),
    coverLetter: optionalText(5000),
    /** Explicit consent to share the CV with the hiring company (Ley 1581 / GDPR). */
    consentToShare: z.literal(true, { message: 'Consent to share your CV with the company is required' }),
    /** Manual profile for candidates without a ProCV CV. */
    profile: z
      .object({
        fullName: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(200).nullish().transform((v) => v ?? null),
        phone: optionalText(40),
        headline: optionalText(160),
        summary: optionalText(2000),
        location: optionalText(120),
        skills: z.array(z.string().trim().min(1).max(40)).max(40).default([]),
        links: z.array(z.object({ label: z.string().trim().max(40), url: z.string().trim().url().max(300) })).max(8).default([]),
      })
      .optional(),
  })
  .refine((input) => Boolean(input.cvId) !== Boolean(input.profile), {
    message: 'Provide either cvId (ProCV) or a manual profile',
  });

export const stageChange = z.object({
  stage: z.enum(PIPELINE_STAGES),
  note: optionalText(2000),
});

export const eventsQuery = z.object({
  after: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const matchQuery = z.object({
  cvId: z.string().trim().regex(/^[A-Za-z0-9_-]{1,64}$/),
});

export const alertInput = z.object({
  label: optionalText(120),
  frequency: z.enum(['daily', 'weekly']).default('daily'),
  /** Public search filters (same keys as the /empleos URL). */
  query: z.record(z.string(), z.string().max(200)).default({}),
});

export const companyVerification = z.object({
  status: z.enum(['pending', 'verified', 'rejected', 'suspended']),
  note: optionalText(500),
});

export const REPORT_REASONS = ['fraude', 'discriminacion', 'informacion-falsa', 'spam', 'otro'] as const;

export const jobReportInput = z.object({
  reason: z.enum(REPORT_REASONS),
  details: optionalText(1000),
});

export const jobModeration = z.object({
  action: z.enum(['pause', 'restore', 'dismiss']),
  note: optionalText(500),
});

export const companyListQuery = z.object({
  status: z.enum(['pending', 'verified', 'rejected', 'suspended', 'all']).default('pending'),
});

export const moderationListQuery = z.object({
  filter: z.enum(['reported', 'paused', 'all']).default('reported'),
});
