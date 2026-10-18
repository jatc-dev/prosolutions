import React from "react";
import { useTranslation } from "react-i18next";
import { ProFooter, ProHeader } from "@prosolutions/ui";

interface PlatformLayoutProps {
  headerActions?: React.ReactNode;
  /** "wide" suits the editor; "default" keeps reading-friendly measure. */
  width?: "default" | "wide";
  hideFooter?: boolean;
  mainClassName?: string;
  children: React.ReactNode;
}

/** Shared shell for module pages: unified ProSolutions header, content area and footer. */
export function PlatformLayout({
  headerActions,
  width = "default",
  hideFooter = false,
  mainClassName = "",
  children,
}: PlatformLayoutProps) {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  return (
    <div className="ui-page flex min-h-screen flex-col">
      <ProHeader activeApp="procv" locale={language === "es" ? "es" : "en"} onLocaleChange={() => i18n.changeLanguage(language === "es" ? "en" : "es")} actions={headerActions} />
      <main
        className={`mx-auto w-full flex-1 px-4 py-6 sm:px-6 ${
          width === "wide" ? "max-w-screen-2xl" : "max-w-7xl"
        } ${mainClassName}`}
      >
        {children}
      </main>
      {hideFooter ? null : <ProFooter />}
    </div>
  );
}
