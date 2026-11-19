import { Flag } from "lucide-react";
import { useState, type FormEvent } from "react";
import { errorMessage } from "../lib/api";
import { useSession } from "../lib/session";

const REASONS: Array<{ value: string; label: string }> = [
  { value: "fraude", label: "Posible fraude o cobro por postularse" },
  { value: "discriminacion", label: "Requisitos discriminatorios" },
  { value: "informacion-falsa", label: "Información falsa o engañosa" },
  { value: "spam", label: "Spam o publicidad" },
  { value: "otro", label: "Otro motivo" },
];

/** Lets anyone flag a suspicious job for ProAdmin review. */
export function ReportJob({ jobId }: { jobId: string }) {
  const { request } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("fraude");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("sending");
    setError(null);
    try {
      await request(`/api/jobs/${jobId}/reports`, { method: "POST", body: { reason, details: details.trim() || null } });
      setState("sent");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  };

  if (state === "sent") {
    return <p role="status" className="text-sm text-ui-muted">Gracias. Nuestro equipo revisará esta vacante.</p>;
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-ui-muted hover:text-ui-text">
        <Flag className="h-4 w-4" aria-hidden="true" /> Reportar esta vacante
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-ui-border p-4" aria-label="Reportar vacante">
      <label className="block text-sm font-medium" htmlFor={`report-reason-${jobId}`}>Motivo</label>
      <select
        id={`report-reason-${jobId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-lg border border-ui-border-strong bg-ui-surface px-3 py-2 text-sm"
      >
        {REASONS.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
      <label className="block text-sm font-medium" htmlFor={`report-details-${jobId}`}>
        Detalles <span className="font-normal text-ui-muted">(opcional)</span>
      </label>
      <textarea
        id={`report-details-${jobId}`}
        rows={3}
        maxLength={1000}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        className="w-full rounded-lg border border-ui-border-strong bg-ui-surface px-3 py-2 text-sm"
      />
      {error && <p role="alert" className="text-sm text-ui-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm">Cancelar</button>
        <button type="submit" disabled={state === "sending"} className="rounded-lg bg-ui-accent px-3 py-2 text-sm font-semibold text-ui-on-accent disabled:opacity-60">
          {state === "sending" ? "Enviando…" : "Enviar reporte"}
        </button>
      </div>
    </form>
  );
}
