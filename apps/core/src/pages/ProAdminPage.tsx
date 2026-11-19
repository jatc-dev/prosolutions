import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { NoAds, ProFooter, ProHeader, resetAdsConfigCache } from "@prosolutions/ui";
import { useCoreLocale } from "../i18n";
import { identityRequest } from "../preferencesApi";

export type ProAdminSection = "empresas" | "vacantes" | "publicidad";

type CompanyStatus = "pending" | "verified" | "rejected" | "suspended";
interface Company {
  id: string;
  slug: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  verificationStatus: CompanyStatus;
  verificationMethod?: string | null;
  verificationNote?: string | null;
  createdAt: string;
  members: number;
  memberEmails?: string | null;
  publishedJobs: number;
}

interface ModeratedJob {
  id: string;
  slug: string;
  title: string;
  status: string;
  moderationStatus: "ok" | "paused";
  moderationNote?: string | null;
  companyName: string;
  companyStatus: CompanyStatus;
  openReports: number;
  reasons: string[];
  lastReportAt?: string | null;
}

export const AD_PLACEMENT_LABELS = {
  "academy-article": "Artículos de ProAcademy (dentro del texto)",
  "academy-index": "Índice de ProAcademy",
  "tools-result": "Resultados de ProTools",
  "jobs-listing": "Listados de ProJobs",
} as const;
type Placement = keyof typeof AD_PLACEMENT_LABELS;

export interface AdsSettings {
  enabled: boolean;
  publisherId: string | null;
  placements: Record<Placement, boolean>;
}

export const PUBLISHER_ID = /^ca-pub-\d{10,20}$/;

const SECTION_PERMISSIONS: Record<ProAdminSection, string> = {
  empresas: "projobs.catalog.read",
  vacantes: "projobs.catalog.read",
  publicidad: "platform.settings.manage",
};

const SECTION_LABELS: Record<ProAdminSection, string> = {
  empresas: "Verificación de empresas",
  vacantes: "Moderación de vacantes",
  publicidad: "Publicidad (AdSense)",
};

const STATUS_LABELS: Record<CompanyStatus, string> = {
  pending: "Pendiente",
  verified: "Verificada",
  rejected: "Rechazada",
  suspended: "Suspendida",
};

const REASON_LABELS: Record<string, string> = {
  fraude: "Fraude o estafa",
  discriminacion: "Discriminación",
  "informacion-falsa": "Información falsa",
  spam: "Spam",
  otro: "Otro",
};

const card = "rounded-ui-lg border border-ui-border bg-ui-surface p-5 shadow-card";
const button = "rounded-ui-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50";
const primary = `${button} bg-ui-accent text-ui-on-accent hover:bg-ui-accent-hover`;
const secondary = `${button} border border-ui-border-strong text-ui-text hover:bg-ui-soft`;
const danger = `${button} border border-ui-danger text-ui-danger hover:bg-ui-soft`;

type Call = <T>(path: string, init?: RequestInit) => Promise<T>;

