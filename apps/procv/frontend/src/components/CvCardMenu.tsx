import React, { useEffect, useRef, useState } from "react";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

export type CvCardAction = "rename" | "duplicate" | "delete";

interface Props {
  label: string;
  disabled?: boolean;
  labels: Record<CvCardAction, string>;
  onAction: (action: CvCardAction) => void;
}

/**
 * "More actions" menu of a CV card (Google Docs / Canva pattern): rename and
 * duplicate first, destructive delete last and separated. Keyboard: arrows,
 * Home/End, Escape returns focus to the trigger.
 */
export function CvCardMenu({ label, disabled, labels, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    itemsRef.current[0]?.focus();
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const onMenuKey = (event: React.KeyboardEvent) => {
    const items = itemsRef.current.filter(Boolean) as HTMLButtonElement[];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const move = (next: number) => { event.preventDefault(); items[(next + items.length) % items.length]?.focus(); };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(items.length - 1);
    else if (event.key === "Escape") { event.preventDefault(); close(); }
    else if (event.key === "Tab") setOpen(false);
  };

  const choose = (action: CvCardAction) => {
    close(action !== "rename");
    onAction(action);
  };

  const item = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm focus:outline-none";
  const entries: Array<{ action: CvCardAction; icon: React.ReactNode; className: string }> = [
    { action: "rename", icon: <Pencil className="h-4 w-4" aria-hidden="true" />, className: "text-slate-700 hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800" },
    { action: "duplicate", icon: <Copy className="h-4 w-4" aria-hidden="true" />, className: "text-slate-700 hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800" },
    { action: "delete", icon: <Trash2 className="h-4 w-4" aria-hidden="true" />, className: "text-rose-700 hover:bg-rose-50 focus:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40 dark:focus:bg-rose-950/40" },
  ];

  return (
    <div ref={rootRef} className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" aria-label={label} onKeyDown={onMenuKey} className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {entries.map((entry, index) => (
            <React.Fragment key={entry.action}>
              {entry.action === "delete" ? <div role="separator" className="my-1 border-t border-slate-200 dark:border-slate-700" /> : null}
              <button
                ref={(element) => { itemsRef.current[index] = element; }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => choose(entry.action)}
                className={`${item} ${entry.className}`}
              >
                {entry.icon}
                {labels[entry.action]}
              </button>
            </React.Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}
