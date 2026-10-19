import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "../components/BrandLogo";
import { useAuth } from "../stores/authStore";
import { useCVEditorStore } from "../stores/cvEditorStore";
import { ProHeader } from "@prosolutions/ui";
import { Button } from "@prosolutions/ui";
import { useLandingFeatures } from "../hooks/useLandingFeatures";
import { LandingFeaturesGrid } from "../components/LandingFeaturesGrid";
import { trackLandingFunnelEvent } from "../utils/funnelAnalytics";

const IDENTITY_URL =
  import.meta.env.VITE_IDENTITY_URL ||
  "https://proidentity.onrender.com/login";

export function AuthPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const { isAuthenticated } = useAuth();
  const { setIsGuest } = useCVEditorStore();
  const { features: apiFeatures, featuresLoading, featuresError, reloadFeatures } = useLandingFeatures();

  const fallbackFeatures = [
    { id: "intuitive-editor", title: t('landing.features.intuitiveEditor.title', 'Intuitive Editor'), description: t('landing.features.intuitiveEditor.description', 'Edit your CV in real-time with instant preview.'), icon: '✏️' },
    { id: "professional-templates", title: t('landing.features.professionalTemplates.title', 'Professional Templates'), description: t('landing.features.professionalTemplates.description', 'Choose from multiple modern and adaptable styles.'), icon: '📄' },
    { id: "export-formats", title: t('landing.features.exportFormats.title', 'Export as PDF, XML or JSON'), description: t('landing.features.exportFormats.description', 'Download your CV in formats you can use and share.'), icon: '📤' },
    { id: "smart-contacts", title: t('landing.features.smartContacts.title', 'Smart Contact Tags'), description: t('landing.features.smartContacts.description', 'Add multiple emails and phones with tags and reorder them by drag.'), icon: '📱' },
    { id: "auto-save", title: t('landing.features.autoSave.title', 'Auto Save'), description: t('landing.features.autoSave.description', 'Your changes are saved automatically, no need to worry.'), icon: '💾' },
  ];

  const features = apiFeatures.length > 0 ? apiFeatures : fallbackFeatures;

  useEffect(() => {
    trackLandingFunnelEvent("landing_view");
  }, []);

  const handleGuestEditorClick = () => {
    trackLandingFunnelEvent("guest_editor_click");
    setIsGuest(true);
    navigate("/editor");
  };

  const handleIdentityLogin = () => {
    const redirectUri = encodeURIComponent(window.location.origin + "/auth/callback");
    window.location.href = `${IDENTITY_URL}?redirect_uri=${redirectUri}`;
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="mb-8">
            <BrandLogo variant="large" className="mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              {t('auth.welcomeBack')}
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              {t('auth.redirecting')}
            </p>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {t('landing.goToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <ProHeader
        activeApp="procv"
        locale={language === "es" ? "es" : "en"}
        onLocaleChange={() => i18n.changeLanguage(language === "es" ? "en" : "es")}
      />

      {/* Main Content */}
      <main className="relative">
        {/* Main Content Section */}
        <section className="px-6 pt-4 pb-16 md:pt-6">
          <div className="ui-container">
            {/* Hero Title */}
            <div className="text-center mb-10">
              <BrandLogo variant="hero" to="/" className="mx-auto mb-8" />
              <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
                {t('landing.description')}
              </p>
            </div>

            {/* Two Column Layout: Features Left, Identity Login Right */}
            <div className="grid lg:grid-cols-[1fr,400px] gap-12 items-start">
              {/* Features - Left Side */}
              <div className="space-y-8">
                <div className="text-center lg:text-left mb-8">
                  <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                    {t('landing.featuresTitle')}
                  </h2>
                  <p className="text-xl text-slate-600 dark:text-slate-300">
                    {t('landing.featuresSubtitle')}
                  </p>
                </div>
                <LandingFeaturesGrid
                  features={features}
                  loading={featuresLoading}
                  error={featuresError}
                  onRetry={reloadFeatures}
                />
              </div>

              {/* Identity Login - Right Side */}
              <div id="identity-login" className="lg:sticky lg:top-8">
                <div className="rounded-3xl border border-white/20 bg-white/90 p-8 shadow-2xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-black/30">
                  {/* Identity Login Card */}
                  <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center mx-auto mb-4 dark:bg-brand-500">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                      {t('auth.identityTitle')}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300">
                      {t('auth.identitySubtitle')}
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={handleIdentityLogin}
                    size="lg"
                    className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {t('auth.signInWithProIdentity')}
                  </Button>

                  <div className="mt-8">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-2 text-slate-500 dark:bg-slate-900 dark:text-slate-400">o</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGuestEditorClick}
                      className="mt-4 w-full inline-flex items-center justify-center rounded-xl border-2 border-brand-600 bg-white px-4 py-3 text-sm font-bold text-brand-600 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:border-brand-500 dark:bg-slate-900 dark:text-brand-400 dark:hover:bg-brand-950/40 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {t('landing.guestEditorCta', 'Probar Editor Gratis')}
                    </button>
                    <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                      {t('landing.guestEditorHint', 'Sin cuenta requerida')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-brand-700 to-blue-800 px-6 py-10 text-white dark:from-slate-800 dark:to-slate-700 md:py-12">
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 text-center md:gap-4">
            <h2 className="text-2xl font-bold leading-tight md:text-3xl">
              {t('landing.ctaTitle')}
            </h2>
            <p className="max-w-2xl text-base opacity-90 md:text-lg">
              {t('landing.ctaSubtitle')}
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 px-6 py-6 text-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-sm text-slate-300 dark:text-slate-400">
            {t('footer.description')}
          </div>
          <div className="mt-2 text-xs text-slate-300 dark:text-slate-400">
            {t('footer.engineering')} <a
              className="text-brand-300 transition-colors hover:text-brand-200 dark:text-brand-200 dark:hover:text-brand-100"
              href="https://jatc.dev"
              target="_blank"
              rel="noreferrer"
            >
              jatc.dev
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
