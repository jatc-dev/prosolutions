import { getLandingFeatureVisual } from "../utils/landingFeatureVisuals";
import { LandingFeature } from "../hooks/useLandingFeatures";
import { useTranslation } from "react-i18next";

interface LandingFeaturesGridProps {
  features: (LandingFeature | { id: string; title: string; description: string; icon?: string })[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function LandingFeaturesGrid({ features, loading, error, onRetry }: LandingFeaturesGridProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div aria-busy={loading} className="space-y-4">
      {error ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={onRetry}
            disabled={loading}
            className="rounded-md bg-amber-100 px-2.5 py-1 font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900/70"
          >
            {t("landing.retryLoad")}
          </button>
        </div>
      ) : null}

      {features.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {t("landing.noCustomFeatures")}
        </div>
      ) : (
        features.map((feature, index) => {
          const visual = getLandingFeatureVisual(feature, index);
          const IconDisplay = visual.icon;

          return (
            <div
              key={feature.id}
              className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 ${visual.borderHoverClass}`}
            >
              <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-brand-400/20 blur-3xl transition group-hover:scale-110" />
              <div className="relative flex items-start gap-4">
                <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${visual.iconContainerClass}`}>
                  <IconDisplay className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{feature.description}</p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
