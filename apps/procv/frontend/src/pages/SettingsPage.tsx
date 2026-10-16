import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppHeader } from "../components/AppHeader";
import { Footer } from "../components/Footer";
import { Button } from "@prosolutions/ui";
import { useTheme } from "@prosolutions/ui";
import { LanguageSelector } from "../components/ui/LanguageSelector";

export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [successMessage, setSuccessMessage] = useState("");

  const handleThemeToggle = () => {
    toggle();
    setSuccessMessage(t('settings.themeUpdated', 'Theme preference updated'));
    setTimeout(() => setSuccessMessage(""), 3000);
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
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('navigation.settings')}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-300 -mt-1">{t('settings.preferences')}</p>
            </div>
          </div>
        }
      />

      <main className="max-w-2xl mx-auto p-6">
        <div className="space-y-6">
          {/* Success Message */}
          {successMessage && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
              <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
            </div>
          )}

          {/* Appearance Settings */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('settings.appearance', 'Appearance')}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">{t('settings.appearanceDesc', 'Customize how the application looks and feels')}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                    {theme === 'dark' ? (
                      <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{t('settings.theme', 'Theme')}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {theme === 'dark' ? t('settings.darkMode', 'Dark mode') : t('settings.lightMode', 'Light mode')}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleThemeToggle}
                  variant="outline"
                  size="sm"
                >
                  {theme === 'dark' ? t('settings.lightMode', 'Light') : t('settings.darkMode', 'Dark')}
                </Button>
              </div>
            </div>
          </div>

          {/* Language Settings */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048.093A18.058 18.058 0 0112 10.5c0 1.153.085 2.289.252 3.414L12 15.5l-.252-1.586A18.058 18.058 0 0110.952 10.5c0-1.153.085-2.289.252-3.414L12 3.5l.252 1.586A18.058 18.058 0 0113.048 3.593z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('settings.language', 'Language')}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">{t('settings.languageDesc', 'Choose your preferred language')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                <LanguageSelector />
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('settings.account', 'Account')}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">{t('settings.accountDesc', 'Manage your account settings and profile')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{t('settings.profile', 'Profile')}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{t('settings.profileDesc', 'Update your personal information')}</p>
                </div>
                <Button
                  onClick={() => navigate("/profile")}
                  variant="outline"
                  size="sm"
                >
                  {t('common.edit', 'Edit')}
                </Button>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('settings.about', 'About')}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">{t('settings.aboutDesc', 'Information about the application')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{t('settings.version', 'Version')}</p>
                  <p className="text-slate-600 dark:text-slate-300">1.0.0</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{t('settings.lastUpdated', 'Last Updated')}</p>
                  <p className="text-slate-600 dark:text-slate-300">{new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
