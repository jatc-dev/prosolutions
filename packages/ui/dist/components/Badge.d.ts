import React from "react";
export type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    size?: "sm" | "md";
}
/**
 * Etiqueta (badge) del ecosistema ProSolutions.
 * Soporta variantes semánticas y tamaños pequeño/mediano.
 */
export declare function Badge({ variant, size, className, ...props }: BadgeProps): React.JSX.Element;
export declare namespace Badge {
    var displayName: string;
}
export {};
