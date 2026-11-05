import React from "react";

export interface ModuleCardProps {
  /** Module identifier (e.g. "procv", "projobs") */
  id: string;
  /** Display name of the module */
  name: string;
  /** Short tagline shown under the name */
  tagline: string;
  /** Longer description of what the module does */
  description: string;
  /** Path to navigate to when the card is clicked */
  path: string;
  /** Current status badge */
  status: "active" | "beta" | "planned";
  /** Whether this is the primary module on the page */
  primary?: boolean;
  /** Optional click handler override */
  onClick?: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700" },
  beta: { bg: "bg-amber-50", text: "text-amber-700" },
  planned: { bg: "bg-slate-50", text: "text-slate-700" },
};

export function ModuleCard({
  id,
  name,
  tagline,
  description,
  path,
  status = "active",
  primary = false,
  onClick,
}: ModuleCardProps) {
  const statusStyle = STATUS_COLORS[status];

  const isProJobs = id === "projobs";
  const accent = isProJobs ? "var(--ui-projobs-accent)" : "var(--ui-procv-accent)";
  const accentHover = isProJobs ? "var(--ui-projobs-accent-hover)" : "var(--ui-procv-accent-hover)";
  const accentSoft = isProJobs ? "var(--ui-projobs-accent-soft)" : "var(--ui-procv-accent-soft)";
  const gradient = isProJobs ? "var(--ui-projobs-gradient)" : "var(--ui-procv-gradient)";

  const borderSuffix = isProJobs ? "emerald-400" : "brand-400";
  const borderClass = primary
    ? `border-${isProJobs ? "emerald-500" : "brand-500"}/50 shadow-md shadow-${isProJobs ? "emerald-500/20" : "brand-500/20"}/50`
    : `border-slate-200 dark:border-slate-700 hover:border-${borderSuffix}/50`;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.location.href = path;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const classes = `group relative rounded-xl border p-6 transition-all duration-200 ${borderClass}`;

  return (
    <article
      className={classes}
      style={{ borderColor: primary ? accent : undefined }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Top-left status badge */}
      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium uppercase tracking-tighter ${statusStyle.bg} ${statusStyle.text}`}>
        {status}
      </span>

      {/* Module icon / accent dot */}
      <div className="mt-4 flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: accentSoft, color: accent }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isProJobs ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2-11-6z"
              />
            )}
          </svg>
        </div>
        <span className={`text-sm font-semibold tracking-tight ${isProJobs ? "text-emerald-700 dark:text-emerald-400" : "text-brand-700 dark:text-brand-400"}`}>
          {name}
        </span>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
          {tagline}
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Bottom-right action link */}
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-200"
        style={{ color: accent }}
      >
        Explorar {name}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l7-7-7-7" />
        </svg>
      </a>

      {/* Subtle gradient accent on right edge for primary module */}
      {primary && (
        <div className="absolute top-0 right-0 bottom-0 w-1 rounded-r-xl" style={{ background: gradient }} />
      )}
    </article>
  );
}
