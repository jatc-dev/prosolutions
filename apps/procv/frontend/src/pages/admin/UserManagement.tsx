import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { api } from "../../services/api";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    cvs: number;
  };
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function UserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<UsersResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const searchInputId = useId();
  const roleFilterId = useId();
  const modalTitleId = useId();
  const resetPasswordTitleId = useId();

  useEffect(() => {
    if (!editingUser) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEditingUser(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [editingUser]);

  const fetchUsers = async (page = 1, search = "", role = "") => {
    try {
      setLoading(true);
      let url = `/admin/users?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (role) url += `&role=${role}`;

      const response = await api.get(url);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.message || t("admin.userManagement.errors.loadUsers"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, searchTerm, roleFilter);
  }, [searchTerm, roleFilter]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
  };

  const handleUserSelect = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(users.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;
    if (!confirm(t("admin.userManagement.confirm.deleteUsers", { count: selectedUsers.size }))) return;

    try {
      await Promise.all(Array.from(selectedUsers).map(userId =>
        api.delete(`/admin/users/${userId}`)
      ));
      setSelectedUsers(new Set());
      fetchUsers(pagination?.page || 1, searchTerm, roleFilter);
    } catch (err: any) {
      setError(err.response?.data?.message || t("admin.userManagement.errors.deleteUsers"));
    }
  };

  const handleBulkRoleChange = async (newRole: string) => {
    if (selectedUsers.size === 0) return;

    try {
      await Promise.all(Array.from(selectedUsers).map(userId =>
        api.put(`/admin/users/${userId}`, { role: newRole })
      ));
      setSelectedUsers(new Set());
      fetchUsers(pagination?.page || 1, searchTerm, roleFilter);
    } catch (err: any) {
      setError(err.response?.data?.message || t("admin.userManagement.errors.updateUsers"));
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/admin/export/users/csv', {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || t("admin.userManagement.errors.exportUsers"));
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email,
      role: user.role
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      await api.put(`/admin/users/${editingUser.id}`, editForm);
      setEditingUser(null);
      fetchUsers(pagination?.page || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || t("admin.userManagement.errors.updateUser"));
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm(t("admin.userManagement.confirm.deleteUser"))) return;

    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers(pagination?.page || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || t("admin.userManagement.errors.deleteUser"));
    }
  };

  const handleResetPassword = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setResetPasswordUser(user);
      setNewPassword("");
    }
  };

  const handleSaveResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;

    try {
      await api.post(`/admin/users/${resetPasswordUser.id}/reset-password`, { newPassword });
      setResetPasswordUser(null);
      setNewPassword("");
      toast.success(t("admin.userManagement.success.passwordReset"));
    } catch (err: any) {
      setError(err.response?.data?.message || t("admin.userManagement.errors.resetPassword"));
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="ui-card flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        <p className="ml-3 text-sm text-slate-500">{t("admin.userManagement.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{t("admin.userManagement.title")}</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{t("admin.userManagement.subtitle")}</p>
      </div>

      {error && (
        <div className="ui-error-state" role="alert" aria-live="assertive">
          <p className="text-rose-800">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-2 text-sm text-rose-600 hover:underline"
          >
            {t("admin.userManagement.dismiss")}
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="ui-card mb-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor={searchInputId} className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t("admin.userManagement.searchUsers")}
            </label>
            <input
              id={searchInputId}
              type="text"
              placeholder={t("admin.userManagement.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor={roleFilterId} className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t("admin.userManagement.filterByRole")}
            </label>
            <select
              id={roleFilterId}
              value={roleFilter}
              onChange={(e) => handleRoleFilterChange(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">{t("admin.userManagement.allRoles")}</option>
              <option value="user">{t("admin.userManagement.roleUser")}</option>
              <option value="admin">{t("admin.userManagement.roleAdmin")}</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => fetchUsers(1, searchTerm, roleFilter)}
              className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors"
            >
              {t("admin.userManagement.applyFilters")}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {t("admin.userManagement.selectedUsers", { count: selectedUsers.size })}
            </span>
            <div className="flex gap-2">
              <select
                onChange={(e) => e.target.value && handleBulkRoleChange(e.target.value)}
                className="rounded border border-blue-300 px-3 py-1 text-sm dark:border-blue-700 dark:bg-slate-900 dark:text-slate-100"
                defaultValue=""
              >
                <option value="">{t("admin.userManagement.changeRole")}</option>
                <option value="user">{t("admin.userManagement.setAsUser")}</option>
                <option value="admin">{t("admin.userManagement.setAsAdmin")}</option>
              </select>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                {t("admin.userManagement.deleteSelected")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="ui-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("admin.userManagement.usersCount", { count: pagination?.total || 0 })}
          </h2>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t("admin.userManagement.exportCsv")}
          </button>
        </div>

        <div className="overflow-x-auto" aria-busy={loading}>
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === users.length && users.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label={t("admin.userManagement.selectAllUsers", { defaultValue: "Select all users" })}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {t("admin.userManagement.table.user")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {t("admin.userManagement.table.role")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {t("admin.userManagement.table.cvs")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {t("admin.userManagement.table.created")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {t("admin.userManagement.table.lastLogin")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {t("admin.userManagement.table.emailVerified")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {t("admin.userManagement.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
              {users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/70">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={(e) => handleUserSelect(user.id, e.target.checked)}
                      aria-label={t("admin.userManagement.selectUser", { defaultValue: "Select user" }) + ` ${user.email}`}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{user.name || t("admin.unnamedUser")}</div>
                      <div className="text-slate-500 dark:text-slate-300">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-100'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-900 dark:text-slate-100">
                    {user._count.cvs}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-300">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-300">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : t("admin.userManagement.never")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${
                        user.emailVerified
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100'
                      }`}
                      title={
                        user.emailVerified
                          ? t("admin.userManagement.verified")
                          : t("admin.userManagement.pending")
                      }
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          user.emailVerified ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      {user.emailVerified
                        ? t("admin.userManagement.verified")
                        : t("admin.userManagement.pending")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(user)}
                      className="inline-flex rounded-md px-2 py-1 text-blue-600 hover:bg-blue-50 hover:text-blue-900"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetPassword(user.id)}
                      className="inline-flex rounded-md px-2 py-1 text-amber-600 hover:bg-amber-50 hover:text-amber-900"
                    >
                      {t("admin.userManagement.resetPassword")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(user.id)}
                      className="inline-flex rounded-md px-2 py-1 text-rose-600 hover:bg-rose-50 hover:text-rose-900"
                    >
                      {t("common.delete")}
                    </button>
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
              {t("admin.userManagement.showing", {
                from: ((pagination.page - 1) * pagination.limit) + 1,
                to: Math.min(pagination.page * pagination.limit, pagination.total),
                total: pagination.total
              })}
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="rounded border border-slate-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t("common.previous")}
              </button>
              <button
                type="button"
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="rounded border border-slate-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t("common.next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setEditingUser(null)}>
          <div
            className="ui-surface w-full max-w-md p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={modalTitleId} className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{t("admin.userManagement.editUser")}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">{t("auth.name")}</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">{t("auth.email")}</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">{t("admin.userManagement.table.role")}</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="user">{t("admin.userManagement.roleUser")}</option>
                  <option value="admin">{t("admin.userManagement.roleAdmin")}</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setResetPasswordUser(null)}>
          <div
            className="ui-surface w-full max-w-md p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby={resetPasswordTitleId}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={resetPasswordTitleId} className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t("admin.userManagement.resetPassword")}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t("admin.userManagement.prompts.newPassword")}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  placeholder={t("admin.userManagement.prompts.newPassword")}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setResetPasswordUser(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSaveResetPassword}
                disabled={!newPassword}
                className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}