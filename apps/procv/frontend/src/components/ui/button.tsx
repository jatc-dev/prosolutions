import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  block?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
  children,
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed active:scale-[0.99]";
  
  const variantClasses = {
    primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400",
    secondary: "bg-slate-100 text-slate-800 shadow-sm hover:bg-slate-200 focus-visible:ring-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:focus-visible:ring-slate-600",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-600",
    danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:ring-rose-500 dark:bg-rose-500 dark:hover:bg-rose-400"
  };
  
  const sizeClasses = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base"
  };
  
  const blockClass = block ? "w-full" : "";
  
  return (
    <button
      type="button"
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${blockClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};