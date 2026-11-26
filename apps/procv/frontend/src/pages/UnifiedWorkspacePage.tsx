import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppHeader } from "../components/AppHeader";
import { api } from "../services/api";
import { CURATED_CV_TEMPLATES } from "../utils/templateCatalog";
import toast from "react-hot-toast";
import { CvCardMenu, type CvCardAction } from "../components/CvCardMenu";

interface CVItem {
  id: string;
  title: string;
  template: string;
  updatedAt: string;
}

export function UnifiedWorkspacePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cvs, setCvs] = useState<CVItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const loadCvs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/cvs");
      setCvs(Array.isArray(response?.data?.cvs) ? response.data.cvs : []);
    } catch (err: any) {
      const message = err?.response?.data?.message || t("dashboard.errorLoadingCVs");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadCvs(); }, [loadCvs]);

  const createCv = async () => {
    setBusyId("new");
    try {
      const response = await api.post("/cvs", { title: t("dashboard.newCV"), template: "sidebar" });
      const cv = response?.data?.cv;
      if (!cv?.id) throw new Error("El servidor no devolvió el identificador de la hoja de vida.");
      navigate(`/editor/${cv.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || t("dashboard.errorCreatingCV"));
    } finally {
      setBusyId(null);
    }
  };

  const duplicateCv = async (item: CVItem) => {
    setBusyId(item.id);
    try {
      const original = await api.get(`/cvs/${item.id}`);
      const response = await api.post("/cvs", {
        title: t("workspace.copyTitle", { title: item.title }).slice(0, 150),
        template: item.template,
        data: original?.data?.cv?.data,
      });
      const duplicate = response?.data?.cv;
      if (duplicate?.id) {
        toast.success(t("workspace.success.cvDuplicated"));
        await loadCvs();
        navigate(`/editor/${duplicate.id}`);
      } else {
        throw new Error("No se pudo crear la copia.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || t("workspace.errors.duplicateCv"));
    } finally {
      setBusyId(null);
    }
  };

  const deleteCv = async (item: CVItem) => {
    if (!window.confirm(t("workspace.confirm.deleteCvNamed", { title: item.title }))) return;
    setBusyId(item.id);
    try {
      await api.delete(`/cvs/${item.id}`);
      setCvs((current) => current.filter((cv) => cv.id !== item.id));
      toast.success(t("workspace.success.cvDeleted"));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("workspace.errors.deleteCv"));
    } finally {
      setBusyId(null);
    }
  };

  const startRename = (item: CVItem) => {
    setRenamingId(item.id);
    setDraftTitle(item.title);
  };

  useEffect(() => {
    if (!renamingId) return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [renamingId]);

  const cancelRename = () => {
    setRenamingId(null);
    setDraftTitle("");
  };

  /** Optimistic rename; reverts if the server rejects it. */
  const commitRename = async (item: CVItem) => {
    if (renamingId !== item.id) return;
    const title = draftTitle.trim().replace(/\s+/g, " ");
    cancelRename();
    if (!title) { toast.error(t("workspace.errors.titleRequired")); return; }
    if (title === item.title) return;
    setCvs((current) => current.map((cv) => (cv.id === item.id ? { ...cv, title } : cv)));
    try {
      const response = await api.put(`/cvs/${item.id}`, { title });
      const updatedAt = response?.data?.cv?.updatedAt;
      if (updatedAt) setCvs((current) => current.map((cv) => (cv.id === item.id ? { ...cv, updatedAt } : cv)));
      toast.success(t("workspace.success.cvRenamed"));
    } catch (err: any) {
      setCvs((current) => current.map((cv) => (cv.id === item.id ? { ...cv, title: item.title } : cv)));
      toast.error(err?.response?.data?.message || t("workspace.errors.renameCv"));
    }
  };

  const onCardAction = (item: CVItem, action: CvCardAction) => {
    if (action === "rename") startRename(item);
    else if (action === "duplicate") void duplicateCv(item);
    else void deleteCv(item);
  };

  const templateLabel = (key: string) =>
    t(`workspace.templates.${key}`, {
      defaultValue: CURATED_CV_TEMPLATES.find((template) => template.key === key)?.label || key,
    });

  const formatDate = (value: string) => value ? new Date(value).toLocaleString() : t("workspace.never");

  return (
    <div className="ui-page flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <AppHeader />
      <main className="ui-container w-full flex-1 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{t("workspace.dashboardTitle")}</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{t("workspace.dashboardSubtitle")}</p>
          </div>
          <button type="button" onClick={createCv} disabled={busyId === "new"} className="rounded-lg bg-brand-800 px-5 py-3 font-semibold text-white transition hover:bg-brand-900 disabled:opacity-60">
            {busyId === "new" ? t("common.loading") : t("dashboard.newCV")}
          </button>
        </div>

        {error ? <div role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">{error}</div> : null}

        {loading ? (
          <>
            <LoadingNotice />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
              {[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />)}
            </div>
          </>
        ) : cvs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t("workspace.empty.title")}</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-600 dark:text-slate-300">{t("workspace.empty.description")}</p>
            <button type="button" onClick={createCv} disabled={busyId === "new"} className="mt-6 rounded-lg bg-brand-800 px-6 py-3 font-semibold text-white hover:bg-brand-900 disabled:opacity-60">{t("dashboard.createFirstCV")}</button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cvs.map((cv) => (
              <article key={cv.id} onClick={() => { if (renamingId !== cv.id) navigate(`/editor/${cv.id}`); }} className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-800">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900 dark:bg-brand-950/50 dark:text-brand-200">{templateLabel(cv.template)}</span>
                  <CvCardMenu
                    label={t("workspace.actions.moreFor", { title: cv.title })}
                    disabled={busyId === cv.id}
                    labels={{ rename: t("workspace.actions.rename"), duplicate: t("dashboard.duplicateCV"), delete: t("common.delete") }}
                    onAction={(action) => onCardAction(cv, action)}
                  />
                </div>
                {renamingId === cv.id ? (
                  <form onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); void commitRename(cv); }}>
                    <label className="sr-only" htmlFor={`rename-${cv.id}`}>{t("workspace.actions.renameLabel")}</label>
                    <input
                      id={`rename-${cv.id}`}
                      ref={renameInputRef}
                      value={draftTitle}
                      maxLength={150}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      onBlur={() => void commitRename(cv)}
                      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); cancelRename(); } }}
                      className="w-full rounded-lg border border-brand-400 bg-white px-2 py-1 text-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("workspace.actions.renameHint")}</p>
                  </form>
                ) : (
                  <div className="flex items-start gap-1">
                    <h2 className="min-w-0 break-words text-lg font-semibold text-slate-900 dark:text-slate-100">{cv.title}</h2>
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); startRename(cv); }}
                      aria-label={t("workspace.actions.renameNamed", { title: cv.title })}
                      title={t("workspace.actions.rename")}
                      className="mt-0.5 shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("workspace.updated", { date: formatDate(cv.updatedAt) })}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/editor/${cv.id}`); }} className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900">{t("common.edit")}</button>
                  {busyId === cv.id ? <span role="status" className="self-center text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</span> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

    </div>
  );
}

/** How long before the loading message explains that the server is waking up. */
export const SLOW_LOAD_MS = 6000;

/**
 * Shown while the saved CVs load (the cards alone gave no clue). The server
 * sleeps when unused, so a slow first load gets an explanation.
 */
function LoadingNotice() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div role="status" aria-live="polite" className="mb-5 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200">
      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      <div>
        <p className="font-medium">Cargando tus hojas de vida…</p>
        {slow ? (
          <p className="mt-0.5 text-brand-800 dark:text-brand-300">
            Está tardando un poco más de lo normal: el servidor se está activando y puede tardar hasta un minuto. No cierres la página.
          </p>
        ) : null}
      </div>
    </div>
  );
}
