import { Button, cn } from "@prosolutions/ui";
import { Bookmark, BookmarkCheck, Briefcase, Building2, CalendarClock, CheckCircle2, ExternalLink, Globe2, MapPin, Share2, Wallet } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { JobDetail, JobSummary, MatchResult } from "../../server/src/contracts";
import { EMPLOYMENT_LABEL, SENIORITY_LABEL, WORKPLACE_LABEL, formatDate, formatLocation, formatSalary, timeAgo } from "../lib/format";
import { useSession } from "../lib/session";
import { ApplyDialog } from "./ApplyDialog";
import { CompanyLogo, MatchBadge, SkillChip } from "./primitives";

interface JobDetailViewProps {
  job: JobDetail;
  similar?: JobSummary[];
  mySkills?: string[];
  onChange?: (patch: Partial<JobDetail>) => void;
  onToggleSave?: (job: JobSummary) => void;
  compact?: boolean;
}

function localMatch(jobSkills: string[], mySkills: string[]): MatchResult | null {
  if (!mySkills.length) return null;
  const owned = new Set(mySkills);
  const matchedSkills = jobSkills.filter((skill) => owned.has(skill));
  const missingSkills = jobSkills.filter((skill) => !owned.has(skill));
  return { score: jobSkills.length ? Math.round((matchedSkills.length / jobSkills.length) * 100) : 50, matchedSkills, missingSkills };
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h3 className="mb-2 text-base font-semibold">{title}</h3>
      <ul className="space-y-1.5 text-sm leading-relaxed text-ui-muted">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function JobDetailView({ job, similar = [], mySkills = [], onChange, onToggleSave, compact }: JobDetailViewProps) {
  const { status, session, signIn } = useSession();
  const [applyOpen, setApplyOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const match = job.match ?? localMatch(job.skills, mySkills);
  const salary = formatSalary(job.salary);
  const isOpen = job.status === "published" && (!job.closesAt || new Date(job.closesAt) > new Date());
  const applied = job.viewer?.applied;
  const shareUrl = `${window.location.origin}/empleos/${job.slug}`;

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: job.title, url: shareUrl });
      else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user dismissed share sheet */
    }
  };

  const applyButton = !isOpen ? (
    <Button disabled variant="secondary">Vacante cerrada</Button>
  ) : applied ? (
    <Button disabled variant="secondary">
      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Ya te postulaste
    </Button>
  ) : status === "authenticated" ? (
    session?.isCandidate ? (
      <Button onClick={() => setApplyOpen(true)} size="lg">Postularme</Button>
    ) : (
      <Button disabled variant="secondary" title="Tu cuenta no tiene el módulo ProJobs">Postulación no disponible</Button>
    )
  ) : (
    <Button onClick={signIn} size="lg" disabled={status === "loading"}>Inicia sesión para postularte</Button>
  );

  return (
    <div className={cn("text-ui-text", compact ? "space-y-6" : "space-y-8")}>
      <header className="space-y-4">
        <div className="flex items-start gap-4">
          <CompanyLogo company={job.company} size="lg" />
          <div className="min-w-0">
            <h1 className={cn("font-bold leading-tight", compact ? "text-2xl" : "text-3xl")}>{job.title}</h1>
            <p className="mt-1 text-ui-muted">
              <Link to={`/empresas/${job.company.slug}`} className="font-medium text-ui-text hover:text-brand-600 hover:underline">
                {job.company.name}
              </Link>
              {job.company.industry && <> · {job.company.industry}</>}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 text-ui-muted"><MapPin className="h-4 w-4" aria-hidden="true" /><dt className="sr-only">Ubicación</dt><dd>{formatLocation(job.location, job.workplace)}</dd></div>
          <div className="flex items-center gap-2 text-ui-muted"><Briefcase className="h-4 w-4" aria-hidden="true" /><dt className="sr-only">Tipo</dt><dd>{EMPLOYMENT_LABEL[job.employmentType]} · {SENIORITY_LABEL[job.seniority]}</dd></div>
          {salary && <div className="flex items-center gap-2 font-medium"><Wallet className="h-4 w-4 text-ui-muted" aria-hidden="true" /><dt className="sr-only">Salario</dt><dd>{salary}</dd></div>}
          <div className="flex items-center gap-2 text-ui-muted"><CalendarClock className="h-4 w-4" aria-hidden="true" /><dt className="sr-only">Publicada</dt><dd>Publicada {timeAgo(job.publishedAt)}{job.closesAt && ` · cierra ${formatDate(job.closesAt)}`}</dd></div>
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          {applyButton}
          {onToggleSave && status === "authenticated" && session?.isCandidate && (
            <Button variant="outline" onClick={() => onToggleSave(job)} aria-pressed={Boolean(job.viewer?.saved)}>
              {job.viewer?.saved ? <BookmarkCheck className="mr-1.5 h-4 w-4" /> : <Bookmark className="mr-1.5 h-4 w-4" />}
              {job.viewer?.saved ? "Guardada" : "Guardar"}
            </Button>
          )}
          <Button variant="ghost" onClick={share}>
            <Share2 className="mr-1.5 h-4 w-4" /> {copied ? "Enlace copiado" : "Compartir"}
          </Button>
        </div>
      </header>

      {match && job.skills.length > 0 && (
        <section className="rounded-2xl border border-ui-border bg-ui-soft/60 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Tu afinidad con esta vacante</h3>
            <MatchBadge match={match} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {match.matchedSkills.map((skill) => <SkillChip key={skill} skill={skill} state="matched" />)}
            {match.missingSkills.map((skill) => <SkillChip key={skill} skill={skill} state="missing" />)}
          </div>
          <p className="mt-2 text-xs text-ui-muted">Calculada con las habilidades de tu CV más reciente en ProCV.</p>
        </section>
      )}

      {!match && job.skills.length > 0 && (
        <section>
          <h3 className="mb-2 text-base font-semibold">Habilidades</h3>
          <div className="flex flex-wrap gap-1.5">{job.skills.map((skill) => <SkillChip key={skill} skill={skill} />)}</div>
        </section>
      )}

      {job.summary && <p className="text-base font-medium leading-relaxed">{job.summary}</p>}
      <section>
        <h3 className="mb-2 text-base font-semibold">Sobre el rol</h3>
        <p className="whitespace-pre-line text-sm leading-relaxed text-ui-muted">{job.description}</p>
      </section>
      <BulletList title="Responsabilidades" items={job.responsibilities} />
      <BulletList title="Requisitos" items={job.requirements} />
      <BulletList title="Beneficios" items={job.benefits} />

      <section className="rounded-2xl border border-ui-border p-4">
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold"><Building2 className="h-4 w-4" aria-hidden="true" /> Sobre {job.companyProfile.name}</h3>
        {job.companyProfile.tagline && <p className="text-sm font-medium">{job.companyProfile.tagline}</p>}
        {job.companyProfile.description && <p className="mt-1 text-sm text-ui-muted">{job.companyProfile.description}</p>}
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-ui-muted">
          {job.companyProfile.sizeRange && <span>{job.companyProfile.sizeRange} personas</span>}
          {job.companyProfile.headquarters && <span>{job.companyProfile.headquarters}</span>}
          {job.companyProfile.website && (
            <a href={job.companyProfile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
              <Globe2 className="h-4 w-4" aria-hidden="true" /> Sitio web <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </section>

      {similar.length > 0 && (
        <section>
          <h3 className="mb-3 text-base font-semibold">Vacantes similares</h3>
          <ul className="space-y-2">
            {similar.map((item) => (
              <li key={item.id}>
                <Link to={`/empleos/${item.slug}`} className="flex items-center gap-3 rounded-xl border border-ui-border p-3 hover:border-brand-400">
                  <CompanyLogo company={item.company} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-ui-muted">{item.company.name} · {WORKPLACE_LABEL[item.workplace]}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {applyOpen && (
        <ApplyDialog
          job={job}
          onClose={() => setApplyOpen(false)}
          onApplied={() => {
            setApplyOpen(false);
            onChange?.({ viewer: { saved: Boolean(job.viewer?.saved), applied: true } });
          }}
        />
      )}
    </div>
  );
}
