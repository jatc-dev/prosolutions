import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../utils.js";
/**
 * Tarjeta contenedora del ecosistema ProSolutions.
 * Soporta variantes (default, elevated, outlined) y niveles de padding.
 */
export function Card({ children, padding = "md", variant = "default", className, ...props }) {
    const paddingStyles = {
        none: "p-0",
        sm: "p-3",
        md: "p-6",
        lg: "p-8",
    };
    const variantStyles = {
        default: "border border-ui-border bg-ui-surface shadow-card",
        elevated: "border border-ui-border bg-ui-raised shadow-panel",
        outlined: "border border-ui-border-strong bg-transparent",
    };
    return (_jsx("div", { ...props, className: cn("rounded-xl", paddingStyles[padding], variantStyles[variant], className), children: children }));
}
Card.displayName = "Card";
/**
 * Encabezado de tarjeta del ecosistema ProSolutions.
 */
export function CardHeader({ children, className, ...props }) {
    return (_jsx("div", { ...props, className: cn("flex flex-col space-y-1.5 pb-6", className), children: children }));
}
CardHeader.displayName = "CardHeader";
/**
 * Título de tarjeta del ecosistema ProSolutions.
 */
export function CardTitle({ children, className, ...props }) {
    return (_jsx("h3", { ...props, className: cn("text-lg font-semibold text-ui-text", className), children: children }));
}
CardTitle.displayName = "CardTitle";
/**
 * Descripción de tarjeta del ecosistema ProSolutions.
 */
export function CardDescription({ children, className, ...props }) {
    return (_jsx("p", { ...props, className: cn("text-sm text-ui-muted", className), children: children }));
}
CardDescription.displayName = "CardDescription";
/**
 * Contenido de tarjeta del ecosistema ProSolutions.
 */
export function CardContent({ children, className, ...props }) {
    return (_jsx("div", { ...props, className: cn("pt-6", className), children: children }));
}
CardContent.displayName = "CardContent";
/**
 * Pie de tarjeta del ecosistema ProSolutions.
 */
export function CardFooter({ children, className, ...props }) {
    return (_jsx("div", { ...props, className: cn("mt-6 pt-6 flex items-center gap-2 border-t border-ui-border", className), children: children }));
}
CardFooter.displayName = "CardFooter";
