/**
 * Carga el script de Google AdSense una sola vez cuando VITE_ADSENSE_CLIENT
 * esta definido. Sin la variable, no se inyecta nada (modo placeholder).
 */
export declare function useAdSenseScript(client: string | undefined): void;
/** Empuja el render del bloque <ins> al loader de AdSense (idempotente por montaje). */
export declare function useAdSensePush(enabled: boolean): void;
