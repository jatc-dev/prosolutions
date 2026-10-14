import type { JobModality, JobPosting, JobSeniority, JobSource, JobsQuery } from "../types";

/**
 * Data layer for ProJobs: normalization, derivation of filter facets and
 * search. Kept free of React so it can be unit-tested and reused by the API
 * route, the list view and the detail view.
 */

/** Canonical technology dictionary used to derive filter facets. */
export const TECHNOLOGIES = [
  "TypeScript",
  "JavaScript",
  "React",
  "Angular",
  "Vue",
  "NestJS",
  "Node.js",
  "Python",
  "Django",
  "Java",
  "Kotlin",
  "Swift",
  "Go",
  "Rust",
  "PHP",
  "Laravel",
  "Ruby",
  "Ruby on Rails",
  "C++",
  "C#",
  ".NET",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "AWS",
  "Azure",
  "Google Cloud",
  "Docker",
  "Kubernetes",
  "Terraform",
  "DevOps",
  "GraphQL",
  "REST",
  "Machine Learning",
  "Data Science",
  "Data Engineering",
  "QA",
  "Cypress",
  "Playwright",
  "Selenium",
  "Cybersecurity",
  "Information Security",
  "Product Management",
  "UX Design",
  "UI Design",
  "Electrical Engineering",
  "Embedded Systems",
] as const;

const TECH_PATTERNS: Array<[RegExp, string]> = TECHNOLOGIES.map((tech) => [
  new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(tech).replace(/ /g, "[\\s-/]?")}([^a-z0-9+#]|$)`, "i"),
  tech,
]);

const MODALITY_PATTERNS: Array<[RegExp, JobModality]> = [
  [/\b(hybrid|híbrido|teilarbeit)\b/i, "hybrid"],
  [/\b(remote|remoto|remote-first|worldwide|anywhere|global|latam)\b/i, "remote"],
];

const SENIORITY_PATTERNS: Array<[RegExp, JobSeniority]> = [
  [/\b(intern|internship|werkstudent|práctica|prácticas|practicante|student)\b/i, "intern"],
  [/\b(lead|head of|principal|staff|director|architect|cto)\b/i, "lead"],
  [/\b(senior|sr\.?|experto)\b/i, "senior"],
  [/\b(junior|jr\.?|trainee|entry level)\b/i, "junior"],
  [/\b(mid|semi senior|semi-senior|intermediate)\b/i, "mid"],
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function detectTechnologies(text: string): string[] {
  const found = new Set<string>();
  for (const [pattern, tech] of TECH_PATTERNS) {
    if (pattern.test(text)) found.add(tech);
  }
  return [...found];
}

function detectModality(text: string): JobModality {
  for (const [pattern, modality] of MODALITY_PATTERNS) {
    if (pattern.test(text)) return modality;
  }
  return "onsite";
}

function detectSeniority(text: string): JobSeniority {
  for (const [pattern, seniority] of SENIORITY_PATTERNS) {
    if (pattern.test(text)) return seniority;
  }
  return "unknown";
}

export interface RawJob {
  title?: unknown;
  company?: unknown;
  location?: unknown;
  url?: unknown;
  source?: unknown;
  publishedAt?: unknown;
}

const SOURCES: JobSource[] = ["Arbeitnow", "Remotive", "ProJobs"];

function normalizeSource(value: unknown): JobSource {
  if (typeof value === "string") {
    const match = SOURCES.find((source) => source.toLowerCase() === value.trim().toLowerCase());
    if (match) return match;
  }
  return "ProJobs";
}

/** Converts an untrusted upstream payload into a `JobPosting`. */
export function normalizeJob(raw: RawJob): JobPosting | null {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) return null;

  const company = typeof raw.company === "string" && raw.company.trim() ? raw.company.trim() : "Empresa confidencial";
  const location = typeof raw.location === "string" && raw.location.trim() ? raw.location.trim() : "Remoto";
  const url = typeof raw.url === "string" && raw.url.trim() ? raw.url.trim() : "#";
  const haystack = `${title} ${company} ${location}`;
  const id = `${slugify(title)}-${slugify(company)}`;
  const publishedAt = typeof raw.publishedAt === "string" ? raw.publishedAt : undefined;

  return {
    id: id || slugify(Math.random().toString(36).slice(2)),
    title,
    company,
    location,
    url,
    source: normalizeSource(raw.source),
    technologies: detectTechnologies(haystack),
    modality: detectModality(`${haystack} ${typeof raw.source === "string" ? raw.source : ""}`),
    seniority: detectSeniority(haystack),
    publishedAt,
  };
}

export function normalizeJobs(input: unknown): JobPosting[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const jobs: JobPosting[] = [];
  for (const raw of input) {
    const job = normalizeJob(raw as RawJob);
    if (!job || seen.has(job.id)) continue;
    seen.add(job.id);
    jobs.push(job);
  }
  return jobs;
}

export function matchesQuery(job: JobPosting, query: JobsQuery): boolean {
  const text = query.text.trim().toLowerCase();
  if (text) {
    const haystack = `${job.title} ${job.company} ${job.location} ${job.technologies.join(" ")} ${job.source}`.toLowerCase();
    const terms = text.split(/\s+/).filter(Boolean);
    if (!terms.every((term) => haystack.includes(term))) return false;
  }
  if (query.technology && !job.technologies.includes(query.technology)) return false;
  if (query.modality && job.modality !== query.modality) return false;
  if (query.seniority && job.seniority !== query.seniority) return false;
  return true;
}

export function filterJobs(jobs: JobPosting[], query: JobsQuery): JobPosting[] {
  return jobs.filter((job) => matchesQuery(job, query));
}

/** Distinct, alphabetically sorted technologies across the dataset. */
export function collectTechnologies(jobs: JobPosting[]): string[] {
  const unique = new Set<string>();
  jobs.forEach((job) => job.technologies.forEach((tech) => unique.add(tech)));
  return [...unique].sort((a, b) => a.localeCompare(b));
}

/** Most recently published first, falling back to the aggregated order. */
export function sortJobs(jobs: JobPosting[]): JobPosting[] {
  return [...jobs].sort((a, b) => {
    if (a.publishedAt && b.publishedAt && a.publishedAt !== b.publishedAt) {
      return b.publishedAt.localeCompare(a.publishedAt);
    }
    return a.title.localeCompare(b.title);
  });
}

export function findJobById(jobs: JobPosting[], id: string): JobPosting | undefined {
  return jobs.find((job) => job.id === id);
}
