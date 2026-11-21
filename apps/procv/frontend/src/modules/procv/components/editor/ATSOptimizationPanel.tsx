import React from "react";
import { useTranslation } from "react-i18next";

export interface ATSAnalysisResult {
  score: number;
  sections: {
    completeness: number;
    keywordMatch: number;
    impact: number;
    clarity: number;
  };
  keywordCoverage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    section: "general" | "personal" | "experience" | "education" | "skills" | "keywords";
  }>;
  highlights: string[];
}

export interface ATSTailoringResult {
  summary: string;
  experience: Array<{
    id?: string;
    index: number;
    original: string;
    tailored: string;
  }>;
  insertedKeywords: string[];
}

export interface ATSHistoryItem {
  id: string;
  cvId: string;
  jobDescription: string;
  analysis: ATSAnalysisResult;
  tailoring: ATSTailoringResult;
  createdAt: string;
  scoreDeltaVsPrevious: number;
  keywordCoverageDeltaVsPrevious: number;
}

export interface ATSHistoryComparison {
  latestId: string | null;
  previousId: string | null;
  scoreDelta: number;
  keywordCoverageDelta: number;
}

interface ATSOptimizationPanelProps {
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
  onAnalyze: () => void;
  onTailor?: () => void;
  onApplyMissingKeywords?: () => void;
  onApplyTailoring?: () => void;
  loading: boolean;
  tailoringLoading?: boolean;
  result: ATSAnalysisResult | null;
  tailoringResult?: ATSTailoringResult | null;
  history?: ATSHistoryItem[];
  comparison?: ATSHistoryComparison | null;
}

const priorityClasses: Record<"high" | "medium" | "low", string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-100",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100",
  low: "bg-brand-100 text-brand-900 dark:bg-brand-950/60 dark:text-brand-100",
};

