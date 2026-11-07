import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppHeader } from "../components/AppHeader";
import { Footer } from "../components/Footer";
import { api } from "../services/api";
import { CURATED_CV_TEMPLATES } from "../utils/templateCatalog";
import toast from "react-hot-toast";

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

  const duplicateCv = async (event: React.MouseEvent, item: CVItem) => {
    event.stopPropagation();
    setBusyId(item.id);
    try {
      const original = await api.get(`/cvs/${item.id}`);
      const response = await api.post("/cvs", {
        title: `${item.title} (Copia)`,
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

  const deleteCv = async (event: React.MouseEvent, item: CVItem) => {
    event.stopPropagation();
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
          <button type="button" onClick={createCv} disabled={busyId === "new"} className="rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
            {busyId === "new" ? t("common.loading") : t("dashboard.newCV")}
          </button>
        </div>

        {error ? <div role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">{error}</div> : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />)}
          </div>
        ) : cvs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t("workspace.empty.title")}</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-600 dark:text-slate-300">{t("workspace.empty.description")}</p>
            <button type="button" onClick={createCv} disabled={busyId === "new"} className="mt-6 rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{t("dashboard.createFirstCV")}</button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cvs.map((cv) => (
              <article key={cv.id} onClick={() => navigate(`/editor/${cv.id}`)} className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-600">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950/50 dark:text-brand-200">{templateLabel(cv.template)}</span>
                  <span className="text-xs text-slate-400">{formatDate(cv.updatedAt)}</span>
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{cv.title}</h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/editor/${cv.id}`); }} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">{t("common.edit")}</button>
                  <button type="button" onClick={(event) => void duplicateCv(event, cv)} disabled={busyId === cv.id} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">{t("dashboard.duplicateCV")}</button>
                  <button type="button" onClick={(event) => void deleteCv(event, cv)} disabled={busyId === cv.id} className="rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:hover:bg-rose-950/30">{t("common.delete")}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
