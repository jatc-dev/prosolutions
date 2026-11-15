import { useEffect, useRef } from "react";

interface UseAuthenticatedCVLoaderOptions {
  cvId?: string;
  authLoading: boolean;
  isAuthenticated: boolean;
  loadCV: (cvId: string) => Promise<void>;
}

export function useAuthenticatedCVLoader({
  cvId,
  authLoading,
  isAuthenticated,
  loadCV,
}: UseAuthenticatedCVLoaderOptions): void {
  const loadedCvIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!cvId) {
      loadedCvIdRef.current = null;
      return;
    }

    if (authLoading || !isAuthenticated || loadedCvIdRef.current === cvId) {
      return;
    }

    loadedCvIdRef.current = cvId;
    void loadCV(cvId);
  }, [authLoading, cvId, isAuthenticated, loadCV]);
}
