import { useEffect, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../stores/authStore";
import { isTokenExpiringSoon, getTimeUntilExpiry } from "../utils/jwt";

const WARNING_THRESHOLD = 60000;

export function useSessionTimeout() {
  const { t } = useTranslation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logout = useAuthStore((state) => state.logout);
  const refreshInFlightRef = useRef(false);
  const checkSession = useCallback(async () => {
    if (!accessToken) return;

    if (isTokenExpiringSoon(accessToken, WARNING_THRESHOLD) && !refreshInFlightRef.current) {
      refreshInFlightRef.current = true;
      try {
        await refreshToken();
        if (!useAuthStore.getState().isAuthenticated) {
          toast.error(t("session.expired", { defaultValue: "Your session has expired. Please sign in again." }));
          logout();
        }
      } finally {
        refreshInFlightRef.current = false;
      }
    }
  }, [accessToken, refreshToken, logout, t]);

  const checkAndMaybeRefresh = useCallback(() => {
    if (!accessToken) return;

    const timeLeft = getTimeUntilExpiry(accessToken);

    if (timeLeft <= 0) {
      logout();
      return;
    }

    void checkSession();
  }, [accessToken, checkSession, logout]);

  useEffect(() => {
    if (!accessToken) return;

    const interval = setInterval(checkAndMaybeRefresh, 5000);

    return () => clearInterval(interval);
  }, [accessToken, checkAndMaybeRefresh]);
}
