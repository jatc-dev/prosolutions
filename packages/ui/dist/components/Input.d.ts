import React from "react";
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
export declare function Input({ label, error, helperText, endAdornment, className, id, ...props }: InputProps): React.JSX.Element;
export declare namespace Input {
    var displayName: string;
}
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
}
/**
 * Selector desplegable del ecosistema ProSolutions.
 */
export declare function Select({ label, error, className, id, ...props }: SelectProps): React.JSX.Element;
export declare namespace Select {
    var displayName: string;
}
export {};
