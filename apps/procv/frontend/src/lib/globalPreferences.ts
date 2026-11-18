import { identityAuthApiUrl } from "./identityUrl";
import { useAuthStore } from "../stores/authStore";

type GlobalPreferences = { theme?: "light" | "dark" | "system"; locale?: "es" | "en" };

export async function saveGlobalPreferences(preferences: GlobalPreferences): Promise<void> {
  const authApi = identityAuthApiUrl();
  const identityApi = authApi.replace(/\/api\/auth$/i, "");
  let token = useAuthStore.getState().accessToken;
  if (!token) return;

  const save = async (accessToken: string) => {
    const csrfResponse = await fetch(`${identityApi}/api/csrf-token`, { credentials: "include" });
    if (!csrfResponse.ok) throw new Error("Could not obtain CSRF token.");
    const csrf = await csrfResponse.json();
    if (!csrf?.csrfToken) throw new Error("Identity did not return a CSRF token.");
    return fetch(`${identityApi}/api/preferences/me`, {
      method: "PUT",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf.csrfToken,
      },
      body: JSON.stringify(preferences),
    });
  };

  let response = await save(token);
  if (response.status === 401) {
    await useAuthStore.getState().refreshToken();
    token = useAuthStore.getState().accessToken;
    if (!token) return;
    response = await save(token);
  }
  if (!response.ok) throw new Error("Unable to save global preferences.");
}
