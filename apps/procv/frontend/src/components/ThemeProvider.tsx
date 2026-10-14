import React, { useEffect } from 'react';
import { useTheme } from '../stores/themeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Effective theme (already resolved from preference + OS state).
  const { theme } = useTheme();

  useEffect(() => {
    // Apply theme to document - Tailwind uses the 'dark' class
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Keep UA form-control rendering in sync with the app theme so the OS
    // preference never paints dark fields while the app is in light mode.
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return <>{children}</>;
}