import type {
  EmploymentType,
  FacetCount,
  JobDetail,
  JobSearchResponse,
  JobSort,
  Seniority,
  Workplace,
} from '../contracts.js';
import type { Queryable } from '../db/database.js';
import { computeMatch } from '../domain/skills.js';
import { fold, toPrefixTsQuery } from '../domain/text.js';
import { JOB_DETAIL_COLUMNS, JOB_SUMMARY_COLUMNS, toJobDetail, toJobSummary } from './mappers.js';

export interface JobSearchParams {
  q?: string;
  workplace?: Workplace[];
  employmentType?: EmploymentType[];
  seniority?: Seniority[];
  /** Jobs must require every listed skill (normalized). */
  skills?: string[];
  country?: string;
  location?: string;
  salaryMin?: number;
  postedWithinDays?: number;
  /** Candidate skills used for match badges and `sort=match`. */
  candidateSkills?: string[];
  sort: JobSort;
  page: number;
  pageSize: number;
}

/** Positional parameter collector for dynamic SQL. */
class Params {
  readonly values: unknown[] = [];
  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

function buildFilters(params: JobSearchParams, p: Params) {
  const where = [`j.status = 'published'`, `(j.closes_at IS NULL OR j.closes_at > now())`];
  let tsQuery: string | null = null;

  if (params.q) {
    const query = toPrefixTsQuery(params.q);
    const companyLike = p.add(`%${fold(params.q).trim()}%`);
    if (query) {
      tsQuery = p.add(query);
      where.push(`(j.search_vector @@ to_tsquery('simple', ${tsQuery}) OR public.projobs_fold(c.name) LIKE ${companyLike})`);
    } else {
      where.push(`public.projobs_fold(c.name) LIKE ${companyLike}`);
    }
  }
  if (params.workplace?.length) where.push(`j.workplace = ANY(${p.add(params.workplace)}::text[])`);
  if (params.employmentType?.length) where.push(`j.employment_type = ANY(${p.add(params.employmentType)}::text[])`);
  if (params.seniority?.length) where.push(`j.seniority = ANY(${p.add(params.seniority)}::text[])`);
  if (params.skills?.length) where.push(`j.skills @> ${p.add(params.skills)}::text[]`);
  if (params.country) where.push(`j.location_country = ${p.add(params.country)}`);
  if (params.location) where.push(`public.projobs_fold(j.location_city) LIKE ${p.add(`%${fold(params.location).trim()}%`)}`);
  if (params.salaryMin != null) where.push(`COALESCE(j.salary_max, j.salary_min) >= ${p.add(params.salaryMin)}`);
  if (params.postedWithinDays != null) {
    where.push(`j.published_at >= now() - make_interval(days => ${p.add(params.postedWithinDays)})`);
  }
  return { where: where.join(' AND '), tsQuery };
}

export async function searchJobs(tx: Queryable, params: JobSearchParams): Promise<JobSearchResponse> {
  // Facets and total share one scan of the filtered set.
  const facetParams = new Params();
  const facetFilter = buildFilters(params, facetParams);
  const facetRows = await tx.query<{ facet: string; value: string; count: number }>(
    `WITH filtered AS (
       SELECT j.workplace, j.employment_type, j.seniority, j.skills
       FROM public.jobs j JOIN public.companies c ON c.id = j.company_id
       WHERE ${facetFilter.where}
     )
     SELECT 'total' AS facet, 'all' AS value, count(*)::int AS count FROM filtered
     UNION ALL SELECT 'workplace', workplace, count(*)::int FROM filtered GROUP BY workplace
     UNION ALL SELECT 'employmentType', employment_type, count(*)::int FROM filtered GROUP BY employment_type
     UNION ALL SELECT 'seniority', seniority, count(*)::int FROM filtered GROUP BY seniority
     UNION ALL (SELECT 'skills', skill, count(*)::int FROM filtered, unnest(skills) AS skill
                GROUP BY skill ORDER BY 3 DESC, 2 LIMIT 20)`,
    facetParams.values,
  );

  const facets: JobSearchResponse['facets'] = { workplace: [], employmentType: [], seniority: [], skills: [] };
  let total = 0;
  for (const row of facetRows.rows) {
    const count = Number(row.count);
    if (row.facet === 'total') total = count;
    else (facets[row.facet as keyof typeof facets] as FacetCount[]).push({ value: row.value, count });
  }
  for (const key of ['workplace', 'employmentType', 'seniority'] as const) {
    facets[key].sort((a, b) => b.count - a.count);
  }

  if (total === 0) return { items: [], total, page: params.page, pageSize: params.pageSize, facets };

  const p = new Params();
  const { where, tsQuery } = buildFilters(params, p);
  const candidateSkills = params.candidateSkills ?? [];
  const order: string[] = [];

  switch (params.sort) {
    case 'relevance':
      if (tsQuery) order.push(`ts_rank_cd(j.search_vector, to_tsquery('simple', ${tsQuery})) DESC`);
      break;
    case 'salary':
      order.push('COALESCE(j.salary_max, j.salary_min) DESC NULLS LAST');
      break;
    case 'match':
      if (candidateSkills.length) {
        const owned = p.add(candidateSkills);
        order.push(`(SELECT count(*) FROM unnest(j.skills) AS s WHERE s = ANY(${owned}::text[]))::float
                    / GREATEST(cardinality(j.skills), 1) DESC`);
      }
      break;
    case 'recent':
      break;
  }
  order.push('j.published_at DESC', 'j.id');

  const limit = p.add(params.pageSize);
  const offset = p.add((params.page - 1) * params.pageSize);
  const { rows } = await tx.query(
    `SELECT ${JOB_SUMMARY_COLUMNS}
     FROM public.jobs j JOIN public.companies c ON c.id = j.company_id
     WHERE ${where}
     ORDER BY ${order.join(', ')}
     LIMIT ${limit} OFFSET ${offset}`,
    p.values,
  );

  const items = rows.map((row) => {
    const job = toJobSummary(row);
    return candidateSkills.length ? { ...job, match: computeMatch(job.skills, candidateSkills) } : job;
  });
  return { items, total, page: params.page, pageSize: params.pageSize, facets };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public detail: published or closed jobs, addressed by id or slug. */
export async function findPublicJob(tx: Queryable, idOrSlug: string): Promise<JobDetail | null> {
  const column = UUID.test(idOrSlug) ? 'j.id' : 'j.slug';
  const { rows } = await tx.query(
    `SELECT ${JOB_DETAIL_COLUMNS}
     FROM public.jobs j JOIN public.companies c ON c.id = j.company_id
     WHERE ${column} = $1 AND j.status IN ('published', 'closed')`,
    [UUID.test(idOrSlug) ? idOrSlug.toLowerCase() : idOrSlug],
  );
  return rows[0] ? toJobDetail(rows[0]) : null;
}

/** Any status, only for members of the owning company (employer preview/edit). */
export async function findJobForMember(tx: Queryable, jobId: string, userId: string): Promise<JobDetail | null> {
  if (!UUID.test(jobId)) return null;
  const { rows } = await tx.query(
    `SELECT ${JOB_DETAIL_COLUMNS}
     FROM public.jobs j
     JOIN public.companies c ON c.id = j.company_id
     JOIN public.company_members m ON m.company_id = j.company_id AND m.user_id = $2
     WHERE j.id = $1`,
    [jobId, userId],
  );
  return rows[0] ? toJobDetail(rows[0]) : null;
}

/** Similar open jobs by shared skills, excluding the job itself. */
export async function findSimilarJobs(tx: Queryable, jobId: string, skills: string[], limit = 4) {
  if (!skills.length) return [];
  const { rows } = await tx.query(
    `SELECT ${JOB_SUMMARY_COLUMNS}
     FROM public.jobs j JOIN public.companies c ON c.id = j.company_id
     WHERE j.status = 'published' AND j.id <> $1 AND j.skills && $2::text[]
       AND (j.closes_at IS NULL OR j.closes_at > now())
     ORDER BY cardinality(ARRAY(SELECT unnest(j.skills) INTERSECT SELECT unnest($2::text[]))) DESC,
              j.published_at DESC
     LIMIT $3`,
    [jobId, skills, limit],
  );
  return rows.map(toJobSummary);
}

export { UUID };
