import React from "react";
export type ActiveApp = "core" | "procv" | "projobs";
interface ProHeaderProps {
    /** App actual: resalta su enlace con un badge "Activo". */
    activeApp: ActiveApp;
    /** Idioma de la interfaz compartida. */
    locale?: "es" | "en";
    /** Acción para cambiar el idioma, cuando la aplicación ofrece traducciones. */
    onLocaleChange?: () => void;
    /** Acciones extra a la derecha del header (p. ej. "Abrir editor"). */
    actions?: React.ReactNode;
    className?: string;
}
/**
 * Header unificado del ecosistema ProSolutions.
 * Uso: <ProHeader activeApp="core" /> en apps/core, "procv" en apps/procv, etc.
 */
export declare function ProHeader({ activeApp, actions, className, locale, onLocaleChange }: ProHeaderProps): React.JSX.Element;
export {};
