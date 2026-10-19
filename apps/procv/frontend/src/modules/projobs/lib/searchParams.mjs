/* global URLSearchParams */
const FILTER_KEYS = ["q", "tech", "modality", "seniority"];

export function parseJobsQuery(params) {
  return {
    text: params.get("q") ?? "",
    technology: params.get("tech") ?? "",
    modality: params.get("modality") ?? "",
    seniority: params.get("seniority") ?? "",
  };
}

export function applyJobsQuery(current, query) {
  const params = new URLSearchParams(current);
  const values = [
    ["q", query.text],
    ["tech", query.technology],
    ["modality", query.modality],
    ["seniority", query.seniority],
  ];

  for (const [key, value] of values) {
    const normalized = value.trim();
    if (normalized) params.set(key, normalized);
    else params.delete(key);
  }

  return params;
}

export function clearJobsQuery(current) {
  const params = new URLSearchParams(current);
  for (const key of FILTER_KEYS) params.delete(key);
  return params;
}
