import { useCallback, useEffect, useMemo, useState } from "react";
import { publicApi } from "../../../shared/services/api";
import snapshot from "../data/jobsSnapshot.json";
import { normalizeJobs, sortJobs } from "../lib/derive";
import type { JobsResponse } from "../types";

const API_PATH = "/public/jobs";

/**
 * Loads the job board.
 *
 * The API is the source of truth (server-side aggregation + cache). If it is
 * unreachable the module falls back to the bundled snapshot so the board is
 * never an empty page, and reports which source is active.
 */
export function useJobs() {
  const fallbackJobs = useMemo(() => sortJobs(normalizeJobs(snapshot)), []);

  const [jobs, setJobs] = useState(() => fallbackJobs);
  const [source, setSource] = useState<JobsResponse["source"]>("snapshot");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await publicApi.get<JobsResponse>(API_PATH);
      const live = normalizeJobs(response.data?.jobs);
      if (live.length > 0) {
        setJobs(sortJobs(live));
        setSource(response.data.source === "live" ? "live" : "snapshot");
        setUpdatedAt(response.data.updatedAt ?? null);
      } else {
        // Empty payload: keep the snapshot instead of showing a blank board.
        setJobs(fallbackJobs);
        setSource("snapshot");
      }
    } catch {
      setError("jobs.loadError");
      setJobs(fallbackJobs);
      setSource("snapshot");
    } finally {
      setLoading(false);
    }
  }, [fallbackJobs]);

  useEffect(() => {
    void load();
  }, [load]);

  return { jobs, source, updatedAt, loading, error, reload: load, snapshotCount: fallbackJobs.length };
}
