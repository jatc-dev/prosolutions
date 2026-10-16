import React from "react";
import { cn } from "../utils.js";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * Contenedor centrado del ecosistema ProSolutions.
 * Soporta varios anchos máximos.
 */
export function Container({ children, className, size = "lg", ...props }: ContainerProps) {
  const maxWidths: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-7xl",
  };

  return (
    <div {...props} className={cn("mx-auto w-full", maxWidths[size], className)}>
      {children}
    </div>
  );
}

Container.displayName = "Container";
