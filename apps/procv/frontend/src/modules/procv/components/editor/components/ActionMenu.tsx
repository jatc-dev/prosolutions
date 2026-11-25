import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface ActionMenuItem {
  label: string;
  description?: string;
  icon: React.ReactNode;
  onSelect: () => void;
  /** "danger" for destructive actions (red label). */
  tone?: "default" | "danger";
  disabled?: boolean;
}

interface ActionMenuProps {
  /** Visible text of the button (hidden on narrow screens). */
  label: string;
  /** Accessible name of the button. */
  ariaLabel: string;
  title?: string;
  icon: React.ReactNode;
  items: ActionMenuItem[];
  menuLabel: string;
  buttonClassName: string;
  disabled?: boolean;
  /** Show the label on narrow screens too. */
  alwaysShowLabel?: boolean;
}

/** Toolbar button that opens a small menu (keyboard: arrows, Escape). */
export function ActionMenu({ label, ariaLabel, title, icon, items, menuLabel, buttonClassName, disabled, alwaysShowLabel }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']:not(:disabled)")?.focus();
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onMenuKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const entries = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[role='menuitem']:not(:disabled)"));
    const index = entries.indexOf(document.activeElement as HTMLButtonElement);
    const next = (index + (event.key === "ArrowDown" ? 1 : -1) + entries.length) % entries.length;
    entries[next]?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={title}
        className={buttonClassName}
      >
        {icon}
        <span className={alwaysShowLabel ? "" : "hidden sm:inline"}>{label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label={menuLabel}
          onKeyDown={onMenuKey}
          className="absolute right-0 z-40 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-brand-50 focus:bg-brand-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
            >
              <span className="mt-0.5 shrink-0" aria-hidden="true">{item.icon}</span>
              <span>
                <span className={`block text-sm font-semibold ${item.tone === "danger" ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>{item.label}</span>
                {item.description ? <span className="block text-xs text-slate-500 dark:text-slate-400">{item.description}</span> : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
