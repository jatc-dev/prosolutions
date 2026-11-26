import { Button, Input, Select, trackEvent } from "@prosolutions/ui";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  EMPLOYMENT_TYPES,
  SALARY_PERIODS,
  SENIORITIES,
  WORKPLACES,
  type JobDetail,
} from "../../../server/src/contracts";
import { ErrorNotice, Spinner } from "../../components/primitives";
import { ApiError, errorMessage } from "../../lib/api";
import { EMPLOYMENT_LABEL, SENIORITY_LABEL, STATUS_LABEL, WORKPLACE_LABEL } from "../../lib/format";
import { useSession } from "../../lib/session";

interface FormState {
  title: string;
  summary: string;
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  skills: string[];
  employmentType: string;
  workplace: string;
  seniority: string;
  locationCity: string;
  locationCountry: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryPeriod: string;
  closesAt: string;
}

const EMPTY: FormState = {
  title: "",
  summary: "",
  description: "",
  responsibilities: "",
  requirements: "",
  benefits: "",
  skills: [],
  employmentType: "full_time",
  workplace: "remote",
  seniority: "mid",
  locationCity: "",
  locationCountry: "CO",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "COP",
  salaryPeriod: "month",
  closesAt: "",
};

const PERIOD_LABEL: Record<string, string> = { year: "Anual", month: "Mensual", hour: "Por hora" };
const lines = (value: string) => value.split("\n").map((line) => line.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);

function fromJob(job: JobDetail): FormState {
  return {
    title: job.title,
    summary: job.summary,
    description: job.description,
    responsibilities: job.responsibilities.join("\n"),
    requirements: job.requirements.join("\n"),
    benefits: job.benefits.join("\n"),
    skills: job.skills,
    employmentType: job.employmentType,
    workplace: job.workplace,
    seniority: job.seniority,
    locationCity: job.location.city ?? "",
    locationCountry: job.location.country ?? "",
    salaryMin: job.salary?.min?.toString() ?? "",
    salaryMax: job.salary?.max?.toString() ?? "",
    salaryCurrency: job.salary?.currency ?? "COP",
    salaryPeriod: job.salary?.period ?? "month",
    closesAt: job.closesAt ? job.closesAt.slice(0, 10) : "",
  };
}

function Textarea({ id, label, hint, value, onChange, rows = 4, required, maxLength, error }: {
  id: string; label: string; hint?: string; value: string; onChange: (value: string) => void; rows?: number; required?: boolean; maxLength?: number; error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <textarea
        id={id}
        rows={rows}
        required={required}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className="w-full rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/30 aria-[invalid=true]:border-red-500"
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : hint && <p className="mt-1 text-xs text-ui-muted">{hint}</p>}
    </div>
  );
}

