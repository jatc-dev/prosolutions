import React, { useEffect, useState } from "react";
import { Wand2 } from "lucide-react";
import { useAuth } from "../../../../../stores/authStore";
import { useCVEditorStore } from "../../../../../stores/cvEditorStore";
import { AIGenerationError, type AISection, improveText, isAiAvailable } from "../../../../../services/cvAIGeneration";
import { ActionMenu } from "./ActionMenu";

/** What the user can ask for; each one is a fixed instruction for the assistant. */
export const AI_ACTIONS: Array<{ key: string; label: string; description: string; instruction: string }> = [
  {
    key: "improve",
    label: "Mejorar redacción",
    description: "Más claro y profesional, con los mismos datos.",
    instruction: "Mejora la redacción, la claridad y el tono profesional. Conserva todos los datos.",
  },
  {
    key: "shorter",
    label: "Hacerlo más breve",
    description: "Lo esencial en menos palabras.",
    instruction: "Hazlo más breve y directo, sin perder información importante.",
  },
  {
    key: "results",
    label: "Enfocar en logros",
    description: "Verbos de acción y resultados; te pide las cifras que falten.",
    instruction: "Reescríbelo enfocado en logros y resultados, con verbos de acción. No inventes cifras: pide las que falten.",
  },
  {
    key: "grammar",
    label: "Solo corregir ortografía",
    description: "Corrige errores sin cambiar el estilo.",
    instruction: "Corrige únicamente ortografía, gramática y puntuación. No cambies el estilo ni el contenido.",
  },
];

interface AiImproveFieldProps {
  section: AISection;
  /** Current text of the field. */
  text: string;
  onApply: (text: string) => void;
  /** Accessible name of what is improved, e.g. "el perfil profesional". */
  fieldLabel: string;
  /** Minimum length before asking (very short texts give poor results). */
  minLength?: number;
  /** Extra facts for the assistant (e.g. the job title of an experience). */
  context?: string;
}

/**
 * "Mejorar con IA" under a CV text field: the user picks what to do, sees the
 * proposal and decides whether to use it. Only for signed-in users when the
 * server has the assistant configured (usage is per account and rate limited).
 */
export function AiImproveField({ section, text, onApply, fieldLabel, minLength = 20, context }: AiImproveFieldProps) {
  const { isAuthenticated } = useAuth();
  const cvId = useCVEditorStore((state) => state.cvData.id);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ text: string; changes: string[]; needsUserInput: string[] } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    void isAiAvailable().then((value) => {
      if (active) setAvailable(value);
    });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated || !available) return null;

  const run = async (instruction: string) => {
    if (text.trim().length < minLength) {
      setError("Escribe un poco más antes de pedir una mejora: la IA trabaja con lo que ya escribiste.");
      return;
    }
    setLoading(true);
    setError(null);
    setProposal(null);
    try {
      // The server accepts up to 500 characters of instruction.
      const extra = context ? ` Contexto: ${context.slice(0, 300)}.` : "";
      const result = await improveText({ section, text, instruction: `${instruction}${extra}`, cvId });
      setProposal({ text: result.suggestion, changes: result.changes, needsUserInput: result.needsUserInput });
    } catch (caught) {
      setError(caught instanceof AIGenerationError ? caught.message : "No se pudo generar la sugerencia. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <ActionMenu
        label={loading ? "Mejorando…" : "Mejorar con IA"}
        ariaLabel={`Mejorar ${fieldLabel} con IA`}
        title="El asistente reescribe tu texto; tú decides si usas la propuesta."
        icon={<Wand2 className="h-3.5 w-3.5" aria-hidden="true" />}
        menuLabel={`Qué hacer con ${fieldLabel}`}
        disabled={loading}
        alwaysShowLabel
        align="left"
        buttonClassName="inline-flex items-center gap-1.5 rounded-md border border-brand-700 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60 dark:border-brand-400 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/40"
        items={AI_ACTIONS.map((action) => ({
          label: action.label,
          description: action.description,
          icon: <Wand2 className="h-4 w-4 text-brand-700" />,
          onSelect: () => void run(action.instruction),
        }))}
      />

      {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}

      {proposal ? (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm dark:border-brand-900 dark:bg-brand-950/30" aria-live="polite">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Propuesta de la IA</p>
          <p className="mt-2 whitespace-pre-line text-slate-800 dark:text-slate-200">{proposal.text}</p>
          {proposal.changes.length ? (
            <div className="mt-3">
              <p className="font-medium text-slate-800 dark:text-slate-200">Qué cambió:</p>
              <ul className="mt-1 list-disc pl-5 text-slate-700 dark:text-slate-300">
                {proposal.changes.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
          {proposal.needsUserInput.length ? (
            <div className="mt-3">
              <p className="font-medium text-slate-800 dark:text-slate-200">Para reforzarlo, añade:</p>
              <ul className="mt-1 list-disc pl-5 text-slate-700 dark:text-slate-300">
                {proposal.needsUserInput.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            La IA solo reorganiza lo que ya escribiste. Si ves <strong>[dato por confirmar]</strong>, reemplázalo por un dato real o bórralo.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onApply(proposal.text);
                setProposal(null);
              }}
              className="rounded-md bg-brand-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-900"
            >
              Usar esta versión
            </button>
            <button
              type="button"
              onClick={() => setProposal(null)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Descartar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
