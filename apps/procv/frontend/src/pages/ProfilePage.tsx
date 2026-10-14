import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../stores/authStore";
import { AppHeader } from "../components/AppHeader";
import { Footer } from "../components/Footer";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useApi } from "../hooks/useApi";
import { api } from "../services/api";

export function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { execute: updateProfile, loading, error } = useApi();

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || ""
  });
  const [successMessage, setSuccessMessage] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSuccessMessage(""); // Clear success message when user starts typing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await updateProfile(
        () => api.put('/auth/profile', {
          name: formData.name || undefined,
          email: formData.email || undefined
        }),
        (data: any) => {
          // Update local form data with response
          if (data.user) {
            setFormData({
              name: data.user.name || "",
              email: data.user.email || ""
            });
          }
          setSuccessMessage(t('profile.updateSuccess', 'Profile updated successfully'));
        }
      );
    } catch (err) {
      // Error is handled by useApi hook
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || ""
    });
    setSuccessMessage("");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <AppHeader
        leftExtra={
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-100 transition-colors"
            >
              ← {t('dashboard.myCVs')}
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('navigation.profile')}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-300 -mt-1">{user?.email}</p>
            </div>
          </div>
        }
      />

      <main className="max-w-2xl mx-auto p-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('profile.personalInfo', 'Personal Information')}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {t('profile.personalInfoDesc', 'Update your personal information and account settings')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Avatar Section */}
          {/* Profile Avatar Section */}
          <div className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-brand-500 rounded-full flex items-center justify-center">
              <span className="text-xl font-semibold text-white">
                {(user?.name || user?.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">{user?.name || t('common.user', 'User')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-300">{user?.email}</p>
            </div>
          </div>

            {/* Name Field */}
            <div>
              <Input
                label={t('profile.fullName', 'Full Name')}
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('profile.fullNamePlaceholder', 'Enter your full name')}
                helperText={t('profile.fullNameHelp', 'This is the name that will appear on your CVs')}
                error={error && error.includes('name') ? error : undefined}
              />
            </div>

            {/* Email Field */}
            <div>
              <Input
                label={t('profile.email', 'Email Address')}
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder={t('profile.emailPlaceholder', 'Enter your email address')}
                helperText={t('profile.emailHelp', 'This email will be used for account notifications')}
                error={error && error.includes('email') ? error : undefined}
              />
            </div>

            {/* Account Info (Read-only) */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">{t('profile.accountInfo', 'Account Information')}</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wide">
                    {t('profile.accountType', 'Account Type')}
                  </label>
                  <p className="mt-1 text-sm text-slate-900 dark:text-white capitalize">
                    {user?.role === 'admin' ? t('common.admin', 'Administrator') : t('common.user', 'User')}
                  </p>
                </div>
              </div>
            </div>

            {/* Success/Error Messages */}
            {successMessage && (
              <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
                <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
              </div>
            )}

            {error && !successMessage && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="submit"
                variant="primary"
                size="md"
                block
                disabled={loading}
              >
                {loading ? t('common.saving', 'Saving...') : t('common.save', 'Save Changes')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="md"
                block
                onClick={handleCancel}
                disabled={loading}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