function SkillsInput({ skills, onChange }: { skills: string[]; onChange: (skills: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const values = draft.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    const next = [...new Set([...skills, ...values])].slice(0, 25);
    onChange(next);
    setDraft("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add();
    } else if (event.key === "Backspace" && !draft && skills.length) {
      onChange(skills.slice(0, -1));
    }
  };
  return (
    <div>
      <label htmlFor="skills" className="mb-1 block text-sm font-medium">Habilidades requeridas</label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-ui-border bg-ui-surface p-2 focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-700/30">
        {skills.map((skill) => (
          <span key={skill} className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-900 dark:bg-brand-700/15 dark:text-brand-200">
            {skill}
            <button type="button" onClick={() => onChange(skills.filter((item) => item !== skill))} aria-label={`Quitar ${skill}`}><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input id="skills" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} onBlur={() => draft && add()} placeholder={skills.length ? "" : "react, sql, figma…"} className="min-w-[8rem] flex-1 bg-transparent px-1 text-sm focus:outline-none" />
        <button type="button" onClick={add} aria-label="Agregar habilidad" className="rounded p-1 text-ui-muted hover:bg-ui-soft"><Plus className="h-4 w-4" /></button>
      </div>
      <p className="mt-1 text-xs text-ui-muted">Se usan para calcular la afinidad de cada candidato con su CV de ProCV. Máximo 25.</p>
    </div>
  );
}

export function JobEditorPage() {
  const { jobId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { request, session } = useSession();
  const companyId = params.get("empresa") ?? session?.companies[0]?.id ?? "";
  const [form, setForm] = useState<FormState>(EMPTY);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [saving, setSaving] = useState<"draft" | "publish" | "close" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!jobId) return;
    request<{ job: JobDetail }>(`/api/employer/jobs/${jobId}`)
      .then(({ job: loaded }) => {
        setJob(loaded);
        setForm(fromJob(loaded));
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [jobId, request]);

  const set = <K extends keyof FormState>(key: K) => (value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const hasSalary = Boolean(form.salaryMin || form.salaryMax);

  const payload = () => ({
    ...(jobId ? {} : { companyId }),
    title: form.title.trim(),
    summary: form.summary.trim(),
    description: form.description.trim(),
    responsibilities: lines(form.responsibilities),
    requirements: lines(form.requirements),
    benefits: lines(form.benefits),
    skills: form.skills,
    employmentType: form.employmentType,
    workplace: form.workplace,
    seniority: form.seniority,
    locationCity: form.locationCity.trim() || null,
    locationCountry: form.locationCountry.trim() || null,
    salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
    salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
    salaryCurrency: hasSalary ? form.salaryCurrency.trim() : null,
    salaryPeriod: hasSalary ? form.salaryPeriod : null,
    closesAt: form.closesAt ? new Date(`${form.closesAt}T23:59:59`).toISOString() : null,
  });

  const save = async (intent: "draft" | "publish") => {
    setSaving(intent);
    setError(null);
    setFieldErrors({});
    try {
      const saved = jobId
        ? await request<{ job: JobDetail }>(`/api/employer/jobs/${jobId}`, { method: "PUT", body: payload() })
        : await request<{ job: JobDetail }>("/api/employer/jobs", { method: "POST", body: payload() });
      if (intent === "publish" && saved.job.status !== "published") {
        await request(`/api/employer/jobs/${saved.job.id}/publish`, { method: "POST" });
        trackEvent("job_publish", { new_job: !jobId });
      }
      navigate(`/empresa?empresa=${saved.job.company.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setFieldErrors(Object.fromEntries(err.details.map((detail) => [detail.path, detail.message])));
        setError("Revisa los campos marcados.");
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSaving(null);
    }
  };

  const closeJob = async () => {
    if (!jobId) return;
    setSaving("close");
    try {
      await request(`/api/employer/jobs/${jobId}/close`, { method: "POST" });
      navigate("/empresa");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save(job?.status === "published" ? "publish" : "draft");
  };

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-10"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to="/empresa" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-ui-muted hover:text-ui-text"><ArrowLeft className="h-4 w-4" /> Panel de empresa</Link>
      <h1 className="text-3xl font-bold">{jobId ? "Editar vacante" : "Nueva vacante"}</h1>
      {job && <p className="mt-1 text-ui-muted">Estado: {STATUS_LABEL[job.status]}</p>}

      <form onSubmit={submit} className="mt-6 space-y-8">
        <section className="space-y-4 rounded-2xl border border-ui-border bg-ui-surface p-6">
          <h2 className="text-lg font-semibold">Lo esencial</h2>
          <Input label="Título del cargo" required minLength={3} maxLength={140} value={form.title} onChange={(e) => set("title")(e.target.value)} error={fieldErrors.title} placeholder="Ej. Coordinador/a de Ventas" />
          <Input label="Resumen para la tarjeta" maxLength={300} value={form.summary} onChange={(e) => set("summary")(e.target.value)} helperText="Una frase atractiva que se muestra en los resultados." />
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Modalidad" value={form.workplace} onChange={(e) => set("workplace")(e.target.value)}>
              {WORKPLACES.map((value) => <option key={value} value={value}>{WORKPLACE_LABEL[value]}</option>)}
            </Select>
            <Select label="Tipo de contrato" value={form.employmentType} onChange={(e) => set("employmentType")(e.target.value)}>
              {EMPLOYMENT_TYPES.map((value) => <option key={value} value={value}>{EMPLOYMENT_LABEL[value]}</option>)}
            </Select>
            <Select label="Experiencia" value={form.seniority} onChange={(e) => set("seniority")(e.target.value)}>
              {SENIORITIES.map((value) => <option key={value} value={value}>{SENIORITY_LABEL[value]}</option>)}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={form.workplace === "remote" ? "Ciudad (opcional)" : "Ciudad"} maxLength={80} value={form.locationCity} onChange={(e) => set("locationCity")(e.target.value)} error={fieldErrors.locationCity} />
            <Input label="País (código ISO, ej. CO, MX)" maxLength={2} value={form.locationCountry} onChange={(e) => set("locationCountry")(e.target.value.toUpperCase())} error={fieldErrors.locationCountry} />
          </div>
          <SkillsInput skills={form.skills} onChange={set("skills")} />
        </section>

        <section className="space-y-4 rounded-2xl border border-ui-border bg-ui-surface p-6">
          <h2 className="text-lg font-semibold">Descripción</h2>
          <Textarea id="description" label="Sobre el rol" rows={7} required maxLength={20000} value={form.description} onChange={set("description")} error={fieldErrors.description} hint="Mínimo 50 caracteres para publicar." />
          <Textarea id="responsibilities" label="Responsabilidades" value={form.responsibilities} onChange={set("responsibilities")} hint="Una por línea." />
          <Textarea id="requirements" label="Requisitos" value={form.requirements} onChange={set("requirements")} hint="Una por línea." />
          <Textarea id="benefits" label="Beneficios" value={form.benefits} onChange={set("benefits")} hint="Una por línea." />
        </section>

        <section className="space-y-4 rounded-2xl border border-ui-border bg-ui-surface p-6">
          <h2 className="text-lg font-semibold">Salario y cierre</h2>
          <p className="text-sm text-ui-muted">Las vacantes con salario visible reciben más postulaciones de calidad.</p>
          <div className="grid gap-4 sm:grid-cols-4">
            <Input label="Mínimo" type="number" min={0} inputMode="numeric" value={form.salaryMin} onChange={(e) => set("salaryMin")(e.target.value)} />
            <Input label="Máximo" type="number" min={0} inputMode="numeric" value={form.salaryMax} onChange={(e) => set("salaryMax")(e.target.value)} error={fieldErrors.salaryMax} />
            <Input label="Moneda" maxLength={3} value={form.salaryCurrency} onChange={(e) => set("salaryCurrency")(e.target.value.toUpperCase())} error={fieldErrors.salaryCurrency} />
            <Select label="Periodo" value={form.salaryPeriod} onChange={(e) => set("salaryPeriod")(e.target.value)}>
              {SALARY_PERIODS.map((value) => <option key={value} value={value}>{PERIOD_LABEL[value]}</option>)}
            </Select>
          </div>
          <Input label="Fecha de cierre (opcional)" type="date" value={form.closesAt} onChange={(e) => set("closesAt")(e.target.value)} />
        </section>

        {error && <ErrorNotice message={error} />}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            {job?.status === "published" && (
              <Button type="button" variant="danger" onClick={closeJob} disabled={Boolean(saving)}>
                {saving === "close" ? "Cerrando…" : "Cerrar vacante"}
              </Button>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {job?.status !== "published" && (
              <Button type="button" variant="outline" disabled={Boolean(saving)} onClick={() => save("draft")}>
                {saving === "draft" ? "Guardando…" : "Guardar borrador"}
              </Button>
            )}
            <Button type="button" disabled={Boolean(saving)} onClick={() => save("publish")}>
              {saving === "publish" ? "Publicando…" : job?.status === "published" ? "Guardar cambios" : "Publicar vacante"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
