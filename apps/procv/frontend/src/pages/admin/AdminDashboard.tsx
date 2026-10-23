import { useCallback, useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { api } from "../../services/api";
import { useTranslation } from "react-i18next";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SystemStats {
  totalUsers: number;
  totalCVs: number;
  recentUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  }>;
}

interface ChartData {
  userGrowth: {
    labels: string[];
    data: number[];
  };
  cvCreation: {
    labels: string[];
    data: number[];
  };
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
        api.get("/admin/charts?days=30")
      ]);

      setStats(statsResponse.data.stats);
      setChartData(chartResponse.data.charts);
    } catch (err: any) {
      setError(err.response?.data?.message || t('admin.errorLoadingDashboard'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        <p className="ml-3 text-sm text-slate-500">{t('admin.loadingDashboard')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-error-state">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/40"
          >
            {t('common.retry', 'Reintentar')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{t('admin.dashboard')}</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{t('admin.overview')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="ui-card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('admin.totalUsers')}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats?.totalUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="ui-card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('admin.totalCVs')}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats?.totalCVs || 0}</p>
            </div>
          </div>
        </div>

        <div className="ui-card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('admin.growth')}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">+12%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {chartData && (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{t('admin.userGrowth30Days')}</h2>
            <div className="h-64">
              <Line
                data={{
                  labels: chartData.userGrowth.labels.map(date => new Date(date).toLocaleDateString()),
                  datasets: [{
                    label: t('admin.newUsers'),
                    data: chartData.userGrowth.data,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{t('admin.cvTrends30Days')}</h2>
            <div className="h-64">
              <Bar
                data={{
                  labels: chartData.cvCreation.labels.map(date => new Date(date).toLocaleDateString()),
                  datasets: [{
                    label: t('admin.cvsCreated'),
                    data: chartData.cvCreation.data,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Recent Users */}
      <div className="ui-surface">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('admin.recentUsers')}</h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {stats?.recentUsers && stats.recentUsers.length > 0 ? (
            stats.recentUsers.map((user) => (
              <div key={user.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{user.name || t('admin.unnamedUser')}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{user.email}</p>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            <div className="ui-empty-state m-6">
              {t('admin.noRecentUsers')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}