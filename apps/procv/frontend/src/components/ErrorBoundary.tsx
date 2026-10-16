import { Component, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "./BrandLogo";
import { LanguageSelector } from "./ui/LanguageSelector";
import { useTheme } from '@prosolutions/ui';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

function ErrorFallback({ onReset, error }: { onReset: () => void; error?: Error }) {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="relative z-10 px-6 py-2">
        <div className="ui-container flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggle}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
            aria-label={theme === "dark" ? t("theme.light") : t("theme.dark")}
            title={theme === "dark" ? t("theme.light") : t("theme.dark")}
          >
            {theme === "dark" ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            <span className="hidden text-sm font-medium sm:inline">
              {theme === "dark" ? t("theme.light") : t("theme.dark")}
            </span>
          </button>
          <LanguageSelector />
        </div>
      </header>

      <main className="relative flex-1 flex items-center justify-center">
        <div className="ui-container max-w-md mx-auto px-6 text-center">
          <BrandLogo variant="hero" to="/" className="mx-auto mb-6" />

          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 mb-6">
            <svg className="h-8 w-8 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.86 6a9 9 0 1113.72-3.672L12 20a9 9 0 01-5.86-2.077z" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            {t("common.errorBoundary.title", "Something went wrong")}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-8">
            {t("common.errorBoundary.message", "An unexpected error occurred. Please try again.")}
          </p>

          {error && import.meta.env.DEV && (
            <pre className="mb-4 max-w-xs overflow-x-auto bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded p-3 text-left">
              <code className="text-xs text-rose-800 dark:text-rose-300 whitespace-pre-wrap break-all">
                {error.message}
              </code>
            </pre>
          )}

          <button
            onClick={onReset}
            className="w-full inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
          >
            {t("common.errorBoundary.retry", "Try Again")}
          </button>
        </div>
      </main>

      <footer className="bg-slate-900 px-6 py-6 text-white dark:bg-slate-950">
        <div className="ui-container max-w-md mx-auto text-center">
          <div className="text-sm text-slate-300 dark:text-slate-400">
            {t("footer.description")}
          </div>
          <div className="mt-2 text-xs text-slate-300 dark:text-slate-400">
            {t("footer.engineering")}
            <a
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

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorFallback onReset={this.handleReset} error={this.state.error} />;
    }
    return this.props.children;
  }
}
