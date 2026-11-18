import { Button, Input, cn } from "@prosolutions/ui";
import { CheckCircle2, FileText, PencilLine } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { CandidateProfile, CvOption, JobDetail, MatchResult } from "../../server/src/contracts";
import { ApiError, errorMessage } from "../lib/api";
import { PROCV_URL } from "../lib/env";
import { formatDate } from "../lib/format";
import { useSession } from "../lib/session";
import { Dialog, ErrorNotice, MatchBadge, SkillChip, Spinner } from "./primitives";

interface ApplyDialogProps {
  job: JobDetail;
  onClose: () => void;
  onApplied: () => void;
}

type Mode = "procv" | "manual";

export function ApplyDialog({ job, onClose, onApplied }: ApplyDialogProps) {
  const { request, profile: account } = useSession();
  const [mode, setMode] = useState<Mode>("procv");
  const [cvs, setCvs] = useState<CvOption[] | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [cvId, setCvId] = useState<string>("");
  const [preview, setPreview] = useState<{ match: MatchResult; profile: CandidateProfile } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [manual, setManual] = useState({ fullName: account?.name ?? "", headline: "", skills: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<MatchResult | null>(null);

  useEffect(() => {
    request<{ cvs: CvOption[] }>("/api/me/cvs")
      .then(({ cvs: list }) => {
        setCvs(list);
        if (list[0]) setCvId(list[0].id);
        else setMode("manual");
      })
      .catch((error) => {
        setCvs([]);
        setMode("manual");
        setCvError(errorMessage(error));
      });
  }, [request]);

  useEffect(() => {
    if (mode !== "procv" || !cvId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    request<{ match: MatchResult; profile: CandidateProfile }>(`/api/jobs/${job.id}/match?cvId=${encodeURIComponent(cvId)}`)
      .then((result) => !cancelled && setPreview(result))
      .catch(() => !cancelled && setPreview(null))
      .finally(() => !cancelled && setPreviewLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cvId, job.id, mode, request]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body =
        mode === "procv"
          ? { cvId, coverLetter: coverLetter.trim() || null }
          : {
              coverLetter: coverLetter.trim() || null,
              profile: {
                fullName: manual.fullName.trim(),
                headline: manual.headline.trim() || null,
                email: account?.email || null,
                skills: manual.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
              },
            };
      const result = await request<{ id: string; match: MatchResult }>(`/api/jobs/${job.id}/applications`, { method: "POST", body });
      setDone(result.match);
    } catch (error) {
      setSubmitError(errorMessage(error));
      if (error instanceof ApiError && error.code === "already_applied") onApplied();
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Dialog open onClose={onApplied} title="¡Postulación enviada!">
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-brand-800" aria-hidden="true" />
          <p className="text-sm text-ui-muted">
            {job.company.name} ya puede ver tu perfil para <strong className="text-ui-text">{job.title}</strong>. Te avisaremos aquí cuando avance tu proceso.
          </p>
          <MatchBadge match={done} className="text-sm" />
          <div className="flex justify-center gap-2 pt-2">
            <Link to="/postulaciones" className="inline-flex h-10 items-center rounded-lg bg-brand-800 px-4 text-sm font-semibold text-white hover:bg-brand-900">
              Ver mis postulaciones
            </Link>
            <Button variant="ghost" onClick={onApplied}>Seguir buscando</Button>
          </div>
        </div>
      </Dialog>
    );
  }

  const canSubmit = mode === "procv" ? Boolean(cvId) : manual.fullName.trim().length >= 2;

  return (
    <Dialog open onClose={onClose} title={`Postularme a ${job.title}`} description={job.company.name} wide>
      <form onSubmit={submit} className="space-y-5">
        <div role="radiogroup" aria-label="Cómo quieres postularte" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([
            ["procv", "Con mi CV de ProCV", "Un clic, datos siempre actualizados", FileText],
            ["manual", "Perfil rápido", "Sin CV: nombre, titular y habilidades", PencilLine],
          ] as const).map(([value, label, hint, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              disabled={value === "procv" && cvs !== null && cvs.length === 0}
              onClick={() => setMode(value)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                mode === value ? "border-brand-700 bg-brand-50 dark:bg-brand-700/10" : "border-ui-border hover:bg-ui-soft",
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 text-brand-800" aria-hidden="true" />
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-xs text-ui-muted">{hint}</span>
              </span>
            </button>
          ))}
        </div>

        {mode === "procv" && (
          <div className="space-y-4">
            {cvs === null ? (
              <Spinner label="Cargando tus CV de ProCV" />
            ) : (
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">Elige el CV que verá la empresa</legend>
                {cvs.map((cv) => (
                  <label
                    key={cv.id}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3",
                      cvId === cv.id ? "border-brand-700 ring-1 ring-brand-700" : "border-ui-border hover:bg-ui-soft",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <input type="radio" name="cv" value={cv.id} checked={cvId === cv.id} onChange={() => setCvId(cv.id)} className="accent-brand-800" />
                      <span>
                        <span className="block text-sm font-semibold">{cv.title}</span>
                        <span className="block text-xs text-ui-muted">
                          {cv.headline ?? "Sin titular"} · {cv.skillCount} habilidades · actualizado {formatDate(cv.updatedAt)}
                        </span>
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            {previewLoading && <Spinner label="Calculando tu afinidad" />}
            {preview && !previewLoading && (
              <div className="rounded-xl border border-ui-border bg-ui-soft/60 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Lo que verá {job.company.name}</p>
                  <MatchBadge match={preview.match} />
                </div>
                <p className="text-sm">
                  <strong>{preview.profile.fullName}</strong>
                  {preview.profile.headline && <> · {preview.profile.headline}</>}
                </p>
                <p className="text-xs text-ui-muted">{[preview.profile.email, preview.profile.location].filter(Boolean).join(" · ")}</p>
                {job.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {preview.match.matchedSkills.map((skill) => <SkillChip key={skill} skill={skill} state="matched" />)}
                    {preview.match.missingSkills.map((skill) => <SkillChip key={skill} skill={skill} state="missing" />)}
                  </div>
                )}
                {preview.match.missingSkills.length > 0 && (
                  <p className="mt-2 text-xs text-ui-muted">
                    ¿Dominas alguna habilidad tachada? Agrégala a tu CV en{" "}
                    <a href={`${PROCV_URL}/dashboard`} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-800 underline">ProCV</a>{" "}
                    para mejorar tu afinidad.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {mode === "manual" && (
          <div className="space-y-3">
            {cvError ? (
              <p className="text-sm text-ui-muted">{cvError}</p>
            ) : (
              cvs?.length === 0 && (
                <p className="text-sm text-ui-muted">
                  Aún no tienes CV en ProCV.{" "}
                  <a href={`${PROCV_URL}/dashboard`} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-800 underline">Crea uno gratis</a>{" "}
                  para postularte en un clic, o completa este perfil rápido.
                </p>
              )
            )}
            <Input label="Nombre completo" required minLength={2} value={manual.fullName} onChange={(e) => setManual({ ...manual, fullName: e.target.value })} />
            <Input label="Titular profesional" placeholder="Ej. Asesora Comercial" value={manual.headline} onChange={(e) => setManual({ ...manual, headline: e.target.value })} />
            <Input
              label="Habilidades"
              placeholder="excel, atención al cliente, ventas"
              helperText="Separadas por comas. Se usan para calcular tu afinidad."
              value={manual.skills}
              onChange={(e) => setManual({ ...manual, skills: e.target.value })}
            />
          </div>
        )}

        <div>
          <label htmlFor="cover-letter" className="mb-1 block text-sm font-medium">
            Mensaje para la empresa <span className="font-normal text-ui-muted">(opcional)</span>
          </label>
          <textarea
            id="cover-letter"
            rows={4}
            maxLength={5000}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="Cuéntales en pocas líneas por qué te interesa este rol."
            className="w-full rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-sm text-ui-text focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/30"
          />
        </div>

        {submitError && <ErrorNotice message={submitError} />}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Enviando…" : "Enviar postulación"}
          </Button>
        </div>
        <p className="text-xs text-ui-muted">
          Al postularte compartes estos datos solo con {job.company.name}.{" "}
          <a href="/privacidad.html" className="underline">Política de privacidad</a>.
        </p>
      </form>
    </Dialog>
  );
}
