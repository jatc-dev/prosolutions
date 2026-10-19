export interface ShareableJobsQuery {
  text: string;
  technology: string;
  modality: string;
  seniority: string;
}

export function parseJobsQuery(params: URLSearchParams): ShareableJobsQuery;
export function applyJobsQuery(current: URLSearchParams, query: ShareableJobsQuery): URLSearchParams;
export function clearJobsQuery(current: URLSearchParams): URLSearchParams;
