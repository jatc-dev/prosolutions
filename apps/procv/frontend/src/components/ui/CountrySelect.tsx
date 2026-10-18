import React, { useEffect, useId, useMemo, useRef, useState } from "react";

type CountryOption = { code: string; label: string; englishLabel: string; spanishLabel: string };

const NON_COUNTRY_REGIONS = new Set(["AC", "CP", "DG", "EA", "EU", "EZ", "IC", "QO", "UN", "XA", "XB"]);

function getCountryOptions(locale: string): CountryOption[] {
  const localized = new Intl.DisplayNames([locale], { type: "region" });
  const english = new Intl.DisplayNames(["en"], { type: "region" });
  const spanish = new Intl.DisplayNames(["es"], { type: "region" });
  const options: CountryOption[] = [];

  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      const code = String.fromCharCode(first, second);
      if (NON_COUNTRY_REGIONS.has(code)) continue;
      const label = localized.of(code);
      const englishLabel = english.of(code);
      const spanishLabel = spanish.of(code);
      if (!label || !englishLabel || !spanishLabel || label === code || englishLabel === code || spanishLabel === code) continue;
      options.push({ code, label, englishLabel, spanishLabel });
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, locale));
}

function normalize(value: string): string {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

export interface CountrySelectProps {
  value?: string;
  onChange: (countryCode: string) => void;
  locale?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
}

/**
 * Accessible searchable country combobox. Stores ISO alpha-2 codes while
 * accepting legacy country names when loading existing CVs.
 */
export const CountrySelect: React.FC<CountrySelectProps> = ({
  value = "",
  onChange,
  locale = "es",
  placeholder,
  className = "",
  id,
  name,
  disabled = false,
  required = false,
  "aria-label": ariaLabel,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listId = `${inputId}-options`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const options = useMemo(() => getCountryOptions(locale), [locale]);
  const selected = options.find((option) => option.code === value.toUpperCase())
    || options.find((option) => normalize(option.label) === normalize(value))
    || options.find((option) => normalize(option.englishLabel) === normalize(value))
    || options.find((option) => normalize(option.spanishLabel) === normalize(value));
  const visibleValue = open && query ? query : (selected?.label || value || "");

  const filtered = useMemo(() => {
    const term = normalize(query);
    if (!term) return options;
    return options.filter((option) =>
      normalize(option.label).includes(term)
      || normalize(option.englishLabel).includes(term)
      || normalize(option.spanishLabel).includes(term)
      || option.code.toLowerCase().includes(term)
    );
  }, [options, query]);

  useEffect(() => {
    const onDocumentPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDocumentPointerDown);
    return () => document.removeEventListener("mousedown", onDocumentPointerDown);
  }, []);

  const choose = (option: CountryOption) => {
    onChange(option.code);
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && filtered[activeIndex]) {
      event.preventDefault();
      choose(filtered[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        id={inputId}
        name={name}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && filtered[activeIndex] ? `${listId}-${filtered[activeIndex].code}` : undefined}
        value={visibleValue}
        placeholder={placeholder || (locale.startsWith("es") ? "Buscar país…" : "Search country…")}
        disabled={disabled}
        required={required}
        onFocus={(event) => { setQuery(""); event.currentTarget.select(); setOpen(true); setActiveIndex(0); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0); }}
        onKeyDown={handleKeyDown}
        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-9 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">⌄</span>
      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {filtered.length ? filtered.map((option, index) => (
            <li
              id={`${listId}-${option.code}`}
              key={option.code}
              role="option"
              aria-selected={option.code === selected?.code}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              className={`cursor-pointer px-3 py-2 ${index === activeIndex ? "bg-brand-50 text-brand-800 dark:bg-slate-800 dark:text-white" : "text-gray-800 dark:text-slate-200"}`}
            >
              <span>{option.label}</span>
              <span className="ml-2 text-xs text-gray-500 dark:text-slate-400">{option.code}</span>
            </li>
          )) : (
            <li role="option" aria-disabled="true" className="px-3 py-2 text-gray-500 dark:text-slate-400">
              {locale.startsWith("es") ? "No se encontraron países" : "No countries found"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default CountrySelect;
