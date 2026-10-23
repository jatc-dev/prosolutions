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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

interface SystemStats {
  cvOwnerCount: number;
  totalCVs: number;
}

interface ChartSeries {
  labels: string[];
  data: number[];
}

interface ChartData {
  cvOwnerActivity: ChartSeries;
  cvCreation: ChartSeries;
}

export function AdminDashboard() {
  const { t } = useTranslation();
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
    } catch (err: any) {
      setError(err.response?.data?.message || t("admin.errorLoadingDashboard"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500" />
        <p className="ml-3 text-sm text-slate-500">{t("admin.loadingDashboard")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-error-state">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>{error}</p>
          <button type="button" onClick={() => void fetchData()} className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/40">
            {t("common.retry", "Reintentar")}
          </button>
        </div>
      </div>
    );
  }

  const dateLabels = (series: ChartSeries) => series.labels.map(date => new Date(date).toLocaleDateString());

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{t("admin.dashboard")}</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Actividad de ProCV. Las cuentas y sus permisos se administran centralmente en ProIdentity.</p>
      </header>

      <section aria-label="Indicadores de ProCV" className="grid gap-6 sm:grid-cols-2">
        <div className="ui-card">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Usuarios con CV guardados</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats?.cvOwnerCount ?? 0}</p>
          <p className="mt-1 text-sm text-slate-500">Identidades únicas presentes en los datos de CV</p>
        </div>
        <div className="ui-card">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("admin.totalCVs")}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats?.totalCVs ?? 0}</p>
          <p className="mt-1 text-sm text-slate-500">Documentos guardados en ProCV</p>
        </div>
      </section>

      {chartData && (
        <section aria-label="Tendencias de ProCV" className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Creación de CV · últimos 30 días</h2>
            <div className="h-64">
              <Bar data={{
                labels: dateLabels(chartData.cvCreation),
                datasets: [{ label: t("admin.cvsCreated"), data: chartData.cvCreation.data, backgroundColor: "rgba(34, 197, 94, 0.8)", borderColor: "rgb(34, 197, 94)", borderWidth: 1 }],
              }} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }} />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Usuarios que crearon CV · últimos 30 días</h2>
            <div className="h-64">
              <Line data={{
                labels: dateLabels(chartData.cvOwnerActivity),
                datasets: [{ label: "Usuarios con actividad", data: chartData.cvOwnerActivity.data, borderColor: "rgb(59, 130, 246)", backgroundColor: "rgba(59, 130, 246, 0.1)", tension: 0.35, fill: true }],
              }} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