function useAdminCall(): Call {
  const navigate = useNavigate();
  return useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const response = await identityRequest(path, init);
      if (response.status === 401) {
        sessionStorage.removeItem("pro_identity_token");
        navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`, { replace: true });
        throw new Error("Tu sesión expiró.");
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || `La solicitud falló (${response.status}).`);
      return payload as T;
    },
    [navigate],
  ) as Call;
}

function CompaniesPanel({ call, canModerate }: { call: Call; canModerate: boolean }) {
  const [filter, setFilter] = useState<CompanyStatus | "all">("pending");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await call<{ companies: Company[] }>(`/api/admin/projobs/companies?status=${filter}`);
      setCompanies(data.companies ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar la lista.");
    } finally {
      setLoading(false);
    }
  }, [call, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const moderate = async (company: Company, status: CompanyStatus) => {
    const note = (notes[company.id] ?? "").trim();
    if ((status === "rejected" || status === "suspended") && note.length < 5) {
      setError("Escribe una nota (mínimo 5 caracteres) explicando el rechazo o la suspensión.");
      return;
    }
    if (status === "suspended" && !window.confirm(`¿Suspender ${company.name}? Sus vacantes dejarán de ser visibles.`)) return;
    setBusy(company.id);
    setError(null);
    try {
      await call(`/api/admin/projobs/companies/${company.id}/verification`, {
        method: "POST",
        body: JSON.stringify({ status, note: note || undefined }),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo actualizar la empresa.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="companies-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="companies-title" className="text-xl font-semibold text-ui-text">Verificación manual de empresas</h2>
          <p className="mt-1 text-sm text-ui-muted">Revisa el dominio, el sitio web y los miembros antes de aprobar. Rechazar o suspender oculta sus vacantes del público.</p>
        </div>
        <label className="text-sm text-ui-muted">
          Estado{" "}
          <select className="ml-1 rounded-ui-md border border-ui-border bg-ui-surface px-2 py-1 text-ui-text" value={filter} onChange={(event) => setFilter(event.target.value as CompanyStatus | "all")}>
            <option value="pending">Pendientes</option>
            <option value="verified">Verificadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="suspended">Suspendidas</option>
            <option value="all">Todas</option>
          </select>
        </label>
      </div>
      {error && <p role="alert" className="rounded-ui-md border border-ui-danger p-3 text-sm text-ui-danger">{error}</p>}
      {loading ? (
        <p className="text-sm text-ui-muted">Cargando…</p>
      ) : companies.length === 0 ? (
        <p className={`${card} text-sm text-ui-muted`}>No hay empresas en este estado.</p>
      ) : (
        <ul className="space-y-3">
          {companies.map((company) => (
            <li key={company.id} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ui-text">{company.name}</p>
                  <p className="text-sm text-ui-muted">
                    {company.industry || "Sector sin indicar"}
                    {company.website && (
                      <>
                        {" · "}
                        <a href={company.website} target="_blank" rel="noopener noreferrer nofollow" className="underline">{company.website}</a>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-ui-subtle">
                    {company.members} miembro(s){company.memberEmails ? `: ${company.memberEmails}` : ""} · {company.publishedJobs} vacante(s) publicadas · Método: {company.verificationMethod || "—"}
                  </p>
                  {company.verificationNote && <p className="mt-1 text-xs text-ui-subtle">Nota: {company.verificationNote}</p>}
                </div>
                <span className="rounded-full border border-ui-border px-2.5 py-0.5 text-xs font-semibold text-ui-text">{STATUS_LABELS[company.verificationStatus]}</span>
              </div>
              {canModerate && (
                <div className="mt-4 space-y-2">
                  <label className="block text-xs text-ui-muted">
                    Nota para el registro (obligatoria al rechazar o suspender)
                    <input
                      className="mt-1 block w-full rounded-ui-md border border-ui-border bg-ui-surface px-2 py-1.5 text-sm text-ui-text"
                      value={notes[company.id] ?? ""}
                      maxLength={500}
                      onChange={(event) => setNotes((current) => ({ ...current, [company.id]: event.target.value }))}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {company.verificationStatus !== "verified" && (
                      <button type="button" className={primary} disabled={busy === company.id} onClick={() => moderate(company, "verified")}>Aprobar</button>
                    )}
                    {company.verificationStatus === "pending" && (
                      <button type="button" className={secondary} disabled={busy === company.id} onClick={() => moderate(company, "rejected")}>Rechazar</button>
                    )}
                    {company.verificationStatus !== "suspended" && (
                      <button type="button" className={danger} disabled={busy === company.id} onClick={() => moderate(company, "suspended")}>Suspender</button>
                    )}
                    {company.verificationStatus !== "pending" && (
                      <button type="button" className={secondary} disabled={busy === company.id} onClick={() => moderate(company, "pending")}>Volver a pendiente</button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function JobsPanel({ call, canModerate }: { call: Call; canModerate: boolean }) {
  const [filter, setFilter] = useState<"reported" | "paused" | "all">("reported");
  const [jobs, setJobs] = useState<ModeratedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await call<{ jobs: ModeratedJob[] }>(`/api/admin/projobs/jobs?filter=${filter}`);
      setJobs(data.jobs ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar la lista.");
    } finally {
      setLoading(false);
    }
  }, [call, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const moderate = async (job: ModeratedJob, action: "pause" | "restore" | "dismiss") => {
    let note: string | undefined;
    if (action === "pause") {
      const input = window.prompt("Motivo de la pausa (queda en el registro):", "");
      if (input === null) return;
      note = input.trim() || undefined;
    }
    setBusy(job.id);
    setError(null);
    try {
      await call(`/api/admin/projobs/jobs/${job.id}/moderation`, { method: "POST", body: JSON.stringify({ action, note }) });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo moderar la vacante.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="jobs-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="jobs-title" className="text-xl font-semibold text-ui-text">Moderación de vacantes</h2>
          <p className="mt-1 text-sm text-ui-muted">Vacantes reportadas por usuarios o pausadas. Pausar oculta la vacante de búsquedas, fichas, sitemap y postulaciones.</p>
        </div>
        <label className="text-sm text-ui-muted">
          Mostrar{" "}
          <select className="ml-1 rounded-ui-md border border-ui-border bg-ui-surface px-2 py-1 text-ui-text" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
            <option value="reported">Con reportes abiertos</option>
            <option value="paused">Pausadas</option>
            <option value="all">Todas las moderadas</option>
          </select>
        </label>
      </div>
      {error && <p role="alert" className="rounded-ui-md border border-ui-danger p-3 text-sm text-ui-danger">{error}</p>}
      {loading ? (
        <p className="text-sm text-ui-muted">Cargando…</p>
      ) : jobs.length === 0 ? (
        <p className={`${card} text-sm text-ui-muted`}>No hay vacantes en esta lista.</p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ui-text">{job.title}</p>
                  <p className="text-sm text-ui-muted">
                    {job.companyName} ({STATUS_LABELS[job.companyStatus] ?? job.companyStatus}) · estado {job.status}
                  </p>
                  {job.openReports > 0 && (
                    <p className="mt-1 text-xs text-ui-subtle">
                      {job.openReports} reporte(s) abierto(s): {job.reasons.map((reason) => REASON_LABELS[reason] ?? reason).join(", ")}
                    </p>
                  )}
                  {job.moderationNote && <p className="mt-1 text-xs text-ui-subtle">Nota: {job.moderationNote}</p>}
                </div>
                <span className="rounded-full border border-ui-border px-2.5 py-0.5 text-xs font-semibold text-ui-text">
                  {job.moderationStatus === "paused" ? "Pausada" : "Visible"}
                </span>
              </div>
              {canModerate && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {job.moderationStatus === "ok" ? (
                    <button type="button" className={danger} disabled={busy === job.id} onClick={() => moderate(job, "pause")}>Pausar</button>
                  ) : (
                    <button type="button" className={primary} disabled={busy === job.id} onClick={() => moderate(job, "restore")}>Restaurar</button>
                  )}
                  {job.openReports > 0 && (
                    <button type="button" className={secondary} disabled={busy === job.id} onClick={() => moderate(job, "dismiss")}>Descartar reportes</button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Validates the ads form before sending it (ProIdentity validates again). */
export function validateAdsSettings(settings: AdsSettings): string | null {
  const id = (settings.publisherId ?? "").trim();
  if (id && !PUBLISHER_ID.test(id)) return "El Publisher ID debe tener el formato ca-pub-0000000000000000.";
  if (settings.enabled && !id) return "Para activar los anuncios escribe el Publisher ID.";
  return null;
}

function AdsPanel({ call }: { call: Call }) {
  const [settings, setSettings] = useState<AdsSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    call<{ ads: AdsSettings }>("/api/admin/platform/ads")
      .then((data) => setSettings(data.ads))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "No se pudo cargar la configuración."));
  }, [call]);

  if (!settings) {
    return error ? <p role="alert" className="text-sm text-ui-danger">{error}</p> : <p className="text-sm text-ui-muted">Cargando…</p>;
  }

  const save = async () => {
    const invalid = validateAdsSettings(settings);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const data = await call<{ ads: AdsSettings }>("/api/admin/platform/ads", {
        method: "PUT",
        body: JSON.stringify({ ...settings, publisherId: settings.publisherId?.trim() || null }),
      });
      setSettings(data.ads);
      resetAdsConfigCache();
      setNotice("Configuración guardada. Los sitios la aplican en la siguiente visita de cada usuario.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="ads-title" className="space-y-4">
      <div>
        <h2 id="ads-title" className="text-xl font-semibold text-ui-text">Publicidad (Google AdSense)</h2>
        <p className="mt-1 text-sm text-ui-muted">
          Los anuncios solo se muestran si el interruptor global está activo, hay Publisher ID, la ubicación está habilitada y el visitante aceptó las cookies de publicidad. Nunca aparecen en login, registro, páginas legales, cuenta ni errores.
        </p>
      </div>
      <div className={`${card} space-y-5`}>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block font-semibold text-ui-text">Anuncios activos</span>
            <span className="text-sm text-ui-muted">Interruptor global para todos los sitios.</span>
          </span>
          <input type="checkbox" className="h-5 w-5" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} />
        </label>
        <label className="block">
          <span className="block font-semibold text-ui-text">Publisher ID</span>
          <input
            className="mt-1 block w-full rounded-ui-md border border-ui-border bg-ui-surface px-3 py-2 font-mono text-sm text-ui-text"
            placeholder="ca-pub-0000000000000000"
            value={settings.publisherId ?? ""}
            onChange={(event) => setSettings({ ...settings, publisherId: event.target.value })}
          />
          <span className="mt-1 block text-xs text-ui-subtle">Si cada sitio tiene VITE_ADSENSE_CLIENT_ID en su build, ese valor tiene prioridad.</span>
        </label>
        <fieldset>
          <legend className="font-semibold text-ui-text">Ubicaciones activas</legend>
          <div className="mt-2 space-y-2">
            {(Object.keys(AD_PLACEMENT_LABELS) as Placement[]).map((placement) => (
              <label key={placement} className="flex items-center gap-2 text-sm text-ui-text">
                <input
                  type="checkbox"
                  checked={settings.placements[placement] ?? false}
                  onChange={(event) => setSettings({ ...settings, placements: { ...settings.placements, [placement]: event.target.checked } })}
                />
                {AD_PLACEMENT_LABELS[placement]}
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-ui-danger">{error}</p>}
        {notice && <p role="status" className="text-sm text-ui-success">{notice}</p>}
        <button type="button" className={primary} disabled={saving} onClick={save}>
          {saving ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
    </section>
  );
}

export function ProAdminPage({ section }: { section: ProAdminSection }) {
  const { locale, setLocale } = useCoreLocale();
  const call = useAdminCall();
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [account, setAccount] = useState<{ name?: string | null; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${SECTION_LABELS[section]} | ProAdmin`;
  }, [section]);

  useEffect(() => {
    call<{ user?: { name?: string | null; email: string; permissions?: string[]; modulePermissions?: Record<string, string[]> } }>("/api/auth/me")
      .then((me) => {
        const user = me.user;
        if (!user) throw new Error("No se pudo cargar tu cuenta.");
        setAccount({ name: user.name, email: user.email });
        setPermissions([...(user.permissions ?? []), ...(user.modulePermissions?.PROJOBS ?? [])]);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "No se pudo cargar tu cuenta."));
  }, [call]);

  const has = (permission: string) => permissions?.includes(permission) ?? false;
  const allowed = (Object.keys(SECTION_LABELS) as ProAdminSection[]).filter((key) => has(SECTION_PERMISSIONS[key]));

  return (
    <NoAds>
      <div className="ui-page flex min-h-screen flex-col">
        <ProHeader
          activeApp="core"
          locale={locale}
          onLocaleChange={() => setLocale(locale === "es" ? "en" : "es")}
          profile={account}
          profileHref="/dashboard"
          securityHref="/security/sessions"
          loginHref="/login?returnTo=%2Fadmin"
        />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
          <p className="text-sm">
            <Link to="/admin" className="text-ui-muted hover:underline">← Consola administrativa</Link>
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ui-text">ProAdmin</h1>
          {error ? (
            <p role="alert" className="mt-6 rounded-ui-md border border-ui-danger p-4 text-sm text-ui-danger">{error}</p>
          ) : permissions === null ? (
            <p className="mt-6 text-sm text-ui-muted">Verificando permisos…</p>
          ) : !has(SECTION_PERMISSIONS[section]) ? (
            <p role="alert" className="mt-6 rounded-ui-md border border-ui-border p-4 text-sm text-ui-text">
              Tu cuenta no tiene el permiso necesario para esta sección ({SECTION_PERMISSIONS[section]}).
            </p>
          ) : (
            <>
              <nav aria-label="Secciones de ProAdmin" className="mt-4 flex flex-wrap gap-2 border-b border-ui-border pb-3">
                {allowed.map((key) => (
                  <NavLink
                    key={key}
                    to={`/admin/${key}`}
                    className={({ isActive }) =>
                      `rounded-ui-md px-3 py-1.5 text-sm font-semibold ${isActive ? "bg-ui-accent text-ui-on-accent" : "text-ui-muted hover:bg-ui-soft"}`
                    }
                  >
                    {SECTION_LABELS[key]}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-6">
                {section === "empresas" && <CompaniesPanel call={call} canModerate={has("projobs.catalog.moderate")} />}
                {section === "vacantes" && <JobsPanel call={call} canModerate={has("projobs.catalog.moderate")} />}
                {section === "publicidad" && <AdsPanel call={call} />}
              </div>
            </>
          )}
        </main>
        <ProFooter locale={locale} />
      </div>
    </NoAds>
  );
}
