import React from "react";
interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
}
/**
 * Contenedor centrado del ecosistema ProSolutions.
 * Soporta varios anchos máximos.
 */
export declare function Container({ children, className, size, ...props }: ContainerProps): React.JSX.Element;
export declare namespace Container {
    var displayName: string;
}
export {};
