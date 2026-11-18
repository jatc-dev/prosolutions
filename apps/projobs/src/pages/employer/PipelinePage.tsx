import { Button, Select, cn } from "@prosolutions/ui";
import { ArrowLeft, ExternalLink, Mail, MapPin, Phone, Users } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { PIPELINE_STAGES, type JobDetail, type PipelineApplication, type PipelineStage } from "../../../server/src/contracts";
import { Dialog, EmptyState, ErrorNotice, MatchBadge, SkillChip, Spinner } from "../../components/primitives";
import { StageBadge } from "../../components/StageTracker";
import { errorMessage } from "../../lib/api";
import { STAGE_LABEL, formatDate, timeAgo } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { useSession } from "../../lib/session";

const COLUMN_TONE: Record<PipelineStage, string> = {
  applied: "border-t-amber-400",
  screening: "border-t-sky-400",
  interview: "border-t-brand-500",
  offer: "border-t-violet-400",
  hired: "border-t-emerald-500",
  rejected: "border-t-slate-400",
};

function CandidateDrawer({ application, job, onClose, onMoved }: {
  application: PipelineApplication;
  job: JobDetail;
  onClose: () => void;
  onMoved: (stage: PipelineStage, note: string | null) => void;
}) {
  const { request } = useSession();
  const { candidate } = application;
  const withdrawn = application.stage === "withdrawn";
  const [stage, setStage] = useState<PipelineStage>(withdrawn ? "applied" : (application.stage as PipelineStage));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await request(`/api/employer/applications/${application.id}`, { method: "PATCH", body: { stage, note: note.trim() || null } });
      onMoved(stage, note.trim() || null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={candidate.fullName} description={candidate.headline ?? undefined} wide>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge stage={application.stage} />
          <MatchBadge match={application.match} />
          <span className="text-xs text-ui-muted">
            Postulado {timeAgo(application.createdAt)} · {application.source === "procv" ? "CV de ProCV" : "Perfil rápido"}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ui-muted">
          {candidate.email && <a href={`mailto:${candidate.email}`} className="inline-flex items-center gap-1 hover:text-brand-600"><Mail className="h-4 w-4" />{candidate.email}</a>}
          {candidate.phone && <span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" />{candidate.phone}</span>}
          {candidate.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{candidate.location}</span>}
          {candidate.links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 capitalize text-brand-600 hover:underline">
              {link.label} <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>

        {job.skills.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">Habilidades requeridas</h3>
            <div className="flex flex-wrap gap-1.5">
              {application.match.matchedSkills.map((skill) => <SkillChip key={skill} skill={skill} state="matched" />)}
              {application.match.missingSkills.map((skill) => <SkillChip key={skill} skill={skill} state="missing" />)}
            </div>
          </section>
        )}

        {candidate.summary && (
          <section>
            <h3 className="mb-1 text-sm font-semibold">Perfil</h3>
            <p className="whitespace-pre-line text-sm text-ui-muted">{candidate.summary}</p>
          </section>
        )}

        {candidate.experience.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">Experiencia</h3>
            <ul className="space-y-2 text-sm">
              {candidate.experience.map((item, index) => (
                <li key={`${item.company}-${index}`}>
                  <span className="font-medium">{item.position}</span> · {item.company}
                  <span className="block text-xs text-ui-muted">{[item.startDate, item.current ? "Actual" : item.endDate].filter(Boolean).join(" – ")}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {candidate.education.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">Educación</h3>
            <ul className="space-y-1 text-sm">
              {candidate.education.map((item, index) => <li key={`${item.institution}-${index}`}>{item.degree} · <span className="text-ui-muted">{item.institution}</span></li>)}
            </ul>
          </section>
        )}

        {application.coverLetter && (
          <section>
            <h3 className="mb-1 text-sm font-semibold">Mensaje del candidato</h3>
            <blockquote className="whitespace-pre-line rounded-xl border-l-4 border-brand-500 bg-ui-soft/60 p-3 text-sm">{application.coverLetter}</blockquote>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold">Historial</h3>
          <ol className="space-y-2 border-l border-ui-border pl-4 text-sm">
            {application.timeline.map((event, index) => (
              <li key={index}>
                <span className="font-medium">{STAGE_LABEL[event.toStage]}</span>
                <span className="text-ui-muted"> · {event.actorType === "candidate" ? "Candidato" : "Equipo"} · {formatDate(event.createdAt)}</span>
                {event.note && <p className="text-ui-muted">“{event.note}”</p>}
              </li>
            ))}
          </ol>
        </section>

        {withdrawn ? (
          <p className="rounded-xl bg-ui-soft p-3 text-sm text-ui-muted">El candidato retiró su postulación.</p>
        ) : (
          <form onSubmit={submit} className="space-y-3 rounded-2xl border border-ui-border p-4">
            <h3 className="text-sm font-semibold">Mover en el proceso</h3>
            <Select label="Etapa" value={stage} onChange={(event) => setStage(event.target.value as PipelineStage)}>
              {PIPELINE_STAGES.map((value) => <option key={value} value={value}>{STAGE_LABEL[value]}</option>)}
            </Select>
            <div>
              <label htmlFor="stage-note" className="mb-1 block text-sm font-medium">Nota interna <span className="font-normal text-ui-muted">(opcional, visible en el historial)</span></label>
              <textarea id="stage-note" rows={2} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} className="w-full rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            </div>
            {error && <ErrorNotice message={error} />}
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || (stage === application.stage && !note.trim())}>{saving ? "Guardando…" : "Actualizar"}</Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}

export function PipelinePage() {
  const { jobId = "" } = useParams();
  const { request } = useSession();
  const job = useAsync<{ job: JobDetail }>(`job:${jobId}`, (signal) => request(`/api/employer/jobs/${jobId}`, { signal }));
  const pipeline = useAsync<{ applications: PipelineApplication[] }>(`pipeline:${jobId}`, (signal) => request(`/api/employer/jobs/${jobId}/applications`, { signal }));
  const [openId, setOpenId] = useState<string | null>(null);
  const [showWithdrawn, setShowWithdrawn] = useState(false);

  const applications = pipeline.data?.applications ?? [];
  const columns = useMemo(
    () => PIPELINE_STAGES.map((stage) => ({ stage, items: applications.filter((item) => item.stage === stage) })),
    [applications],
  );
  const withdrawn = applications.filter((item) => item.stage === "withdrawn");
  const open = applications.find((item) => item.id === openId) ?? null;

  if (job.loading || (pipeline.loading && !pipeline.data)) return <div className="mx-auto max-w-7xl px-4 py-10"><Spinner /></div>;
  if (job.error || pipeline.error || !job.data) {
    return <div className="mx-auto max-w-7xl px-4 py-10"><ErrorNotice message={errorMessage(job.error ?? pipeline.error)} onRetry={() => { job.reload(); pipeline.reload(); }} /></div>;
  }

  return (
    <div className="mx-auto max-w-[96rem] px-4 py-8 sm:px-6">
      <Link to="/empresa" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ui-muted hover:text-ui-text"><ArrowLeft className="h-4 w-4" /> Panel de empresa</Link>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{job.data.job.title}</h1>
          <p className="text-ui-muted">{applications.length - withdrawn.length} {applications.length - withdrawn.length === 1 ? "candidato activo" : "candidatos activos"} · ordenados por afinidad</p>
        </div>
        <Link to={`/empresa/vacantes/${jobId}/editar`} className="text-sm font-semibold text-brand-600 hover:underline">Editar vacante</Link>
      </header>

      {applications.length === 0 ? (
        <EmptyState icon={<Users className="h-10 w-10" />} title="Todavía no hay candidatos">
          Comparte la vacante: cuando alguien se postule aparecerá aquí con su afinidad calculada.
        </EmptyState>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4" role="list" aria-label="Pipeline de candidatos">
          {columns.map(({ stage, items }) => (
            <section key={stage} role="listitem" aria-label={`${STAGE_LABEL[stage]}: ${items.length}`} className={cn("flex w-72 shrink-0 flex-col rounded-2xl border border-t-4 border-ui-border bg-ui-soft/40", COLUMN_TONE[stage])}>
              <h2 className="flex items-center justify-between px-4 py-3 text-sm font-semibold">
                {STAGE_LABEL[stage]} <span className="rounded-full bg-ui-surface px-2 text-xs text-ui-muted">{items.length}</span>
              </h2>
              <ul className="flex-1 space-y-2 px-3 pb-3">
                {items.map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => setOpenId(item.id)} className="w-full rounded-xl border border-ui-border bg-ui-surface p-3 text-left shadow-card transition hover:border-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500">
                      <span className="block truncate text-sm font-semibold">{item.candidate.fullName}</span>
                      {item.candidate.headline && <span className="block truncate text-xs text-ui-muted">{item.candidate.headline}</span>}
                      <span className="mt-2 flex items-center justify-between gap-2">
                        <MatchBadge match={item.match} />
                        <span className="text-[11px] text-ui-muted">{timeAgo(item.updatedAt)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {withdrawn.length > 0 && (
        <div className="mt-4">
          <button type="button" onClick={() => setShowWithdrawn((value) => !value)} className="text-sm font-medium text-ui-muted hover:text-ui-text" aria-expanded={showWithdrawn}>
            {showWithdrawn ? "Ocultar" : "Ver"} postulaciones retiradas ({withdrawn.length})
          </button>
          {showWithdrawn && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {withdrawn.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => setOpenId(item.id)} className="rounded-lg border border-ui-border px-3 py-1.5 text-sm text-ui-muted hover:bg-ui-soft">{item.candidate.fullName}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open && (
        <CandidateDrawer
          application={open}
          job={job.data.job}
          onClose={() => setOpenId(null)}
          onMoved={(stage, note) => {
            pipeline.setData((current) => current && {
              applications: current.applications.map((item) =>
                item.id === open.id
                  ? {
                      ...item,
                      stage,
                      updatedAt: new Date().toISOString(),
                      timeline: [...item.timeline, { fromStage: item.stage, toStage: stage, actorType: "recruiter", note, createdAt: new Date().toISOString() }],
                    }
                  : item,
              ),
            });
            setOpenId(null);
          }}
        />
      )}
    </div>
  );
}
