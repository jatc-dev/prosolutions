import { cn } from "@prosolutions/ui";
import { Bookmark, BookmarkCheck, CheckCircle2, MapPin, Wallet } from "lucide-react";
import type { JobSummary } from "../../server/src/contracts";
import { EMPLOYMENT_LABEL, SENIORITY_LABEL, WORKPLACE_LABEL, formatLocation, formatSalary, timeAgo } from "../lib/format";
import { CompanyLogo, MatchBadge } from "./primitives";

interface JobCardProps {
  job: JobSummary;
  selected?: boolean;
  href: string;
  onSelect?: (job: JobSummary) => void;
  onToggleSave?: (job: JobSummary) => void;
}

export function JobCard({ job, selected, href, onSelect, onToggleSave }: JobCardProps) {
  const salary = formatSalary(job.salary);
  const saved = job.viewer?.saved;
  return (
    <article
      className={cn(
        "group relative rounded-2xl border bg-ui-surface p-4 shadow-card transition-all hover:border-brand-400 hover:shadow-panel sm:p-5",
        selected ? "border-brand-500 ring-2 ring-brand-500/30" : "border-ui-border",
      )}
    >
      <div className="flex gap-4">
        <CompanyLogo company={job.company} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold leading-snug text-ui-text">
                <a
                  href={href}
                  onClick={(event) => {
                    if (!onSelect || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                    event.preventDefault();
                    onSelect(job);
                  }}
                  className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none group-focus-within:underline"
                  aria-current={selected ? "true" : undefined}
                >
                  {job.title}
                </a>
              </h3>
              <p className="mt-0.5 truncate text-sm text-ui-muted">{job.company.name}</p>
            </div>
            {onToggleSave && (
              <button
                type="button"
                onClick={() => onToggleSave(job)}
                aria-pressed={Boolean(saved)}
                aria-label={saved ? `Quitar ${job.title} de guardados` : `Guardar ${job.title}`}
                className="relative z-10 rounded-lg p-1.5 text-ui-muted hover:bg-ui-soft hover:text-brand-600"
              >
                {saved ? <BookmarkCheck className="h-5 w-5 text-brand-600" /> : <Bookmark className="h-5 w-5" />}
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ui-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {formatLocation(job.location, job.workplace)}
            </span>
            {salary && (
              <span className="inline-flex items-center gap-1 font-medium text-ui-text">
                <Wallet className="h-4 w-4 text-ui-muted" aria-hidden="true" />
                {salary}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
              {WORKPLACE_LABEL[job.workplace]}
            </span>
            <span className="rounded-lg bg-ui-soft px-2 py-0.5 text-xs font-medium text-ui-text">{SENIORITY_LABEL[job.seniority]}</span>
            <span className="rounded-lg bg-ui-soft px-2 py-0.5 text-xs font-medium text-ui-text">{EMPLOYMENT_LABEL[job.employmentType]}</span>
            {job.match && <MatchBadge match={job.match} />}
            {job.viewer?.applied && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Postulado
              </span>
            )}
            <span className="ml-auto text-xs text-ui-muted">{timeAgo(job.publishedAt)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-ui-border bg-ui-surface p-5" aria-hidden="true">
      <div className="flex gap-4">
        <div className="h-12 w-12 rounded-xl bg-ui-soft" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-2/3 rounded bg-ui-soft" />
          <div className="h-3 w-1/3 rounded bg-ui-soft" />
          <div className="h-3 w-1/2 rounded bg-ui-soft" />
        </div>
      </div>
    </div>
  );
}
