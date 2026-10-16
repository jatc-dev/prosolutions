import React from "react";
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
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