export function ATSOptimizationPanel({
  jobDescription,
  onJobDescriptionChange,
  onAnalyze,
  onTailor,
  onApplyMissingKeywords,
  onApplyTailoring,
  loading,
  tailoringLoading,
  result,
  tailoringResult,
  history,
  comparison,
}: ATSOptimizationPanelProps) {
  const { t } = useTranslation();
  const historyItems = history || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('editor.ats.title', 'Compatibilidad con una vacante')}</h3>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">{t('editor.ats.analyzeAgainstVacancy', 'Compara tu hoja de vida con una oferta, como lo hacen los filtros automáticos (ATS)')}</p>
      </div>

      {/* Plain-language help: most people have never heard of an ATS. */}
      <details className="mb-4 rounded-lg border border-brand-200 bg-brand-50/60 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
        <summary className="cursor-pointer font-semibold text-brand-900 dark:text-brand-300">{t('editor.ats.helpTitle', '¿Qué es esto y cómo me ayuda?')}</summary>
        <p className="mt-2">{t('editor.ats.helpIntro', 'Muchas empresas usan un ATS (sistema de seguimiento de candidatos): un programa que lee las hojas de vida y las compara con la oferta antes de que las vea una persona. Si tu hoja de vida no usa las palabras de la vacante, puede quedar fuera aunque tengas el perfil.')}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>{t('editor.ats.helpStep1', 'Copia la descripción completa de la vacante (funciones y requisitos) y pégala abajo.')}</li>
          <li>{t('editor.ats.helpStep2', 'Pulsa «Analizar». Verás un puntaje de compatibilidad, las palabras clave que te faltan y recomendaciones.')}</li>
          <li>{t('editor.ats.helpStep3', 'Añade las palabras clave que de verdad describen tu experiencia, o usa «Adaptar automáticamente» y revisa la propuesta antes de aplicarla.')}</li>
        </ol>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('editor.ats.helpNote', 'Consejo: adapta tu hoja de vida a cada vacante importante y no agregues habilidades que no tienes.')}</p>
      </details>

      <div className="grid gap-3 lg:grid-cols-[1fr,auto]">
        <textarea
          value={jobDescription}
          onChange={(event) => onJobDescriptionChange(event.target.value)}
          placeholder={t('editor.ats.jobDescriptionPlaceholder', 'Pega aquí la descripción de la vacante (funciones, requisitos, habilidades)…')}
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <div className="flex flex-col gap-2 lg:justify-end">
          <button
            type="button"
            onClick={onAnalyze}
            disabled={loading}
            className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-50"
          >
            {loading ? t('editor.ats.analyzing', 'Analizando...') : t('editor.ats.analyzeButton', 'Analizar')}
          </button>
          {onTailor ? (
            <button
              type="button"
              onClick={onTailor}
              disabled={tailoringLoading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {tailoringLoading ? t('editor.ats.tailoring', 'Adaptando…') : t('editor.ats.tailorButton', 'Adaptar automáticamente')}
            </button>
          ) : null}
          {result && onApplyMissingKeywords && result.missingKeywords.length > 0 ? (
            <button
              type="button"
              onClick={onApplyMissingKeywords}
              className="rounded-lg border border-brand-400 px-4 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-50 dark:border-brand-900 dark:text-brand-300 dark:hover:bg-brand-950/40"
            >
              {t('editor.ats.applyKeywords', 'Añadir palabras clave faltantes')}
            </button>
          ) : null}
          {tailoringResult && onApplyTailoring ? (
            <button
              type="button"
              onClick={onApplyTailoring}
              className="rounded-lg border border-brand-400 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-950/40"
            >
              {t('editor.ats.applyTailoring', 'Aplicar adaptación')}
            </button>
          ) : null}
        </div>
      </div>

      {comparison ? (
        <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 md:grid-cols-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <p>
            {t('editor.ats.scoreComparison', 'Comparativa score')}: <strong>{comparison.scoreDelta >= 0 ? `+${comparison.scoreDelta}` : comparison.scoreDelta}</strong>
          </p>
          <p>
            {t('editor.ats.keywordComparison', 'Comparativa keywords')}: <strong>{comparison.keywordCoverageDelta >= 0 ? `+${comparison.keywordCoverageDelta}` : comparison.keywordCoverageDelta}%</strong>
          </p>
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-300">{t('editor.ats.score', 'Score ATS')}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{result.score}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-300">{t('editor.ats.completeness', 'Completitud')}</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{result.sections.completeness}/30</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-300">{t('editor.ats.keywords', 'Keywords')}</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{result.keywordCoverage}%</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-300">{t('editor.ats.impact', 'Impacto')}</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{result.sections.impact}/20</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{t('editor.ats.missingKeywords', 'Keywords faltantes')}</h4>
              {result.missingKeywords.length === 0 ? (
                <p className="text-sm text-green-700 dark:text-green-200">{t('editor.ats.noMissingKeywords', 'Excelente. No hay keywords criticas pendientes.')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {result.missingKeywords.slice(0, 16).map((keyword) => (
                    <span key={keyword} className="rounded-full border border-slate-300 px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:text-slate-200">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{t('editor.ats.recommendations', 'Recomendaciones')}</h4>
              <div className="space-y-2">
                {result.recommendations.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${priorityClasses[item.priority]}`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tailoringResult ? (
        <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-800 dark:bg-brand-950/40">
          <h4 className="mb-1 font-semibold text-brand-800 dark:text-brand-200">{t('editor.ats.tailoringReady', 'Tailoring listo')}</h4>
          <p className="text-brand-700 dark:text-brand-100">
            {t('editor.ats.insertedKeywords', 'Keywords insertadas')}: {tailoringResult.insertedKeywords.slice(0, 8).join(", ") || t('editor.ats.noChanges', 'sin cambios')}
          </p>
          <p className="mt-1 text-xs text-brand-700 dark:text-brand-100">
            {t('editor.ats.tailoringSummary', 'Resumen propuesto y {{count}} bloques de experiencia optimizados.', { count: tailoringResult.experience.length })}
          </p>
        </div>
      ) : null}

      {historyItems.length > 0 ? (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{t('editor.ats.history', 'Historial ATS')}</h4>
          <div className="space-y-2">
            {historyItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{t("workspace.latestScore", "Latest score")}: {item.analysis.score}</p>
                  <p className="text-slate-500 dark:text-slate-300">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-600 dark:text-slate-200">{t("workspace.keywordsShort", "KW")}: {item.analysis.keywordCoverage}%</p>
                  <p className={`${item.scoreDeltaVsPrevious >= 0 ? "text-brand-600" : "text-rose-600"}`}>
                    {item.scoreDeltaVsPrevious >= 0 ? "+" : ""}{item.scoreDeltaVsPrevious}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
