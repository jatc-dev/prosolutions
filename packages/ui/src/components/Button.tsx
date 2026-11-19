import React from "react";
import { cn } from "../utils.js";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  isFullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-800 text-white hover:bg-brand-900 dark:bg-brand-400 dark:text-slate-950 dark:hover:bg-brand-300 shadow-sm",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
  outline:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
  danger:
    "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 shadow-sm shadow-red-500/30 hover:shadow-red-500/40",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

/**
 * Botón primitivo del ecosistema ProSolutions.
 * Soporta variantes (primary, secondary, outline, ghost, danger), tamaños
 * (sm, md, lg) y estados de carga y deshabilitado.
 */
export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  isLoading = false,
  isDisabled = false,
  isFullWidth = false,
  children,
  className,
  ...props
}: ButtonProps) {
  const buttonDisabled = disabled || isDisabled || isLoading;

  return (
    <button
      {...props}
      type={type}
      disabled={buttonDisabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        isFullWidth ? "w-full" : "",
        className,
      )}
      aria-disabled={buttonDisabled || undefined}
    >
      {isLoading ? (
        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 5.824 3 7.938l7-7.938z"></path>
        </svg>
      ) : (
        children
      )}
    </button>
  );
}

Button.displayName = "Button";
