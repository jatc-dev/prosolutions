import React from "react";
export type ActiveApp = "core" | "procv" | "projobs";
interface HeaderProfile {
    name?: string | null;
    email: string;
    avatarUrl?: string | null;
}
interface ProHeaderProps {
    /** App actual: resalta su enlace con un badge "Activo". */
    activeApp: ActiveApp;
    /** Usuario autenticado; cuando existe, muestra el menú unificado de cuenta. */
    profile?: HeaderProfile | null;
    /** Acción de cierre de sesión del módulo autenticado. */
    onSignOut?: () => void | Promise<void>;
    /** Destino opcional para la página de perfil del módulo actual. */
    profileHref?: string;
    /** Destino opcional para configuración de cuenta. */
    settingsHref?: string;
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
export declare function ProHeader({ activeApp, actions, className, locale, onLocaleChange, profile, onSignOut, profileHref, settingsHref }: ProHeaderProps): React.JSX.Element;
export {};
