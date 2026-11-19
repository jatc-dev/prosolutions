/**
 * ProJobs public data contracts (API v2).
 *
 * Pure types with no runtime imports: shared by the API, the ProJobs web app
 * and future ProSolutions modules. Breaking changes require a new API version.
 */

export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'internship', 'temporary'] as const;
export const WORKPLACES = ['remote', 'hybrid', 'onsite'] as const;
export const SENIORITIES = ['intern', 'junior', 'mid', 'senior', 'lead', 'executive'] as const;
export const SALARY_PERIODS = ['year', 'month', 'hour'] as const;
export const JOB_STATUSES = ['draft', 'published', 'closed'] as const;
export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const;
export const PIPELINE_STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const;
export const APPLICATION_STAGES = [...PIPELINE_STAGES, 'withdrawn'] as const;
export const JOB_SORTS = ['relevance', 'recent', 'salary', 'match'] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type Workplace = (typeof WORKPLACES)[number];
export type Seniority = (typeof SENIORITIES)[number];
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];
export type CompanySize = (typeof COMPANY_SIZES)[number];
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];
export type JobSort = (typeof JOB_SORTS)[number];

export interface Salary {
  min: number | null;
  max: number | null;
  currency: string;
  period: SalaryPeriod;
}

export type CompanyVerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

export interface CompanySummary {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  industry: string | null;
  /** True once the company passed verification (email domain or manual review). */
  verified: boolean;
}

export interface Company extends CompanySummary {
  tagline: string | null;
  description: string | null;
  website: string | null;
  sizeRange: CompanySize | null;
  headquarters: string | null;
  verificationStatus: CompanyVerificationStatus;
}

export interface JobSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  company: CompanySummary;
  employmentType: EmploymentType;
  workplace: Workplace;
  seniority: Seniority;
  location: { city: string | null; country: string | null };
  salary: Salary | null;
  skills: string[];
  publishedAt: string | null;
  /** Present only when the request supplied candidate skills (`mySkills` param). */
  match?: MatchResult;
  /** Present only for signed-in candidates. */
  viewer?: { saved: boolean; applied: boolean };
}

export interface JobDetail extends JobSummary {
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  status: JobStatus;
  closesAt: string | null;
  companyProfile: Company;
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface JobSearchResponse {
  items: JobSummary[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    workplace: FacetCount[];
    employmentType: FacetCount[];
    seniority: FacetCount[];
    skills: FacetCount[];
  };
}

export interface MatchResult {
  /** 0-100 affinity between the candidate profile and the job. */
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
}

/** Candidate data snapshot stored with each application (immutable after submit). */
export interface CandidateProfile {
  fullName: string;
  email: string | null;
  phone: string | null;
  headline: string | null;
  summary: string | null;
  location: string | null;
  skills: string[];
  experience: Array<{ position: string; company: string; startDate: string | null; endDate: string | null; current: boolean }>;
  education: Array<{ degree: string; institution: string; endDate: string | null }>;
  links: Array<{ label: string; url: string }>;
}

export interface CvOption {
  id: string;
  title: string;
  updatedAt: string;
  headline: string | null;
  skillCount: number;
}

export interface ApplicationEvent {
  fromStage: ApplicationStage | null;
  toStage: ApplicationStage;
  actorType: 'candidate' | 'recruiter';
  note: string | null;
  createdAt: string;
}

export interface CandidateApplication {
  id: string;
  stage: ApplicationStage;
  job: JobSummary;
  match: MatchResult;
  source: 'procv' | 'manual';
  createdAt: string;
  updatedAt: string;
  timeline: ApplicationEvent[];
}

export interface PipelineApplication {
  id: string;
  stage: ApplicationStage;
  candidate: CandidateProfile;
  match: MatchResult;
  source: 'procv' | 'manual';
  coverLetter: string | null;
  createdAt: string;
  updatedAt: string;
  timeline: ApplicationEvent[];
}

export interface EmployerJob {
  id: string;
  slug: string;
  title: string;
  status: JobStatus;
  workplace: Workplace;
  employmentType: EmploymentType;
  seniority: Seniority;
  publishedAt: string | null;
  updatedAt: string;
  applicants: number;
  stageCounts: Record<ApplicationStage, number>;
}

export interface EmployerCompany extends Company {
  role: 'owner' | 'recruiter';
}

export interface SessionInfo {
  userId: string;
  email: string | null;
  isCandidate: boolean;
  /** PRORECRUIT grant or membership in at least one company (self-service). */
  isRecruiter: boolean;
  companies: EmployerCompany[];
}

export type AlertFrequency = 'daily' | 'weekly';

/** Saved search delivered by email. `query` uses the public search filters. */
export interface JobAlert {
  id: string;
  label: string | null;
  email: string;
  query: Record<string, string>;
  frequency: AlertFrequency;
  active: boolean;
  lastSentAt: string | null;
  createdAt: string;
}

/** Integration event envelope published through the transactional outbox. */
export interface IntegrationEvent<TPayload = Record<string, unknown>> {
  id: number;
  type:
    | 'projobs.job.published'
    | 'projobs.job.closed'
    | 'projobs.application.submitted'
    | 'projobs.application.stage_changed'
    | 'projobs.application.withdrawn';
  aggregateType: 'job' | 'application';
  aggregateId: string;
  occurredAt: string;
  payload: TPayload;
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
