import { useCallback, useEffect, useRef, useState } from "react";
import { CVData } from "../types";
import { createInitialCVData } from "../stores/cvEditorStore";

const STORAGE_KEY = "procv_guest_resume";
const DEBOUNCE_DELAY = 500;

const isBrowser = typeof window !== "undefined";

const safeParse = (raw: string | null): CVData | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as CVData;
    }
  } catch (error) {
    console.error("Error parsing guest resume from localStorage:", error);
  }
  return null;
};

export function useGuestResume(initialData?: CVData) {
  const initialRef = useRef<CVData>(initialData ?? createInitialCVData());
  const [data, setData] = useState<CVData>(initialRef.current);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (!isBrowser) return;

    const saved = safeParse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      setData(saved);
    }
    setIsHydrated(true);
  }, []);

  // Debounced auto-save
  const scheduleSave = useCallback(
    (value: CVData) => {
      if (!isBrowser) return;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      setIsSaving(true);
      debounceRef.current = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
          setLastSaved(new Date());
        } catch (error) {
          console.error("Error saving guest resume to localStorage:", error);
        } finally {
          setIsSaving(false);
          debounceRef.current = null;
        }
      }, DEBOUNCE_DELAY);
    },
    []
  );

  const setResume = useCallback(
    (updater: CVData | ((prev: CVData) => CVData)) => {
      setData((prev) => {
        const next = typeof updater === "function" ? (updater as (prev: CVData) => CVData)(prev) : updater;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const updateField = useCallback(
    <K extends keyof CVData>(key: K, value: CVData[K]) => {
      setResume((prev) => ({ ...prev, [key]: value }));
    },
    [setResume]
  );

  const clearGuestData = useCallback(() => {
    if (!isBrowser) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing guest resume from localStorage:", error);
    }

    const fresh = initialRef.current;
    setData(fresh);
    setLastSaved(null);
    setIsSaving(false);
  }, []);

  const saveImmediately = useCallback(() => {
    if (!isBrowser) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving guest resume to localStorage:", error);
    } finally {
      setIsSaving(false);
    }
  }, [data]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    data,
    setResume,
    updateField,
    saveImmediately,
    clearGuestData,
    isHydrated,
    isSaving,
    lastSaved,
  };
}