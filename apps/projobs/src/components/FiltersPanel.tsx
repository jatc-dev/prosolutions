import { Plus, RotateCcw } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  EMPLOYMENT_TYPES,
  SENIORITIES,
  WORKPLACES,
  type JobSearchResponse,
} from "../../server/src/contracts";
import { EMPLOYMENT_LABEL, SENIORITY_LABEL, WORKPLACE_LABEL } from "../lib/format";
import { activeFilterCount, type JobFilters } from "../lib/search-params";
import { FilterPill } from "./primitives";

interface FiltersPanelProps {
  filters: JobFilters;
  facets: JobSearchResponse["facets"] | null;
  onChange: (patch: Partial<JobFilters>) => void;
  onReset: () => void;
}

const POSTED_OPTIONS: Array<[number | null, string]> = [
  [null, "Cualquier fecha"],
  [1, "Últimas 24 horas"],
  [3, "Últimos 3 días"],
  [7, "Última semana"],
  [30, "Último mes"],
];

function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function countOf(facets: FiltersPanelProps["facets"], key: "workplace" | "employmentType" | "seniority", value: string) {
  return facets?.[key].find((facet) => facet.value === value)?.count;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wide text-ui-muted">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export function FiltersPanel({ filters, facets, onChange, onReset }: FiltersPanelProps) {
  const [skillDraft, setSkillDraft] = useState("");
  const addSkill = (event: FormEvent) => {
    event.preventDefault();
    const skill = skillDraft.trim().toLowerCase();
    if (skill && !filters.skills.includes(skill)) onChange({ skills: [...filters.skills, skill] });
    setSkillDraft("");
  };
  const suggested = (facets?.skills ?? []).filter((facet) => !filters.skills.includes(facet.value)).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Filtros</h2>
        {activeFilterCount(filters) > 0 && (
          <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Limpiar
          </button>
        )}
      </div>

      <Group title="Modalidad">
        {WORKPLACES.map((value) => (
          <FilterPill key={value} active={filters.workplace.includes(value)} count={countOf(facets, "workplace", value)} onClick={() => onChange({ workplace: toggle(filters.workplace, value) })}>
            {WORKPLACE_LABEL[value]}
          </FilterPill>
        ))}
      </Group>

      <Group title="Experiencia">
        {SENIORITIES.map((value) => (
          <FilterPill key={value} active={filters.seniority.includes(value)} count={countOf(facets, "seniority", value)} onClick={() => onChange({ seniority: toggle(filters.seniority, value) })}>
            {SENIORITY_LABEL[value]}
          </FilterPill>
        ))}
      </Group>

      <Group title="Tipo de contrato">
        {EMPLOYMENT_TYPES.map((value) => (
          <FilterPill key={value} active={filters.type.includes(value)} count={countOf(facets, "employmentType", value)} onClick={() => onChange({ type: toggle(filters.type, value) })}>
            {EMPLOYMENT_LABEL[value]}
          </FilterPill>
        ))}
      </Group>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-ui-muted">Habilidades</legend>
        {filters.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.skills.map((skill) => (
              <FilterPill key={skill} active onClick={() => onChange({ skills: filters.skills.filter((item) => item !== skill) })}>
                {skill} <span aria-hidden="true">×</span>
                <span className="sr-only">(quitar)</span>
              </FilterPill>
            ))}
          </div>
        )}
        <form onSubmit={addSkill} className="flex gap-2">
          <label htmlFor="skill-filter" className="sr-only">Agregar habilidad</label>
          <input
            id="skill-filter"
            value={skillDraft}
            onChange={(event) => setSkillDraft(event.target.value)}
            placeholder="Ej. react, sql…"
            maxLength={40}
            className="h-9 min-w-0 flex-1 rounded-lg border border-ui-border bg-ui-surface px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <button type="submit" aria-label="Agregar habilidad" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ui-border hover:bg-ui-soft">
            <Plus className="h-4 w-4" />
          </button>
        </form>
        {suggested.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggested.map((facet) => (
              <button
                key={facet.value}
                type="button"
                onClick={() => onChange({ skills: [...filters.skills, facet.value] })}
                className="rounded-lg bg-ui-soft px-2 py-1 text-xs text-ui-text hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-500/15"
              >
                {facet.value} <span className="text-ui-muted">{facet.count}</span>
              </button>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-ui-muted">Salario mínimo</legend>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={100}
          aria-label="Salario mínimo"
          value={filters.salaryMin ?? ""}
          onChange={(event) => onChange({ salaryMin: event.target.value ? Math.max(0, Number(event.target.value)) : null })}
          placeholder="En la moneda de la vacante"
          className="h-9 w-full rounded-lg border border-ui-border bg-ui-surface px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <p className="text-xs text-ui-muted">Solo muestra vacantes que publican salario.</p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-ui-muted">Fecha de publicación</legend>
        <select
          aria-label="Fecha de publicación"
          value={filters.postedWithin ?? ""}
          onChange={(event) => onChange({ postedWithin: event.target.value ? Number(event.target.value) : null })}
          className="h-9 w-full rounded-lg border border-ui-border bg-ui-surface px-3 text-sm"
        >
          {POSTED_OPTIONS.map(([value, label]) => (
            <option key={label} value={value ?? ""}>{label}</option>
          ))}
        </select>
      </fieldset>
    </div>
  );
}
