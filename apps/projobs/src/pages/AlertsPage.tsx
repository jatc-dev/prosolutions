import { Button } from "@prosolutions/ui";
import { BellRing, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { JobAlert } from "../../server/src/contracts";
import { EmptyState, ErrorNotice, Spinner } from "../components/primitives";
import { errorMessage } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { useSession } from "../lib/session";

const FILTER_LABEL: Record<string, string> = {
  q: "Búsqueda",
  workplace: "Modalidad",
  type: "Contrato",
  seniority: "Experiencia",
  skills: "Habilidades",
  country: "País",
  location: "Ciudad",
  salaryMin: "Salario mínimo",
};

function describe(query: Record<string, string>): string {
  const parts = Object.entries(query).map(([key, value]) => `${FILTER_LABEL[key] ?? key}: ${value}`);
  return parts.length ? parts.join(" · ") : "Todas las vacantes nuevas";
}

/** Saved searches delivered by email (daily or weekly). */
export function AlertsPage() {
  const { request } = useSession();
  const { data, error, loading, reload, setData } = useAsync<{ alerts: JobAlert[] }>("alerts", (signal) =>
    request("/api/me/alerts", { signal }),
  );
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const alerts = data?.alerts ?? [];

  const remove = async (alert: JobAlert) => {
    setRemoving(alert.id);
    setRemoveError(null);
    try {
      await request(`/api/me/alerts/${alert.id}`, { method: "DELETE" });
      setData((current) => current && { alerts: current.alerts.filter((item) => item.id !== alert.id) });
    } catch (err) {
      setRemoveError(errorMessage(err));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">Alertas de empleo</h1>
      <p className="mb-6 mt-2 text-ui-muted">
        Te enviamos por correo las vacantes nuevas que coinciden con tus búsquedas. Crea una alerta desde los resultados de búsqueda.
      </p>
      {removeError && <ErrorNotice message={removeError} />}
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorNotice message={errorMessage(error)} onRetry={reload} />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<BellRing className="h-10 w-10" />}
          title="Aún no tienes alertas"
          action={<Link to="/" className="font-semibold text-brand-800 hover:underline dark:text-brand-300">Buscar vacantes</Link>}
        >
          Busca un cargo o aplica filtros y pulsa «Crear alerta» para recibir las nuevas vacantes por correo.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex items-start justify-between gap-4 rounded-2xl border border-ui-border bg-ui-surface p-4">
              <div className="min-w-0">
                <p className="font-semibold">{alert.label || describe(alert.query)}</p>
                <p className="mt-1 text-sm text-ui-muted">{describe(alert.query)}</p>
                <p className="mt-1 text-xs text-ui-subtle">
                  {alert.frequency === "weekly" ? "Semanal" : "Diaria"} · {alert.email}
                  {!alert.active && " · cancelada desde el correo"}
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => void remove(alert)}
                disabled={removing === alert.id}
                aria-label={`Eliminar alerta ${alert.label || describe(alert.query)}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
