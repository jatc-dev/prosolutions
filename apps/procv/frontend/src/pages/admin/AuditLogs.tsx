import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function AuditLogs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<AuditLogsResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/audit-logs?page=${page}&limit=25`);
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.message || t("admin.auditLogs.errors.loadLogs"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDetails = (details: string | null) => {
    if (!details) return t("admin.auditLogs.noDetails");

    try {
      const parsed = JSON.parse(details);
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed)
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join(", ");
      }
      return String(parsed);
    } catch {
      return details;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'register':
        return 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-100';
      case 'update':
      case 'edit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100';
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-100';
      case 'login':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-100';
      case 'export':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="ui-card flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        <p className="ml-3 text-sm text-slate-500">{t("admin.auditLogs.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{t("admin.auditLogs.title")}</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{t("admin.auditLogs.subtitle")}</p>
      </div>

      {error && (
        <div className="ui-error-state" role="alert" aria-live="assertive">
          <p className="text-rose-800">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-2 text-sm text-rose-600 hover:underline"
          >
            {t("admin.auditLogs.dismiss")}
          </button>
        </div>
      )}

      {/* Logs Table */}
      <div className="ui-surface overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("admin.auditLogs.activityLogsCount", { count: pagination?.total || 0 })}
          </h2>
        </div>

        <div className="overflow-x-auto" aria-busy={loading}>
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {t("admin.auditLogs.table.admin")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {t("admin.auditLogs.table.action")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {t("admin.auditLogs.table.resource")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {t("admin.auditLogs.table.details")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {t("admin.auditLogs.table.ipAddress")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {t("admin.auditLogs.table.timestamp")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
              {logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/70">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{log.userId ? `Identity · ${log.userId.slice(0, 8)}…` : t('admin.auditLogs.systemActor', 'Sistema')}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-300">{t("admin.auditLogs.idPrefix")} {log.userId ? `${log.userId.slice(0, 8)}...` : "—"}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-slate-900 capitalize dark:text-slate-100">{log.resourceType}</div>
                      {log.resourceId && (
                        <div className="text-sm text-slate-500 dark:text-slate-300">{t("admin.auditLogs.idPrefix")} {log.resourceId.slice(0, 8)}...</div>
                      )}
                    </div>
                  </td>
                  <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-500 dark:text-slate-300">
                    {formatDetails(log.details)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500 dark:text-slate-300">
                    {log.ipAddress || t("admin.auditLogs.notAvailable")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500 dark:text-slate-300">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
            <div className="text-sm text-slate-700 dark:text-slate-300">
              {t("admin.auditLogs.showing", {
                from: ((pagination.page - 1) * pagination.limit) + 1,
                to: Math.min(pagination.page * pagination.limit, pagination.total),
                total: pagination.total
              })}
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="rounded border border-slate-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t("common.previous")}
              </button>
              <button
                type="button"
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="rounded border border-slate-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t("common.next")}
              </button>
            </div>
          </div>
        )}

        {logs.length === 0 && !loading && (
          <div className="ui-empty-state m-6">
            <p>{t("admin.auditLogs.empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}