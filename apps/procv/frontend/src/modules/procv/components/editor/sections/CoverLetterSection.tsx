import React, { useEffect, useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { useAuth } from "../../../../../stores/authStore";
import { AIGenerationError, generateCVContent, isAiAvailable } from "../../../../../services/cvAIGeneration";
import type { CVData, CoverLetterData } from "../../../../../types";
import { buildCoverLetterDraft, defaultGreeting, placeholdersIn, todayIso, wordCount } from "../../../coverLetter";

interface Props {
  cv: CVData;
  onChange: (letter: CoverLetterData) => void;
}

const inputClass =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-200";

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value?: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className={labelClass}>
      <span>{label}</span>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />
    </label>
  );
}

/** Cover letter form: recipient, position, date and body (with a draft built from the CV). */
export function CoverLetterSection({ cv, onChange }: Props) {
  const letter = cv.coverLetter || {};
  const update = (patch: Partial<CoverLetterData>) => onChange({ ...letter, ...patch });
  const words = wordCount(letter.body);
  const pending = placeholdersIn(letter.body).length;
  const { isAuthenticated } = useAuth();
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiProposal, setAiProposal] = useState<{ text: string; needsUserInput: string[] } | null>(null);

  // The AI button exists only when the server has the assistant configured and
  // the user is signed in (usage is per account and rate limited).
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    void isAiAvailable().then((available) => {
      if (active) setAiAvailable(available);
    });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const improveWithAi = async () => {
    if (!letter.body?.trim()) {
      setAiError("Escribe o genera un borrador antes de pedir una mejora.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiProposal(null);
    try {
      const target = [letter.position && `el cargo de ${letter.position}`, letter.company && `en ${letter.company}`].filter(Boolean).join(" ");
      const result = await generateCVContent({
        section: "coverLetter",
        prompt: `Mejora la redacción y la estructura de esta carta de presentación${target ? ` para ${target}` : ""}. Mantén los textos entre corchetes que aún no he completado.`,
        currentCV: cv,
      });
      setAiProposal({ text: result.suggestion, needsUserInput: result.needsUserInput });
    } catch (error) {
      setAiError(error instanceof AIGenerationError ? error.message : "No se pudo generar la sugerencia. Inténtalo de nuevo.");
    } finally {
      setAiLoading(false);
    }
  };

  const generate = () => {
    if (letter.body?.trim() && !window.confirm("Esto reemplazará el texto actual de la carta. ¿Continuar?")) return;
    update({ body: buildCoverLetterDraft(cv, letter), date: letter.date || todayIso() });
  };

  return (
    <section aria-labelledby="carta-titulo" className="space-y-6">
      <div>
        <h3 id="carta-titulo" className="text-lg font-semibold text-slate-900 dark:text-slate-100">Carta de presentación</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Usa tus datos, la plantilla, las fuentes y los colores de tu hoja de vida. Se guarda junto con ella y se descarga como un PDF aparte.
        </p>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">Destinatario</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nombre de la persona (opcional)" value={letter.recipientName} onChange={(v) => update({ recipientName: v })} placeholder="Ej.: Laura Martínez" />
          <Field label="Cargo (opcional)" value={letter.recipientTitle} onChange={(v) => update({ recipientTitle: v })} placeholder="Ej.: Líder de talento humano" />
          <Field label="Empresa" value={letter.company} onChange={(v) => update({ company: v })} placeholder="Ej.: Comercial Andina S.A.S." />
          <Field label="Dirección o ciudad de la empresa (opcional)" value={letter.companyAddress} onChange={(v) => update({ companyAddress: v })} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">Vacante y fecha</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <Field label="Cargo al que te postulas" value={letter.position} onChange={(v) => update({ position: v })} placeholder={cv.personal?.professionalTitle || "Ej.: Auxiliar administrativo"} />
          </div>
          <Field label="Ciudad" value={letter.city} onChange={(v) => update({ city: v })} placeholder={cv.personal?.city || "Ej.: Bogotá"} />
          <Field label="Fecha" type="date" value={letter.date || todayIso()} onChange={(v) => update({ date: v })} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">Contenido</legend>
        <Field label="Saludo" value={letter.greeting} onChange={(v) => update({ greeting: v })} placeholder={defaultGreeting(letter)} />
        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <label htmlFor="carta-cuerpo" className={labelClass}>Cuerpo de la carta</label>
            <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generate}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-900"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Generar borrador con mis datos
            </button>
            {isAuthenticated && aiAvailable ? (
              <button
                type="button"
                onClick={improveWithAi}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 rounded-md border border-brand-700 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-60 dark:border-brand-400 dark:text-brand-300 dark:hover:bg-brand-950/40"
              >
                <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                {aiLoading ? "Mejorando…" : "Mejorar con IA"}
              </button>
            ) : null}
            </div>
          </div>
          <textarea
            id="carta-cuerpo"
            value={letter.body || ""}
            onChange={(e) => update({ body: e.target.value })}
            rows={14}
            className={inputClass}
            placeholder="Separa los párrafos con una línea en blanco."
            aria-describedby="carta-ayuda"
          />
          {aiError ? <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{aiError}</p> : null}
          {aiProposal ? (
            <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm dark:border-brand-900 dark:bg-brand-950/30" aria-live="polite">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Propuesta de la IA</p>
              <p className="mt-2 whitespace-pre-line text-slate-800 dark:text-slate-200">{aiProposal.text}</p>
              {aiProposal.needsUserInput.length ? (
                <div className="mt-3">
                  <p className="font-medium text-slate-800 dark:text-slate-200">Para reforzarla, añade:</p>
                  <ul className="mt-1 list-disc pl-5 text-slate-700 dark:text-slate-300">
                    {aiProposal.needsUserInput.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : null}
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">La IA solo reorganiza lo que ya escribiste: revisa que todo sea cierto antes de enviarla.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => { update({ body: aiProposal.text }); setAiProposal(null); }} className="rounded-md bg-brand-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-900">
                  Usar esta versión
                </button>
                <button type="button" onClick={() => setAiProposal(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                  Descartar
                </button>
              </div>
            </div>
          ) : null}
          <p id="carta-ayuda" className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{words} palabras · lo ideal es entre 200 y 400.</span>
            {pending ? <span className="font-semibold text-amber-700 dark:text-amber-300">Tienes {pending} {pending === 1 ? "texto entre corchetes" : "textos entre corchetes"} por completar.</span> : null}
          </p>
        </div>
        <Field label="Despedida" value={letter.closing} onChange={(v) => update({ closing: v })} placeholder="Cordialmente," />
      </fieldset>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
        <p className="font-semibold">Consejos</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Escribe una carta por vacante: menciona la empresa y el cargo exactos.</li>
          <li>Incluye al menos un logro con cifras (porcentaje, tiempo, dinero o volumen).</li>
          <li>Explica por qué te interesa esa empresa; es lo que más diferencia tu carta.</li>
          <li>No repitas tu hoja de vida: complétala con lo que no cabe en ella.</li>
        </ul>
      </div>
    </section>
  );
}
