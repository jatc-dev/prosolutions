import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../utils.js";
/**
 * Contenedor centrado del ecosistema ProSolutions.
 * Soporta varios anchos máximos.
 */
export function Container({ children, className, size = "lg", ...props }) {
    const maxWidths = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-7xl",
    };
    return (_jsx("div", { ...props, className: cn("mx-auto w-full", maxWidths[size], className), children: children }));
}
Container.displayName = "Container";
