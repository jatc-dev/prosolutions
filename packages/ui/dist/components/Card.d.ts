import React from "react";
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    padding?: "none" | "sm" | "md" | "lg";
    variant?: "default" | "elevated" | "outlined";
}
/**
 * Tarjeta contenedora del ecosistema ProSolutions.
 * Soporta variantes (default, elevated, outlined) y niveles de padding.
 */
export declare function Card({ children, padding, variant, className, ...props }: CardProps): React.JSX.Element;
export declare namespace Card {
    var displayName: string;
}
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}
/**
 * Encabezado de tarjeta del ecosistema ProSolutions.
 */
export declare function CardHeader({ children, className, ...props }: CardHeaderProps): React.JSX.Element;
export declare namespace CardHeader {
    var displayName: string;
}
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
    children: React.ReactNode;
}
/**
 * Título de tarjeta del ecosistema ProSolutions.
 */
export declare function CardTitle({ children, className, ...props }: CardTitleProps): React.JSX.Element;
export declare namespace CardTitle {
    var displayName: string;
}
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
    children: React.ReactNode;
}
/**
 * Descripción de tarjeta del ecosistema ProSolutions.
 */
export declare function CardDescription({ children, className, ...props }: CardDescriptionProps): React.JSX.Element;
export declare namespace CardDescription {
    var displayName: string;
}
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}
/**
 * Contenido de tarjeta del ecosistema ProSolutions.
 */
export declare function CardContent({ children, className, ...props }: CardContentProps): React.JSX.Element;
export declare namespace CardContent {
    var displayName: string;
}
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}
/**
 * Pie de tarjeta del ecosistema ProSolutions.
 */
export declare function CardFooter({ children, className, ...props }: CardFooterProps): React.JSX.Element;
export declare namespace CardFooter {
    var displayName: string;
}
export {};
