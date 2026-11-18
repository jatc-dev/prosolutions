import React from "react";
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    isDisabled?: boolean;
    isFullWidth?: boolean;
}
/**
 * Botón primitivo del ecosistema ProSolutions.
 * Soporta variantes (primary, secondary, outline, ghost, danger), tamaños
 * (sm, md, lg) y estados de carga y deshabilitado.
 */
export declare function Button({ variant, size, type, disabled, isLoading, isDisabled, isFullWidth, children, className, ...props }: ButtonProps): React.JSX.Element;
export declare namespace Button {
    var displayName: string;
}
export {};
