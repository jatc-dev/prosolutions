import { useEffect, useState } from "react";
import { trackEvent } from "@prosolutions/ui";
import type { JobSummary } from "../../server/src/contracts";
import { useSession } from "./session";

let cachedSkills: { userId: string; skills: string[] } | null = null;

/** Skills from the signed-in candidate's latest ProCV CV (cached per session). */
export function useMySkills(): string[] {
  const { status, session, request } = useSession();
  const userId = status === "authenticated" && session?.isCandidate ? session.userId : null;
  const [skills, setSkills] = useState<string[]>(() => (cachedSkills && cachedSkills.userId === userId ? cachedSkills.skills : []));

  useEffect(() => {
    if (!userId) {
      setSkills([]);
      return;
    }
    if (cachedSkills?.userId === userId) {
      setSkills(cachedSkills.skills);
      return;
    }
    let cancelled = false;
    request<{ skills: string[] }>("/api/me/skills")
      .then(({ skills: loaded }) => {
        cachedSkills = { userId, skills: loaded };
        if (!cancelled) setSkills(loaded);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId, request]);

  return skills;
}

/** Optimistic save/unsave toggle shared by search, detail and saved pages. */
export function useSaveToggle() {
  const { status, session, request, signIn } = useSession();
  return async <T extends JobSummary>(job: T, apply: (next: T) => void) => {
    if (status !== "authenticated" || !session?.isCandidate) {
      signIn();
      return;
    }
    const saved = !job.viewer?.saved;
    apply({ ...job, viewer: { applied: Boolean(job.viewer?.applied), saved } });
    try {
      await request(`/api/me/saved-jobs/${job.id}`, { method: saved ? "PUT" : "DELETE" });
      trackEvent(saved ? "job_save" : "job_unsave");
    } catch {
      apply(job);
    }
  };
}
