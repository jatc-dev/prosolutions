import React from "react";
import { cn } from "../utils.js";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

/**
 * Etiqueta (badge) del ecosistema ProSolutions.
 * Soporta variantes semánticas y tamaños pequeño/mediano.
 */
export function Badge({
  variant = "default",
  size = "md",
  className,
  ...props
}: BadgeProps) {
  const variantStyles: Record<string, string> = {
    default: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200",
    secondary: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    destructive: "bg-red-600 text-white dark:bg-red-500 dark:text-white",
    outline: "border border-slate-300 bg-transparent text-slate-600 dark:border-slate-600 dark:text-slate-400",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
  };

  const sizeStyles: Record<string, string> = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-0.5 text-xs",
  };

  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center rounded-full font-medium leading-none uppercase tracking-tighter",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    />
  );
}

Badge.displayName = "Badge";
