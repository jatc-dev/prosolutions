import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

interface ThemeStore {
  /** Effective theme actually applied (what components render against). */
  theme: EffectiveTheme;
  /** User preference; 'system' follows the OS/browser preference. */
  preference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  setTheme: (theme: EffectiveTheme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'theme-storage';
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(DARK_MEDIA_QUERY).matches
  );
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system';
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return 'system';
    }
    const parsed = JSON.parse(saved);
    // New shape stores the preference; legacy shape stored the effective theme.
    const preference = parsed?.state?.preference ?? parsed?.state?.theme;
    return preference === 'light' || preference === 'dark' || preference === 'system'
      ? preference
      : 'system';
  } catch {
    return 'system';
  }
}

function resolvePreference(preference: ThemePreference): EffectiveTheme {
  if (preference === 'system') {
    return systemPrefersDark() ? 'dark' : 'light';
  }
  return preference;
}

function applyTheme(resolved: EffectiveTheme): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  // Keep native form controls and scrollbars in sync with the app theme.
  document.documentElement.style.colorScheme = resolved;
}

const initialPreference = readStoredPreference();
applyTheme(resolvePreference(initialPreference));

export const useTheme = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: resolvePreference(initialPreference),
      preference: initialPreference,

      setThemePreference: (preference: ThemePreference) => {
        const resolved = resolvePreference(preference);
        applyTheme(resolved);
        set({ preference, theme: resolved });
      },

      setTheme: (theme: EffectiveTheme) => {
        applyTheme(theme);
        set({ preference: theme, theme });
      },

      toggleTheme: () => {
        const next: EffectiveTheme = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        set({ preference: next, theme: next });
      },
    }),
    {
      name: STORAGE_KEY,
      // Only the preference is persisted; the effective theme is always
      // resolved from the current OS state.
      partialize: state => ({ preference: state.preference }),
    },
  ),
);

// Live-sync with the OS while the user has not made an explicit choice.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mediaQueryList = window.matchMedia(DARK_MEDIA_QUERY);
  mediaQueryList.addEventListener('change', event => {
    if (useTheme.getState().preference !== 'system') {
      return;
    }
    const resolved: EffectiveTheme = event.matches ? 'dark' : 'light';
    applyTheme(resolved);
    useTheme.setState({ theme: resolved });
  });
}
