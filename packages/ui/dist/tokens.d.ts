/**
 * Tokens de diseño compartidos del ecosistema ProSolutions.
 *
 * Sirven como fuente única de verdad para colores semánticos, superficies,
 * texto, bordes, tipografía, espaciado, radios, sombras, foco y transiciones.
 * Los valores están pensados para usarse tanto en CSS (variables CSS) como
 * directamente en componentes TypeScript.
 */
export declare const tokens: {
    readonly color: {
        readonly primary: {
            readonly 50: "#e5edff";
            readonly 100: "#dce8ff";
            readonly 200: "#b9d0ff";
            readonly 300: "#93b5ff";
            readonly 400: "#73a0ff";
            readonly 500: "#3563e9";
            readonly 600: "#264fc7";
            readonly 700: "#203f9f";
            readonly 800: "#1d347d";
            readonly 900: "#172554";
        };
        readonly secondary: {
            readonly 50: "#e0f7ff";
            readonly 100: "#b8e9ff";
            readonly 200: "#83d8ff";
            readonly 300: "#4ec6ff";
            readonly 400: "#22b7ff";
            readonly 500: "#00a4e4";
            readonly 600: "#008cc0";
            readonly 700: "#0073a3";
            readonly 800: "#005b84";
            readonly 900: "#004367";
        };
        readonly surface: {
            readonly base: "#ffffff";
            readonly elevated: "#eef2fa";
            readonly raised: "#e5edff";
            readonly inset: "#dce4f0";
            readonly dark: "#111827";
            readonly darkElevated: "#1b2638";
            readonly darkRaised: "#25334a";
            readonly darkInset: "#111827";
        };
        readonly text: {
            readonly primary: "#20304a";
            readonly secondary: "#52617a";
            readonly muted: "#52617a";
            readonly inverted: "#ffffff";
            readonly onPrimary: "#ffffff";
            readonly onSecondary: "#ffffff";
        };
        readonly border: {
            readonly light: "#dce4f0";
            readonly medium: "#aab8ca";
            readonly dark: "#71839b";
            readonly darkSurface: "#34445c";
            readonly focus: "#3563e9";
        };
        readonly state: {
            readonly success: "#087f72";
            readonly warning: "#975900";
            readonly error: "#c7364f";
            readonly info: "#3563e9";
            readonly successBg: "#e6f7f3";
            readonly warningBg: "#fff4db";
            readonly errorBg: "#ffebef";
            readonly infoBg: "#e5edff";
        };
    };
    readonly font: {
        readonly family: {
            readonly sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
            readonly mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
        };
        readonly size: {
            readonly xs: "0.75rem";
            readonly sm: "0.875rem";
            readonly base: "1rem";
            readonly lg: "1.125rem";
            readonly xl: "1.25rem";
            readonly "2xl": "1.5rem";
            readonly "3xl": "1.875rem";
            readonly "4xl": "2.25rem";
        };
        readonly weight: {
            readonly normal: 400;
            readonly medium: 500;
            readonly semibold: 600;
            readonly bold: 700;
            readonly extrabold: 800;
        };
        readonly lineHeight: {
            readonly tight: 1.25;
            readonly normal: 1.5;
            readonly relaxed: 1.75;
        };
        readonly letterSpacing: {
            readonly tight: "-0.025em";
            readonly normal: "0em";
            readonly wide: "0.05em";
        };
    };
    readonly space: {
        readonly 0: "0";
        readonly xs: "0.25rem";
        readonly sm: "0.5rem";
        readonly md: "0.75rem";
        readonly base: "1rem";
        readonly lg: "1.25rem";
        readonly xl: "1.5rem";
        readonly "2xl": "2rem";
        readonly "3xl": "2.5rem";
        readonly "4xl": "3rem";
    };
    readonly border: {
        readonly radius: {
            readonly none: "0";
            readonly sm: "0.25rem";
            readonly md: "0.375rem";
            readonly lg: "0.5rem";
            readonly xl: "0.75rem";
            readonly "2xl": "1rem";
            readonly "3xl": "1.5rem";
            readonly full: "9999px";
        };
        readonly width: {
            readonly thin: "1px";
            readonly medium: "2px";
            readonly thick: "3px";
        };
    };
    readonly shadow: {
        readonly sm: "0 1px 2px 0 rgb(15 23 42 / 0.05)";
        readonly base: "0 1px 3px 0 rgb(15 23 42 / 0.1), 0 1px 2px -1px rgb(15 23 42 / 0.1)";
        readonly md: "0 4px 6px -1px rgb(15 23 42 / 0.1), 0 2px 4px -2px rgb(15 23 42 / 0.1)";
        readonly lg: "0 10px 15px -3px rgb(15 23 42 / 0.1), 0 4px 6px -4px rgb(15 23 42 / 0.1)";
        readonly xl: "0 20px 25px -5px rgb(15 23 42 / 0.1), 0 8px 10px -6px rgb(15 23 42 / 0.1)";
    };
    readonly transition: {
        readonly fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)";
        readonly base: "200ms cubic-bezier(0.4, 0, 0.2, 1)";
        readonly slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)";
    };
    readonly zIndex: {
        readonly hide: -1;
        readonly base: 0;
        readonly docked: 10;
        readonly dropdown: 100;
        readonly sticky: 200;
        readonly modal: 300;
        readonly popover: 400;
        readonly toast: 500;
    };
};
export type TokenColor = keyof typeof tokens.color;
export type TokenFontSize = keyof typeof tokens.font.size;
export type TokenFontWeight = keyof typeof tokens.font.weight;
export type TokenRadius = keyof typeof tokens.border.radius;
export type TokenSpace = keyof typeof tokens.space;
export type TokenShadow = keyof typeof tokens.shadow;
export type TokenTransition = keyof typeof tokens.transition;
