import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useTheme } from "@prosolutions/ui";
import { CoreLocaleProvider } from "./i18n";
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <CoreLocaleProvider>
        <App />
      </CoreLocaleProvider>
    </ThemeProvider>
  </React.StrictMode>
);
