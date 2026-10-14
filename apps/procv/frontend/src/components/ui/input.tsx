import React, { useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | boolean;
  helperText?: string;
  inputSize?: "sm" | "md" | "lg";
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  inputSize = "md",
  className = "",
  ...props
}) => {
  const inputId = useId();
  const hasError = Boolean(error);

  const sizeClasses = {
    sm: "h-10 px-3 text-sm",
    md: "h-11 px-4 text-sm",
    lg: "h-12 px-5 text-base"
  };
  
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
        className={`block w-full rounded-xl border bg-white text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 ${
          hasError ? "border-rose-500 focus-visible:ring-rose-500 dark:border-rose-500" : "border-slate-300 focus:border-brand-500 dark:focus:border-brand-400"
        } ${sizeClasses[inputSize]} ${className}`}
        {...props}
      />
      {hasError && (
        <p id={`${inputId}-error`} className="mt-1 text-sm font-medium text-rose-600">{error}</p>
      )}
      {helperText && !hasError && (
        <p id={`${inputId}-help`} className="mt-1 text-sm text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
};