import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "../components/BrandLogo";
import { LanguageSelector } from "../components/ui/LanguageSelector";
import { useAuth } from "../stores/authStore";
import { useCVEditorStore } from "../stores/cvEditorStore";
import { useFormValidation, validateLogin, validateRegister } from "../hooks/useFormValidation";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter";
import { useLandingFeatures } from "../hooks/useLandingFeatures";
import { LandingFeaturesGrid } from "../components/LandingFeaturesGrid";
import { useTheme } from "../stores/themeStore";
import { trackLandingFunnelEvent } from "../utils/funnelAnalytics";
import { VERIFICATION_RESEND_COOLDOWN_SECONDS } from "../services/api";

export function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, login, register } = useAuth();
  const { setIsGuest } = useCVEditorStore();
  const theme = useTheme((state) => state.theme);
  const toggleTheme = useTheme((state) => state.toggleTheme);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
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

  const switchAuthMode = (mode: "login" | "register") => {
    setIsLoginMode(mode === "login");
    setSubmitError(null);
    if (mode === "register") {
      trackLandingFunnelEvent("auth_mode_switch", { mode: "register" });
    }
  };

  // Login form validation
  const loginForm = useFormValidation(
    { email: "", password: "" },
    validateLogin
  );

  // Register form validation
  const registerForm = useFormValidation(
    { email: "", password: "", name: "" },
    validateRegister
  );

  const currentForm = isLoginMode ? loginForm : registerForm;
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateForm,
    isSubmitting: formIsSubmitting
  } = currentForm;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (validateForm()) {
      const mode = isLoginMode ? "login" : "register";
      trackLandingFunnelEvent("auth_submit_attempt", { mode });
      try {
        if (isLoginMode) {
          const result = await login(values.email, values.password);
          if (result?.requiresVerification) {
            navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
            return;
          }
          trackLandingFunnelEvent("auth_submit_success", { mode: "login" });
          navigate("/dashboard");
        } else {
          await register(values.email, values.password, values.name);
          trackLandingFunnelEvent("auth_submit_success", { mode: "register" });
          // Registration just sent a verification email: seed the resend
          // cooldown so the verification screen shows the countdown on arrival.
          try {
            localStorage.setItem(
              "procv_verification_resend_until",
              String(Date.now() + VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000)
            );
          } catch {
            // Storage unavailable: the server still enforces the cooldown.
          }
          navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
        }
      } catch (err: any) {
        if (err?.response?.status === 429) {
          // Show the real remaining wait instead of a fixed message.
          const retryAfter = Number(err?.response?.data?.retryAfterSeconds);
          const minutes =
            Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter / 60) : 15;
          setSubmitError(t('auth.rateLimited', { minutes }));
        } else {
          const apiError = err?.response?.data?.message ||
            (isLoginMode ? t('auth.loginError') : t('auth.registerError'));
          setSubmitError(apiError);
        }
      }
    }
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    if (isLoginMode) {
      trackLandingFunnelEvent("auth_mode_switch", { mode: "register" });
    }
    setSubmitError(null);
    // Reset forms when switching
    loginForm.resetForm();
    registerForm.resetForm();
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
      <header className="relative z-10 px-6 py-2">
        <div className="ui-container flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
            aria-label={theme === "dark" ? t("theme.light", "Light Mode") : t("theme.dark", "Dark Mode")}
            title={theme === "dark" ? t("theme.light", "Light Mode") : t("theme.dark", "Dark Mode")}
          >
            {theme === "dark" ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            <span className="hidden text-sm font-medium sm:inline">
              {theme === "dark" ? t("theme.light", "Light") : t("theme.dark", "Dark")}
            </span>
          </button>
          <LanguageSelector />
        </div>
      </header>

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

            {/* Two Column Layout: Features Left, Form Right */}
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

              {/* Auth Form - Right Side */}
              <div id="auth-form" className="lg:sticky lg:top-8">
                <div className="rounded-3xl border border-white/20 bg-white/90 p-8 shadow-2xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-black/30">
                  {/* Mode Toggle */}
                  <div className="mb-6 flex rounded-full bg-slate-100 p-1 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => switchAuthMode("login")}
                      aria-pressed={isLoginMode}
                      aria-controls="auth-mode-panel"
                      className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-all duration-200 ${
                        isLoginMode
                          ? 'bg-white text-brand-600 shadow-md dark:bg-slate-700 dark:text-brand-300'
                          : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100'
                      }`}
                    >
                      {t('auth.login')}
                    </button>
                    <button
                      type="button"
                      onClick={() => switchAuthMode("register")}
                      aria-pressed={!isLoginMode}
                      aria-controls="auth-mode-panel"
                      className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-all duration-200 ${
                        !isLoginMode
                          ? 'bg-white text-brand-600 shadow-md dark:bg-slate-700 dark:text-brand-300'
                          : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100'
                      }`}
                    >
                      {t('auth.register')}
                    </button>
                  </div>

                  {/* Form Title */}
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {isLoginMode ? t('auth.welcomeBack') : t('auth.createAccount')}
                    </h2>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      {isLoginMode ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
                    </p>
                  </div>

                  {submitError && (
                    <div className="ui-error-state mb-4" role="alert" aria-live="assertive">
                      <p>{submitError}</p>
                    </div>
                  )}

                  {/* Form */}
                  <form id="auth-mode-panel" onSubmit={handleSubmit} className="space-y-4">
                    {!isLoginMode && (
                      <Input
                        label={t('auth.name')}
                        type="text"
                        value={values.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        onBlur={(e) => handleBlur("name")}
                        error={touched.name && errors.name}
                        placeholder={t('auth.namePlaceholder')}
                        required
                      />
                    )}

                    <Input
                      label={t('auth.email')}
                      type="email"
                      value={values.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      onBlur={(e) => handleBlur("email")}
                      error={touched.email && errors.email}
                      placeholder={t('auth.emailPlaceholder')}
                      required
                    />

                    <Input
                      label={t('auth.password')}
                      type="password"
                      value={values.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      onBlur={(e) => handleBlur("password")}
                      error={touched.password && errors.password}
                      placeholder={t('auth.passwordPlaceholder')}
                      required
                    />

                    {!isLoginMode && (
                      <PasswordStrengthMeter password={values.password} />
                    )}

                    {isLoginMode && (
                      <div className="text-right">
                        <Link
                          to="/forgot-password"
                          className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300"
                        >
                          {t('auth.forgotPassword')}
                        </Link>
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      disabled={formIsSubmitting}
                      className="w-full mt-6"
                    >
                      {formIsSubmitting
                        ? (isLoginMode ? t('auth.signingIn') : t('auth.creatingAccount'))
                        : (isLoginMode ? t('auth.signIn') : t('auth.signUp'))
                      }
                    </Button>
                  </form>

{/* Mode Switch Link */}
                  <div className="text-center mt-6">
                    <button
                      type="button"
                      onClick={switchMode}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200"
                    >
                      {isLoginMode ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
                      <span className="underline">
                        {isLoginMode ? t('auth.signUp') : t('auth.signIn')}
                      </span>
                    </button>
                  </div>

                  <div className="mt-6">
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