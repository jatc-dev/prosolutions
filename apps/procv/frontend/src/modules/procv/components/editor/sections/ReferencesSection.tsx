import React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { PersonalData, ReferenceItem } from "../../../../../shared/types";
import { FormField, FormSection, InputField } from "../FormSection";
import {
  normalizeReferenceType,
  REFERENCE_FIELDS,
  REFERENCE_TYPE_LABELS,
  REFERENCE_TYPES,
  REFERENCES_ON_REQUEST_TEXT,
  type ReferenceType,
} from "../../../references";

const generateId = () => Math.random().toString(36).slice(2, 11);

export const createReference = (type: ReferenceType = "laboral"): ReferenceItem => ({
  id: generateId(),
  type,
  isVisible: true,
  name: "",
  position: "",
  company: "",
  relationship: "",
  phone: "",
  email: "",
});

interface ReferencesSectionProps {
  personal: PersonalData;
  onChange: (updates: Partial<PersonalData>) => void;
  isLoading?: boolean;
}

const checkbox = "rounded border-brand-300 text-brand-800 focus:ring-brand-700";
const showLabel = "inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300";

/** "Referencias" tab: work, personal and family references, each with its own fields. */
export function ReferencesSection({ personal, onChange, isLoading }: ReferencesSectionProps) {
  const references = personal.references || [];
  const setReferences = (next: ReferenceItem[]) => onChange({ references: next });
  const update = (id: string, changes: Partial<ReferenceItem>) =>
    setReferences(references.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  const toggleField = (item: ReferenceItem, field: string, visible: boolean) => {
    const hidden = (item.hiddenFields || []).filter((name) => name !== field);
    update(item.id, { hiddenFields: visible ? hidden : [...hidden, field] });
  };
  const move = (index: number, step: -1 | 1) => {
    const target = index + step;
    if (target < 0 || target >= references.length) return;
    const next = [...references];
    [next[index], next[target]] = [next[target], next[index]];
    setReferences(next);
  };
  const remove = (item: ReferenceItem) => {
    const named = item.name?.trim() ? ` de ${item.name.trim()}` : "";
    if (!window.confirm(`¿Eliminar la referencia${named}?`)) return;
    setReferences(references.filter((entry) => entry.id !== item.id));
  };
  const add = (type: ReferenceType) => setReferences([...references, createReference(type)]);

  const fieldToggle = (item: ReferenceItem, field: string) => (
    <label className={showLabel}>
      <input type="checkbox" className={checkbox} checked={!(item.hiddenFields || []).includes(field)} onChange={(event) => toggleField(item, field, event.target.checked)} />
      Mostrar en el CV
    </label>
  );

  return (
    <FormSection
      title="Referencias"
      description="Personas que pueden dar fe de tu trabajo o de ti. Aparecen al final de la hoja de vida, agrupadas por tipo."
      isLoading={isLoading}
      grouped
    >
      <div className="space-y-3">
        <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            className={`mt-0.5 ${checkbox}`}
            checked={Boolean(personal.referencesAvailableOnRequest)}
            onChange={(event) => onChange({ referencesAvailableOnRequest: event.target.checked })}
          />
          <span>
            Mostrar «{REFERENCES_ON_REQUEST_TEXT}»
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Útil si prefieres no publicar los datos de tus referencias. Puedes usarlo solo o junto con las referencias de abajo.
            </span>
          </span>
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Pide permiso a cada persona antes de incluir sus datos y verifica que su teléfono esté al día. Suelen pedirse dos laborales y una o dos personales.
        </p>
      </div>

      {references.map((item, index) => {
        const type = normalizeReferenceType(item.type);
        const label = REFERENCE_TYPE_LABELS[type];
        const title = item.name?.trim() || `Referencia ${label.one.toLowerCase()}`;
        return (
          <div key={item.id} data-testid="reference-card" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                  {label.one}
                </span>
                <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
              </div>
              <div className="flex items-center gap-1">
                <label className={`${showLabel} mr-2`}>
                  <input type="checkbox" className={checkbox} checked={item.isVisible !== false} onChange={(event) => update(item.id, { isVisible: event.target.checked })} />
                  Mostrar referencia
                </label>
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Subir ${title}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700">
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === references.length - 1} aria-label={`Bajar ${title}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700">
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => remove(item)} aria-label={`Eliminar ${title}`} className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Tipo de referencia">
                <select
                  value={type}
                  onChange={(event) => update(item.id, { type: event.target.value as ReferenceType })}
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  {REFERENCE_TYPES.map((option) => (
                    <option key={option} value={option}>{REFERENCE_TYPE_LABELS[option].one}</option>
                  ))}
                </select>
              </FormField>
              <div>
                <FormField label="Nombre completo">
                  <InputField value={item.name || ""} onChange={(value) => update(item.id, { name: value })} placeholder="Ej.: María Gómez" />
                </FormField>
                {fieldToggle(item, "name")}
              </div>
              {REFERENCE_FIELDS[type].map((field) => (
                <div key={field.key}>
                  <FormField label={field.label}>
                    <InputField value={item[field.key] || ""} onChange={(value) => update(item.id, { [field.key]: value })} placeholder={field.placeholder} />
                  </FormField>
                  {fieldToggle(item, field.key)}
                </div>
              ))}
              <div>
                <FormField label="Teléfono">
                  <InputField type="tel" value={item.phone || ""} onChange={(value) => update(item.id, { phone: value })} placeholder="Ej.: 300 123 4567" />
                </FormField>
                {fieldToggle(item, "phone")}
              </div>
              <div>
                <FormField label="Correo electrónico (opcional)">
                  <InputField type="email" value={item.email || ""} onChange={(value) => update(item.id, { email: value })} />
                </FormField>
                {fieldToggle(item, "email")}
              </div>
            </div>
          </div>
        );
      })}

      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {references.length ? "Agregar otra referencia" : "Agrega tu primera referencia"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {REFERENCE_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => add(option)}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand-700 bg-white px-3 py-1.5 text-sm font-medium text-brand-900 hover:bg-brand-50 dark:border-brand-500 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/40"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {REFERENCE_TYPE_LABELS[option].add}
            </button>
          ))}
        </div>
      </div>
    </FormSection>
  );
}
