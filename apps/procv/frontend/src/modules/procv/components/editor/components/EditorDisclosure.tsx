import React, { ReactNode, useEffect, useState } from "react";

interface EditorDisclosureProps {
  storageKey: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function EditorDisclosure({
  storageKey,
  title,
  description,
  defaultOpen = false,
  children,
}: EditorDisclosureProps) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return defaultOpen;
    const stored = window.localStorage.getItem(storageKey);
    return stored === null ? defaultOpen : stored === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, String(open));
  }, [open, storageKey]);

  const contentId = `${storageKey.replace(/[^a-zA-Z0-9_-]/g, "-")}-content`;

  return (
    <section className="editor-disclosure rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2>
        <button
          type="button"
          className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-700"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
            {description ? <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{description}</span> : null}
          </span>
          <svg
            className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h2>
      <div id={contentId} hidden={!open} className="border-t border-slate-200 p-4 dark:border-slate-700">
        {children}
      </div>
    </section>
  );
}
