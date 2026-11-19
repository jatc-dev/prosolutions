import { Button, cn } from "@prosolutions/ui";
import { Briefcase, Building2, Eye, Pencil, Plus, Users } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { EmployerCompany, EmployerJob } from "../../../server/src/contracts";
import { CompanyForm } from "../../components/CompanyForm";
import { CompanyLogo, Dialog, EmptyState, ErrorNotice, Spinner } from "../../components/primitives";
import { errorMessage } from "../../lib/api";
import { EMPLOYMENT_LABEL, STATUS_LABEL, WORKPLACE_LABEL, timeAgo } from "../../lib/format";
import { useAsync } from "../../lib/hooks";
import { useSession } from "../../lib/session";

function Kpi({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ui-border bg-ui-surface p-4">
      <div className="flex items-center gap-2 text-sm text-ui-muted">{icon}{label}</div>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}

const STATUS_TONE: Record<EmployerJob["status"], string> = {
  published: "bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300",
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  closed: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function EmployerPage() {
  const { session, request, refreshSession } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const companies = session?.companies ?? [];
  const company: EmployerCompany | undefined = companies.find((item) => item.id === params.get("empresa")) ?? companies[0];

  const jobs = useAsync<{ jobs: EmployerJob[] }>(company ? `jobs:${company.id}` : null, (signal) =>
    request(`/api/employer/jobs?companyId=${company!.id}`, { signal }),
  );

  const stats = useMemo(() => {
    const list = jobs.data?.jobs ?? [];
    return {
      open: list.filter((job) => job.status === "published").length,
      applicants: list.reduce((sum, job) => sum + job.applicants, 0),
      interviewing: list.reduce((sum, job) => sum + job.stageCounts.interview + job.stageCounts.offer, 0),
    };
  }, [jobs.data]);

  if (!company) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold">Crea el perfil de tu empresa</h1>
        <p className="mb-2 mt-2 text-ui-muted">Es lo que verán los candidatos en cada vacante. Podrás editarlo cuando quieras.</p>
        <p className="mb-6 text-sm text-ui-muted">
          Si usas un correo corporativo del mismo dominio que el sitio web de tu empresa, la verificamos al instante. Si no, puedes publicar
          hasta 3 vacantes mientras nuestro equipo la revisa.
        </p>
        <div className="rounded-2xl border border-ui-border bg-ui-surface p-6">
          <CompanyForm onSaved={() => void refreshSession()} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center gap-4">
        <CompanyLogo company={company} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold">{company.name}</h1>
          <p className="text-ui-muted">Panel de reclutamiento · {company.role === "owner" ? "Propietario" : "Reclutador"}</p>
          {company.verificationStatus === "verified" ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-800 dark:text-brand-300">Empresa verificada</p>
          ) : company.verificationStatus === "pending" ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Verificación pendiente: puedes tener hasta 3 vacantes publicadas mientras revisamos tu empresa.
            </p>
          ) : (
            <p className="mt-1 text-xs text-red-700 dark:text-red-300">No pudimos verificar tu empresa. Escríbenos para revisarlo.</p>
          )}
        </div>
        {companies.length > 1 && (
          <select
            aria-label="Cambiar de empresa"
            value={company.id}
            onChange={(event) => setParams({ empresa: event.target.value })}
            className="h-10 rounded-lg border border-ui-border bg-ui-surface px-3 text-sm"
          >
            {companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        )}
        <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1.5 h-4 w-4" /> Editar empresa</Button>
        <Button onClick={() => navigate(`/empresa/vacantes/nueva?empresa=${company.id}`)}><Plus className="mr-1.5 h-4 w-4" /> Nueva vacante</Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Indicadores">
        <Kpi icon={<Briefcase className="h-4 w-4" />} label="Vacantes publicadas" value={stats.open} />
        <Kpi icon={<Users className="h-4 w-4" />} label="Candidatos activos" value={stats.applicants} />
        <Kpi icon={<Building2 className="h-4 w-4" />} label="En entrevista u oferta" value={stats.interviewing} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Vacantes</h2>
        {jobs.loading && !jobs.data ? (
          <Spinner />
        ) : jobs.error ? (
          <ErrorNotice message={errorMessage(jobs.error)} onRetry={jobs.reload} />
        ) : !jobs.data?.jobs.length ? (
          <EmptyState icon={<Briefcase className="h-10 w-10" />} title="Publica tu primera vacante" action={<Button onClick={() => navigate(`/empresa/vacantes/nueva?empresa=${company.id}`)}>Crear vacante</Button>}>
            Las vacantes se crean como borrador y se publican cuando estén listas.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-ui-border bg-ui-surface">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-ui-border text-xs uppercase tracking-wide text-ui-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Vacante</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Candidatos</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Pipeline</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border">
                {jobs.data.jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-ui-soft/50">
                    <td className="px-4 py-3">
                      <Link to={`/empresa/vacantes/${job.id}/candidatos`} className="font-semibold hover:text-brand-800 hover:underline">{job.title}</Link>
                      <p className="text-xs text-ui-muted">{WORKPLACE_LABEL[job.workplace]} · {EMPLOYMENT_LABEL[job.employmentType]} · actualizada {timeAgo(job.updatedAt)}</p>
                    </td>
                    <td className="px-4 py-3"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_TONE[job.status])}>{STATUS_LABEL[job.status]}</span></td>
                    <td className="px-4 py-3 font-semibold">{job.applicants}</td>
                    <td className="px-4 py-3 text-xs text-ui-muted">
                      {job.stageCounts.applied} nuevos · {job.stageCounts.screening + job.stageCounts.interview} en proceso · {job.stageCounts.offer + job.stageCounts.hired} oferta/contratados
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {job.status !== "draft" && (
                          <Link to={`/empleos/${job.slug}`} title="Ver publicación" className="rounded-lg p-2 text-ui-muted hover:bg-ui-soft"><Eye className="h-4 w-4" /><span className="sr-only">Ver publicación</span></Link>
                        )}
                        <Link to={`/empresa/vacantes/${job.id}/editar`} title="Editar" className="rounded-lg p-2 text-ui-muted hover:bg-ui-soft"><Pencil className="h-4 w-4" /><span className="sr-only">Editar</span></Link>
                        <Link to={`/empresa/vacantes/${job.id}/candidatos`} title="Candidatos" className="rounded-lg p-2 text-ui-muted hover:bg-ui-soft"><Users className="h-4 w-4" /><span className="sr-only">Candidatos</span></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={editing} onClose={() => setEditing(false)} title="Editar empresa" wide>
        <CompanyForm
          company={company}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void refreshSession();
          }}
        />
      </Dialog>
    </div>
  );
}
