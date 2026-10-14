import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { generateCVContent, AIGenerationResponse } from "../../../services/cvAIGeneration";
import { CVData } from "../../../types";

interface AIPanelProps {
  cvData: CVData;
  onApply: (section: string, content: string) => void;
}

export function AIPanel({ cvData, onApply }: AIPanelProps) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AIGenerationResponse | null>(null);

  const sections = [
    { key: "summary", label: t("ai.summary", "Resumen profesional") },
    { key: "experience", label: t("ai.experience", "Experiencia laboral") },
    { key: "skills", label: t("ai.skills", "Habilidades") },
  ];

  const handleGenerate = async (section: string) => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const response = await generateCVContent({
        prompt,
        section,
        currentCV: cvData,
      });
      setResult(response);
    } catch (error) {
      console.error("AI generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApply(result.section, result.suggestion);
      setResult(null);
      setPrompt("");
    }
  };

  return (
    <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4 dark:border-purple-800 dark:from-purple-950/30 dark:to-slate-900">
      <div className="flex items-center space-x-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
          <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 6.364m-.707 7.507a4 4 0 11-5.656-5.656 4 4 0 015.656 5.656m-5.656-5.656a4 4 0 10-5.656 5.656 4 4 0 005.656-5.656" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t("ai.title", "Asistente de IA para CV")}
        </h3>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t("ai.placeholder", "Ej: 'Mejora mi resumen profesional para un rol de senior developer'")}
        rows={2}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        {sections.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => handleGenerate(section.key)}
            disabled={isGenerating || !prompt.trim()}
            className="inline-flex items-center rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            ) : null}
            {section.label}
          </button>
        ))}
      </div>

      {result && (
        <div className="mt-3 rounded-md border border-purple-200 bg-white p-3 dark:border-purple-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
              {t("ai.result", "Resultado de IA")}
            </span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleApply}
                className="text-xs font-medium text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-100"
              >
                {t("ai.apply", "Aplicar")}
              </button>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                {t("ai.discard", "Descartar")}
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {result.suggestion}
          </p>
        </div>
      )}
    </div>
  );
}