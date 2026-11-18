import { Button } from "@prosolutions/ui";
import { FileCheck2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { CandidateApplication } from "../../server/src/contracts";
import { CompanyLogo, Dialog, EmptyState, ErrorNotice, MatchBadge, Spinner } from "../components/primitives";
import { StageBadge, StageTracker } from "../components/StageTracker";
import { errorMessage } from "../lib/api";
import { STAGE_LABEL, formatDate } from "../lib/format";
import { useAsync } from "../lib/hooks";
import { useSession } from "../lib/session";

export function ApplicationsPage() {
  const { request } = useSession();
  const { data, error, loading, reload, setData } = useAsync<{ applications: CandidateApplication[] }>("applications", (signal) =>
    request("/api/me/applications", { signal }),
  );
  const [withdrawing, setWithdrawing] = useState<CandidateApplication | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const confirmWithdraw = async () => {
    if (!withdrawing) return;
    try {
      await request(`/api/me/applications/${withdrawing.id}/withdraw`, { method: "POST" });
      setData((current) => current && {
        applications: current.applications.map((item) => (item.id === withdrawing.id ? { ...item, stage: "withdrawn" } : item)),
      });
      setWithdrawing(null);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const applications = data?.applications ?? [];
  const active = applications.filter((item) => !["rejected", "withdrawn", "hired"].includes(item.stage)).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Mis postulaciones</h1>
        {data && <p className="mt-1 text-ui-muted">{active} en proceso · {applications.length} en total</p>}
      </header>

      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorNotice message={errorMessage(error)} onRetry={reload} />
      ) : applications.length === 0 ? (
        <EmptyState icon={<FileCheck2 className="h-10 w-10" />} title="Aún no te has postulado" action={<Link to="/" className="font-semibold text-brand-600 hover:underline">Explorar vacantes</Link>}>
          Cuando te postules, aquí verás en qué etapa está cada proceso.
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {applications.map((application) => {
            const last = application.timeline[application.timeline.length - 1];
            const canWithdraw = !["hired", "rejected", "withdrawn"].includes(application.stage);
            return (
              <li key={application.id} className="rounded-2xl border border-ui-border bg-ui-surface p-5 shadow-card">
                <div className="flex flex-wrap items-start gap-4">
                  <CompanyLogo company={application.job.company} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/empleos/${application.job.slug}`} className="font-semibold hover:text-brand-600 hover:underline">
                      {application.job.title}
                    </Link>
                    <p className="text-sm text-ui-muted">{application.job.company.name} · Postulado el {formatDate(application.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MatchBadge match={application.match} />
                    <StageBadge stage={application.stage} />
                  </div>
                </div>
                <div className="mt-5">
                  <StageTracker stage={application.stage} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ui-border pt-3 text-sm">
                  <span className="text-ui-muted">
                    {last && `Última actualización: ${STAGE_LABEL[last.toStage]} · ${formatDate(last.createdAt)}`}
                  </span>
                  {canWithdraw && (
                    <button type="button" onClick={() => { setActionError(null); setWithdrawing(application); }} className="font-medium text-ui-muted hover:text-red-600">
                      Retirar postulación
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={Boolean(withdrawing)} onClose={() => setWithdrawing(null)} title="¿Retirar tu postulación?" description={withdrawing ? `${withdrawing.job.title} · ${withdrawing.job.company.name}` : undefined}>
        <p className="text-sm text-ui-muted">La empresa dejará de considerarte para esta vacante. Esta acción no se puede deshacer.</p>
        {actionError && <div className="mt-3"><ErrorNotice message={actionError} /></div>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setWithdrawing(null)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmWithdraw}>Retirar</Button>
        </div>
      </Dialog>
    </div>
  );
}
