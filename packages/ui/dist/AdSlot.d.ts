import React from "react";
export type AdFormat = "leaderboard" | "in-feed" | "rectangle" | "native" | "auto";
interface AdSlotProps {
    /** Identificador logico del emplazamiento (analitica/depuracion). */
    placement?: string;
    /** ID de bloque de AdSense (data-ad-slot). Sin el, AdSense usa anuncios automaticos. */
    slot?: string;
    format?: AdFormat;
    className?: string;
}
/**
 * Bloque de anuncio unificado del ecosistema.
 * Renderiza el <ins> real de Google AdSense con el cliente del ecosistema
 * (VITE_ADSENSE_CLIENT, por defecto ca-pub-3956322934366702).
 */
export declare function AdSlot({ placement, slot, format, className }: AdSlotProps): React.JSX.Element;
export {};
