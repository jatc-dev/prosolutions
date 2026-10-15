import React from "react";
import { AppHeader } from "../../components/AppHeader";
import { Footer } from "../../components/Footer";

interface PlatformLayoutProps {
  headerActions?: React.ReactNode;
  /** "wide" suits the editor; "default" keeps reading-friendly measure. */
  width?: "default" | "wide";
  hideFooter?: boolean;
  mainClassName?: string;
  children: React.ReactNode;
}

/** Shared shell for module pages: unified header, content area and footer. */
export function PlatformLayout({
  headerActions,
  width = "default",
  hideFooter = false,
  mainClassName = "",
  children,
}: PlatformLayoutProps) {
  return (
    <div className="ui-page flex min-h-screen flex-col">
      <AppHeader showUserInfo={false} rightExtra={headerActions} />
      <main
        className={`mx-auto w-full flex-1 px-4 py-6 sm:px-6 ${
          width === "wide" ? "max-w-screen-2xl" : "max-w-7xl"
        } ${mainClassName}`}
      >
        {children}
      </main>
      {hideFooter ? null : <Footer />}
    </div>
  );
}
