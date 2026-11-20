import React, { useEffect, useState } from "react";
import { Lightbulb, Plus } from "lucide-react";
import { PHRASE_FAMILIES, familyForTitle, getFamily, type PhraseFamily } from "../../../phrases";

type Kind = "duties" | "achievements" | "summaries";

interface Props {
  /** Job title used to pick the family (the user can change it). */
  title?: string;
  kind: Kind;
  onPick: (phrase: string) => void;
  /** Phrases already present, shown as added. */
  isUsed?: (phrase: string) => boolean;
}

const HEADINGS: Record<Kind, string> = {
  duties: "Frases sugeridas para funciones",
  achievements: "Logros sugeridos (completa las cifras entre corchetes)",
  summaries: "Perfiles sugeridos",
};

/**
 * Collapsible list of suggested phrases for the job family of a title. Always a
 * light surface: the editor cards it sits in are light in both themes.
 */
export function PhraseSuggestions({ title, kind, onPick, isUsed }: Props) {
  const [open, setOpen] = useState(false);
  const detected = familyForTitle(title);
  const [familyId, setFamilyId] = useState(detected.id);
  // Follow the title until the user picks a family by hand.
  const [manual, setManual] = useState(false);
  useEffect(() => {
    if (!manual) setFamilyId(detected.id);
  }, [detected.id, manual]);

  const family: PhraseFamily = getFamily(familyId);
  const phrases = family[kind];

  return (
    <div className="mt-2 rounded-md border border-dashed border-slate-300 bg-white text-slate-700" style={{ colorScheme: "light" }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Lightbulb className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
        {HEADINGS[kind]}
        <span className="ml-auto font-normal text-slate-500">{open ? "Ocultar" : family.label}</span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-slate-200 px-3 py-3">
          <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            Sector:
            <select
              value={familyId}
              onChange={(event) => {
                setManual(true);
                setFamilyId(event.target.value);
              }}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
            >
              {PHRASE_FAMILIES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <ul className="space-y-1.5">
            {phrases.map((phrase) => {
              const used = isUsed?.(phrase) ?? false;
              return (
                <li key={phrase}>
                  <button
                    type="button"
                    disabled={used}
                    onClick={() => onPick(phrase)}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-default disabled:opacity-50"
                  >
                    <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700" aria-hidden="true" />
                    <span>
                      {phrase}
                      {used ? <span className="ml-1 text-slate-500">(agregada)</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-slate-500">Adáptalas a tu experiencia real: los reclutadores notan las frases genéricas.</p>
        </div>
      ) : null}
    </div>
  );
}
