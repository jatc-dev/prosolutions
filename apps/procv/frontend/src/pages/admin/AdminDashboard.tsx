import { useCallback, useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { api } from "../../services/api";
import { useTranslation } from "react-i18next";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
);

interface SystemStats {
  totalProCVAccounts: number;
  totalCVs: number;
}

interface ChartData {
  procvAccountGrowth: { labels: string[]; data: number[] };
  cvCreation: { labels: string[]; data: number[] };
}

export function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const isSpanish = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase().startsWith("es");
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsResponse, chartResponse] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/charts?days=30"),
      ]);
      setStats(statsResponse.data.stats);
      setChartData(chartResponse.data.charts);
    } catch (requestError: unknown) {
      const responseError = requestError as { response?: { data?: { message?: string } } };
      setError(responseError.response?.data?.message || t("admin.errorLoadingDashboard"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500" />
        <p className="ml-3 text-sm text-slate-500">{t("admin.loadingDashboard")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-error-state" role="alert">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {t("common.retry", isSpanish ? "Reintentar" : "Retry")}
          </button>
        </div>
      </div>
    );
  }

  const dates = (labels: string[]) => labels.map((date) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString(
      isSpanish ? "es-CO" : "en-US",
      { month: "short", day: "numeric", timeZone: "UTC" },
    ),
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {t("admin.dashboard")}
        </h1>
        <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
          {isSpanish
            ? "Actividad de ProCV, basada únicamente en los datos de producto. La identidad y los permisos globales se administran en ProIdentity."
            : "ProCV product activity only. Global identity and module entitlements are managed in ProIdentity."}
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
              <svg className="h-6 w-6 text-blue-700 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m16 0v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M14 21h6M10 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {isSpanish ? "Cuentas con referencia en ProCV" : "Accounts referenced by ProCV"}
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {stats?.totalProCVAccounts ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {isSpanish ? "No representa el total de usuarios de la plataforma." : "This is not the platform-wide user count."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <svg className="h-6 w-6 text-emerald-700 dark:text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h7l5 5v13H7a2 2 0 01-2-2V5a2 2 0 012-2zm7 0v5h5M8 13h7M8 17h7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("admin.totalCVs")}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {stats?.totalCVs ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {isSpanish ? "CV guardados en la base de ProCV." : "CVs stored in the ProCV database."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {chartData && (
        <div className="grid gap-8 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {isSpanish ? "Cuentas referenciadas en ProCV · 30 días" : "ProCV account references · 30 days"}
            </h2>
            <div className="h-72">
              <Line
                data={{
                  labels: dates(chartData.procvAccountGrowth.labels),
                  datasets: [{
                    label: isSpanish ? "Cuentas" : "Accounts",
                    data: chartData.procvAccountGrowth.data,
                    borderColor: "rgb(59, 130, 246)",
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    tension: 0.3,
                    fill: true,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t("admin.cvTrends30Days")}
            </h2>
            <div className="h-72">
              <Bar
                data={{
                  labels: dates(chartData.cvCreation.labels),
                  datasets: [{
                    label: t("admin.cvsCreated"),
                    data: chartData.cvCreation.data,
                    backgroundColor: "rgba(34, 197, 94, 0.8)",
                    borderColor: "rgb(34, 197, 94)",
                    borderWidth: 1,
                    borderRadius: 4,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
