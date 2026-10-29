import React from "react";
import { cn } from "../utils.js";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "elevated" | "outlined";
}

/**
 * Tarjeta contenedora del ecosistema ProSolutions.
 * Soporta variantes (default, elevated, outlined) y niveles de padding.
 */
export function Card({
  children,
  padding = "md",
  variant = "default",
  className,
  ...props
}: CardProps) {
  const paddingStyles: Record<string, string> = {
    none: "p-0",
    sm: "p-3",
    md: "p-6",
    lg: "p-8",
  };

  const variantStyles: Record<string, string> = {
    default: "border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/70",
    elevated:
      "border border-slate-200/70 bg-white/80 shadow-[0_2px_4px_rgba(28,35,62,0.02),0_12px_36px_rgba(28,35,62,0.035)] backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/70 dark:shadow-[0_16px_48px_rgba(0,0,0,0.16)]",
    outlined: "border-2 border-slate-300 bg-transparent dark:border-slate-600 dark:bg-transparent",
  };

  return (
    <div
      {...props}
      className={cn("rounded-2xl transition-[transform,box-shadow,border-color] duration-300 hover:border-slate-300/70 dark:hover:border-slate-600/70", paddingStyles[padding], variantStyles[variant], className)}
    >
      {children}
    </div>
  );
}

Card.displayName = "Card";

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Encabezado de tarjeta del ecosistema ProSolutions.
 */
export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div {...props} className={cn("flex flex-col space-y-1.5 pb-6", className)}>
      {children}
    </div>
  );
}

CardHeader.displayName = "CardHeader";

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

/**
 * Título de tarjeta del ecosistema ProSolutions.
 */
export function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <h3 {...props} className={cn("text-lg font-semibold text-slate-900 dark:text-white", className)}>
      {children}
    </h3>
  );
}

CardTitle.displayName = "CardTitle";

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

/**
 * Descripción de tarjeta del ecosistema ProSolutions.
 */
export function CardDescription({ children, className, ...props }: CardDescriptionProps) {
  return (
    <p {...props} className={cn("text-sm text-slate-600 dark:text-slate-400", className)}>
      {children}
    </p>
  );
}

CardDescription.displayName = "CardDescription";

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Contenido de tarjeta del ecosistema ProSolutions.
 */
export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div {...props} className={cn("pt-6", className)}>
      {children}
    </div>
  );
}

CardContent.displayName = "CardContent";

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Pie de tarjeta del ecosistema ProSolutions.
 */
export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <div {...props} className={cn("mt-6 pt-6 flex items-center gap-2 border-t border-slate-200 dark:border-slate-700", className)}>
      {children}
    </div>
  );
}

CardFooter.displayName = "CardFooter";
