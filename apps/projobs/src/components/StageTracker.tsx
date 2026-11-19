import { cn } from "@prosolutions/ui";
import { Check } from "lucide-react";
import type { ApplicationStage } from "../../server/src/contracts";
import { STAGE_LABEL } from "../lib/format";

const PROGRESS: ApplicationStage[] = ["applied", "screening", "interview", "offer", "hired"];

export function stageTone(stage: ApplicationStage): string {
  switch (stage) {
    case "hired":
      return "bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300";
    case "offer":
    case "interview":
      return "bg-brand-100 text-brand-950 dark:bg-brand-700/15 dark:text-brand-200";
    case "rejected":
    case "withdrawn":
      return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";
  }
}

export function StageBadge({ stage }: { stage: ApplicationStage }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", stageTone(stage))}>{STAGE_LABEL[stage]}</span>;
}

/** Horizontal progress through the hiring pipeline (candidate view). */
export function StageTracker({ stage }: { stage: ApplicationStage }) {
  const terminalOff = stage === "rejected" || stage === "withdrawn";
  const current = PROGRESS.indexOf(stage);
  return (
    <ol className="flex items-center gap-1" aria-label={`Etapa actual: ${STAGE_LABEL[stage]}`}>
      {PROGRESS.map((step, index) => {
        const done = !terminalOff && index <= current;
        return (
          <li key={step} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold",
                done ? "border-brand-800 bg-brand-800 text-white" : "border-ui-border bg-ui-surface text-ui-muted",
              )}
              aria-hidden="true"
            >
              {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className={cn("text-center text-[11px] leading-tight", done ? "font-semibold text-ui-text" : "text-ui-muted")}>{STAGE_LABEL[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}
