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
    default: "border border-ui-border bg-ui-surface shadow-card",
    elevated:
      "border border-ui-border bg-ui-raised shadow-panel",
    outlined: "border border-ui-border-strong bg-transparent",
  };

  return (
    <div
      {...props}
      className={cn("rounded-xl", paddingStyles[padding], variantStyles[variant], className)}
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
    <h3 {...props} className={cn("text-lg font-semibold text-ui-text", className)}>
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
    <p {...props} className={cn("text-sm text-ui-muted", className)}>
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
    <div {...props} className={cn("mt-6 pt-6 flex items-center gap-2 border-t border-ui-border", className)}>
      {children}
    </div>
  );
}

CardFooter.displayName = "CardFooter";
