import React from "react";
export type ActiveApp = "core" | "procv" | "projobs";
interface ProHeaderProps {
    /** App actual: resalta su enlace con un badge "Activo". */
    activeApp: ActiveApp;
    /** Acciones extra a la derecha del header (p. ej. "Abrir editor"). */
    actions?: React.ReactNode;
    className?: string;
}
/**
 * Header unificado del ecosistema ProSolutions.
 * Uso: <ProHeader activeApp="core" /> en apps/core, "procv" en apps/procv, etc.
 */
export declare function ProHeader({ activeApp, actions, className }: ProHeaderProps): React.JSX.Element;
export {};
