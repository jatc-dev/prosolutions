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
  const toastIdRef = useRef<string | null>(null);

  const checkSession = useCallback(async () => {
    if (!accessToken) return;

    if (isTokenExpiringSoon(accessToken, WARNING_THRESHOLD)) {
      const timeLeft = Math.ceil(getTimeUntilExpiry(accessToken) / 1000);

      if (!toastIdRef.current) {
        toastIdRef.current = toast.loading(
          t("session.expiringSoon", {
            seconds: timeLeft,
            defaultValue: `Your session expires in ${timeLeft} seconds. Refreshing...`,
          }),
          { duration: Infinity }
        );
      }

      try {
        await refreshToken();
        if (toastIdRef.current) {
          toast.success(t("session.refreshed", { defaultValue: "Session renewed successfully" }), { id: toastIdRef.current });
          toastIdRef.current = null;
        }
      } catch {
        if (toastIdRef.current) {
          toast.error(
            t("session.expired", { defaultValue: "Your session has expired. Please sign in again." }),
            { id: toastIdRef.current }
          );
          toastIdRef.current = null;
        }
        logout();
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
