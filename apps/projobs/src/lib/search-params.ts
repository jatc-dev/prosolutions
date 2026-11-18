import {
  EMPLOYMENT_TYPES,
  JOB_SORTS,
  SENIORITIES,
  WORKPLACES,
  type EmploymentType,
  type JobSort,
  type Seniority,
  type Workplace,
} from "../../server/src/contracts";

/** Search state, mirrored in the URL so every search is shareable and back/forward works. */
export interface JobFilters {
  q: string;
  location: string;
  workplace: Workplace[];
  type: EmploymentType[];
  seniority: Seniority[];
  skills: string[];
  salaryMin: number | null;
  postedWithin: number | null;
  sort: JobSort;
  page: number;
}

export const DEFAULT_FILTERS: JobFilters = {
  q: "",
  location: "",
  workplace: [],
  type: [],
  seniority: [],
  skills: [],
  salaryMin: null,
  postedWithin: null,
  sort: "relevance",
  page: 1,
};

const POSTED_WITHIN = [1, 3, 7, 14, 30];

function list<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]): T[] {
  const raw = params.get(key);
  if (!raw) return [];
  return [...new Set(raw.split(","))].filter((value): value is T => (allowed as readonly string[]).includes(value));
}

function positiveInt(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed > 0 ? parsed : null;
}

export function parseFilters(params: URLSearchParams): JobFilters {
  const sort = params.get("sort");
  const posted = positiveInt(params.get("posted"));
  return {
    q: (params.get("q") ?? "").slice(0, 120),
    location: (params.get("location") ?? "").slice(0, 80),
    workplace: list(params, "workplace", WORKPLACES),
    type: list(params, "type", EMPLOYMENT_TYPES),
    seniority: list(params, "seniority", SENIORITIES),
    skills: (params.get("skills") ?? "")
      .split(",")
      .map((skill) => skill.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10),
    salaryMin: positiveInt(params.get("salary")),
    postedWithin: posted && POSTED_WITHIN.includes(posted) ? posted : null,
    sort: sort && (JOB_SORTS as readonly string[]).includes(sort) ? (sort as JobSort) : "relevance",
    page: Math.min(positiveInt(params.get("page")) ?? 1, 100),
  };
}

/** Compact URL params: defaults are omitted. Extra keys (e.g. selected job) are preserved by callers. */
export function filtersToParams(filters: JobFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.location.trim()) params.set("location", filters.location.trim());
  if (filters.workplace.length) params.set("workplace", filters.workplace.join(","));
  if (filters.type.length) params.set("type", filters.type.join(","));
  if (filters.seniority.length) params.set("seniority", filters.seniority.join(","));
  if (filters.skills.length) params.set("skills", filters.skills.join(","));
  if (filters.salaryMin) params.set("salary", String(filters.salaryMin));
  if (filters.postedWithin) params.set("posted", String(filters.postedWithin));
  if (filters.sort !== "relevance") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

/** Query string for GET /api/jobs (API parameter names). */
export function toApiQuery(filters: JobFilters, mySkills: string[], pageSize = 20): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.location.trim()) params.set("location", filters.location.trim());
  if (filters.workplace.length) params.set("workplace", filters.workplace.join(","));
  if (filters.type.length) params.set("type", filters.type.join(","));
  if (filters.seniority.length) params.set("seniority", filters.seniority.join(","));
  if (filters.skills.length) params.set("skills", filters.skills.join(","));
  if (filters.salaryMin) params.set("salaryMin", String(filters.salaryMin));
  if (filters.postedWithin) params.set("postedWithin", String(filters.postedWithin));
  if (mySkills.length) params.set("mySkills", mySkills.slice(0, 30).join(","));
  const sort = filters.sort === "match" && !mySkills.length ? "relevance" : filters.sort;
  params.set("sort", sort);
  params.set("page", String(filters.page));
  params.set("pageSize", String(pageSize));
  return params.toString();
}

export function activeFilterCount(filters: JobFilters): number {
  return (
    filters.workplace.length +
    filters.type.length +
    filters.seniority.length +
    filters.skills.length +
    (filters.salaryMin ? 1 : 0) +
    (filters.postedWithin ? 1 : 0) +
    (filters.location ? 1 : 0)
  );
}

/** Filters as stored in a job alert (API search keys). Empty values are omitted. */
export function filtersToAlertQuery(filters: JobFilters): Record<string, string> {
  const query: Record<string, string> = {};
  if (filters.q.trim()) query.q = filters.q.trim();
  if (filters.location.trim()) query.location = filters.location.trim();
  if (filters.workplace.length) query.workplace = filters.workplace.join(",");
  if (filters.type.length) query.type = filters.type.join(",");
  if (filters.seniority.length) query.seniority = filters.seniority.join(",");
  if (filters.skills.length) query.skills = filters.skills.join(",");
  if (filters.salaryMin != null) query.salaryMin = String(filters.salaryMin);
  return query;
}
