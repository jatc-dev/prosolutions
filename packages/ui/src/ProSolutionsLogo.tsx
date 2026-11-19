import { cn } from "./utils.js";

/** Marca ProSolutions: monograma técnico en esmeralda y grafito. */
export function ProSolutionsLogo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-900 text-sm font-black text-white shadow-sm"
      >
        PS
      </span>
      {showWordmark ? (
        <span className="leading-tight">
          <span className="block text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            Pro<span className="text-brand-900 dark:text-brand-300">Solutions</span>
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Ecosystem
          </span>
        </span>
      ) : null}
    </span>
  );
}
