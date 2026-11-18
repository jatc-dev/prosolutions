import { cn } from "@prosolutions/ui";
import { Loader2, X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import type { CompanySummary, MatchResult } from "../../server/src/contracts";
import { initials } from "../lib/format";

export function Spinner({ className, label = "Cargando" }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-sm text-ui-muted", className)}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}…</span>
    </span>
  );
}

export function CompanyLogo({ company, size = "md" }: { company: Pick<CompanySummary, "name" | "logoUrl">; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-9 w-9 text-xs", md: "h-12 w-12 text-sm", lg: "h-16 w-16 text-lg" };
  if (company.logoUrl) {
    return (
      <img
        src={company.logoUrl}
        alt=""
        loading="lazy"
        className={cn("shrink-0 rounded-xl border border-ui-border bg-white object-contain p-1", sizes[size])}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-100 font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
        sizes[size],
      )}
    >
      {initials(company.name)}
    </span>
  );
}

export function matchTone(score: number) {
  if (score >= 75) return "bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300";
  if (score >= 45) return "bg-amber-100 text-amber-800 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300";
  return "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300";
}

export function MatchBadge({ match, className }: { match: MatchResult; className?: string }) {
  return (
    <span
      title={`Coinciden ${match.matchedSkills.length} de ${match.matchedSkills.length + match.missingSkills.length} habilidades requeridas`}
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", matchTone(match.score), className)}
    >
      {match.score}% afinidad
    </span>
  );
}

export function SkillChip({ skill, state }: { skill: string; state?: "matched" | "missing" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium",
        state === "matched" && "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",
        state === "missing" && "bg-ui-soft text-ui-muted line-through decoration-slate-400/60",
        !state && "bg-ui-soft text-ui-text",
      )}
    >
      {skill}
    </span>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ui-border bg-ui-surface px-6 py-14 text-center">
      {icon && <div className="mb-4 text-ui-muted">{icon}</div>}
      <h3 className="text-lg font-semibold text-ui-text">{title}</h3>
      {children && <div className="mt-2 max-w-md text-sm text-ui-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="ml-2 font-semibold underline underline-offset-2">
          Reintentar
        </button>
      )}
    </div>
  );
}

/** Toggleable pill used by filters (aria-pressed for screen readers). */
export function FilterPill({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        active
          ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-200"
          : "border-ui-border bg-ui-surface text-ui-text hover:bg-ui-soft",
      )}
    >
      {children}
      {count !== undefined && <span className="text-xs text-ui-muted">{count}</span>}
    </button>
  );
}

/** Accessible modal dialog built on <dialog> (focus trap, Esc to close, backdrop). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close?.();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "w-[calc(100%-2rem)] rounded-2xl border border-ui-border bg-ui-surface p-0 text-ui-text shadow-floating backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm",
        wide ? "max-w-3xl" : "max-w-lg",
      )}
    >
      {open && (
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-xl font-bold">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-ui-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-ui-muted hover:bg-ui-soft">
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-ui-text">{children}</h2>
      {action}
    </div>
  );
}
