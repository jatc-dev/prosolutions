import React from "react";
import { cn } from "../utils.js";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  endAdornment?: React.ReactNode;
}

/**
 * Campo de entrada de texto del ecosistema ProSolutions.
 * Incluye soporte opcional para etiqueta, mensaje de error y texto de ayuda.
 */
export function Input({ label, error, helperText, endAdornment, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          {...props}
          className={cn(
            "flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:ring-brand-400 dark:focus:border-brand-400",
            endAdornment ? "pr-11" : "",
            className,
            error ? "border-red-500 dark:border-red-400" : "",
          )}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">
            {endAdornment}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {helperText && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
}

Input.displayName = "Input";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

/**
 * Selector desplegable del ecosistema ProSolutions.
 */
export function Select({ label, error, className, id, ...props }: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        id={inputId}
        {...props}
        className={cn(
          "flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:ring-brand-400 dark:focus:border-brand-400",
          className,
          error ? "border-red-500 dark:border-red-400" : "",
        )}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

Select.displayName = "Select";
