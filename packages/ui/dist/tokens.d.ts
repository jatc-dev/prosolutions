/**
 * Design tokens of the ProSolutions ecosystem.
 *
 * The values live in tokens.json (single source of truth). theme.css and the
 * Tailwind preset (tailwind-preset.js) are generated from / read that file, so
 * components, CSS and Tailwind classes can never drift apart.
 */
import data from "./tokens.json";
export declare const tokens: {
    readonly palette: {
        brand: {
            "50": string;
            "100": string;
            "200": string;
            "300": string;
            "400": string;
            "500": string;
            "600": string;
            "700": string;
            "800": string;
            "900": string;
            "950": string;
        };
        neutral: {
            "0": string;
            "50": string;
            "100": string;
            "200": string;
            "300": string;
            "400": string;
            "500": string;
            "600": string;
            "700": string;
            "800": string;
            "900": string;
            "950": string;
        };
    };
    readonly semantic: {
        light: {
            bg: string;
            surface: string;
            "surface-soft": string;
            "surface-raised": string;
            "surface-floating": string;
            border: string;
            "border-strong": string;
            text: string;
            "text-muted": string;
            "text-subtle": string;
            accent: string;
            "accent-hover": string;
            "accent-soft": string;
            "on-accent": string;
            focus: string;
            success: string;
            warning: string;
            danger: string;
            info: string;
            "shadow-sm": string;
            "shadow-md": string;
            "shadow-floating": string;
        };
        dark: {
            bg: string;
            surface: string;
            "surface-soft": string;
            "surface-raised": string;
            "surface-floating": string;
            border: string;
            "border-strong": string;
            text: string;
            "text-muted": string;
            "text-subtle": string;
            accent: string;
            "accent-hover": string;
            "accent-soft": string;
            "on-accent": string;
            focus: string;
            success: string;
            warning: string;
            danger: string;
            info: string;
            "shadow-sm": string;
            "shadow-md": string;
            "shadow-floating": string;
        };
    };
    readonly themeColor: {
        light: string;
        dark: string;
    };
    readonly font: {
        sans: string;
        mono: string;
    };
    readonly radius: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    readonly motion: {
        fast: string;
        base: string;
        slow: string;
        easing: string;
    };
};
export type BrandStep = keyof typeof data.palette.brand;
export type NeutralStep = keyof typeof data.palette.neutral;
export type SemanticToken = keyof typeof data.semantic.light;
export type TokenRadius = keyof typeof data.radius;
