export type JobSource = "Arbeitnow" | "Remotive" | "ProJobs";
export type JobModality = "remote" | "hybrid" | "onsite";
export type JobSeniority = "intern" | "junior" | "mid" | "senior" | "lead" | "unknown";

export interface JobPosting {
  /** Stable slug used in the public detail route (/projobs/:slug). */
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: JobSource;
  technologies: string[];
  modality: JobModality;
  seniority: JobSeniority;
  /** ISO date string when the source provides one. */
  publishedAt?: string;
}

export interface JobsQuery {
  text: string;
  technology: string;
  modality: string;
  seniority: string;
}

export interface JobsResponse {
  jobs: JobPosting[];
  /** Where the payload came from: live aggregation or the bundled snapshot. */
  source: "live" | "snapshot";
  updatedAt: string;
}

export const MODALITY_LABELS: Record<JobModality, string> = {
  remote: "Remoto",
  hybrid: "Híbrido",
  onsite: "Presencial",
};

export const SENIORITY_LABELS: Record<JobSeniority, string> = {
  intern: "Prácticas",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead / Head",
  unknown: "Sin especificar",
};

export const EMPTY_QUERY: JobsQuery = { text: "", technology: "", modality: "", seniority: "" };
