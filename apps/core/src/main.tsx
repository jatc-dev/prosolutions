import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ConsentBanner, useTheme } from "@prosolutions/ui";
import { CoreLocaleProvider } from "./i18n";
import { PreferencesBootstrap } from "./PreferencesBootstrap";
import { headForPath } from "./public/seo";
import "./index.css";

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  React.useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return <>{children}</>;
}

// Prerendered public pages live at /route/index.html; the static host only
// serves them with a trailing slash. A request without it gets the SPA shell,
// so send the browser (and crawlers that run JS) to the canonical URL.
const { pathname, search, hash } = window.location;
if (pathname !== "/" && !pathname.endsWith("/") && headForPath(pathname)) {
  window.location.replace(`${pathname}/${search}${hash}`);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <CoreLocaleProvider>
        <PreferencesBootstrap />
        <App />
        <ConsentBanner />
      </CoreLocaleProvider>
    </ThemeProvider>
  </React.StrictMode>
);
