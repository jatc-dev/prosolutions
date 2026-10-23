/**
 * ProIdentity — ProJobs client auth
 * Valida el access token JWT emitido por ProIdentity y gestiona
 * el acceso a secciones personales (postulaciones, empleos guardados).
 */

(function () {
  const IDENTITY_URL =
    window.__PROJOBS_IDENTITY_URL__ ||
    "https://identity.prosolutions.page";
  const PROJOBS_API_URL =
    window.__PROJOBS_API_URL__ ||
    window.location.origin;
  const ACCESS_TOKEN_KEY = "projobs_access_token";
  const MODULE_REQUIRED = "PROJOBS";

  let accessToken = null;
  let userProfile = null;

  function getStoredToken() {
    try {
      const raw = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.accessToken || null;
    } catch {
      return null;
    }
  }

  function setStoredToken(token) {
    try {
      sessionStorage.setItem(
        ACCESS_TOKEN_KEY,
        JSON.stringify({ accessToken: token, updatedAt: Date.now() }),
      );
    } catch {}
  }

  function clearStoredToken() {
    try {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {}
  }

  async function validateToken(token) {
    try {
      const response = await fetch(`${IDENTITY_URL}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (response.status === 401 || response.status === 403) {
        clearStoredToken();
        return null;
      }

      if (!response.ok) {
        clearStoredToken();
        return null;
      }

      const data = await response.json();
      return data.user || data;
    } catch {
      return null;
    }
  }

  async function refreshAccessToken() {
    try {
      const response = await fetch(`${IDENTITY_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.accessToken) return null;
      setStoredToken(data.accessToken);
      return data.accessToken;
    } catch {
      // The module remains usable anonymously when there is no active session.
      return null;
    }
  }

  async function initAuth() {
    accessToken = getStoredToken();

    if (accessToken) {
      userProfile = await validateToken(accessToken);
    }

    // First visit to this subdomain has no localStorage/sessionStorage token;
    // bootstrap from ProIdentity's HttpOnly refresh cookie instead of URL tokens.
    if (!userProfile) {
      accessToken = await refreshAccessToken();
      if (accessToken) {
        userProfile = await validateToken(accessToken);
      }
    }

    if (!userProfile) {
      accessToken = null;
      clearStoredToken();
    }

    updateAuthUI();

    // Exponer para uso global
    window.proJobsAuth = {
      isAuthenticated: () => !!userProfile,
      getUser: () => userProfile,
      getToken: () => accessToken,
      login: () => {
        const redirectUri = encodeURIComponent(window.location.href);
        const loginUrl = window.__PROJOBS_LOGIN_URL__ || "https://prosolutions.page/login";
        window.location.href = `${loginUrl}?redirect_uri=${redirectUri}`;
      },
      logout: async () => {
        try {
          await fetch(`${IDENTITY_URL}/api/auth/logout`, {
            method: "POST",
            credentials: "include",
          });
        } finally {
          clearStoredToken();
          accessToken = null;
          userProfile = null;
          updateAuthUI();
          window.location.reload();
        }
      },
    };
  }

  function updateAuthUI() {
    const authed = !!userProfile;

    // Mostrar/ocultar botones de postular y guardar empleo
    document.querySelectorAll("[data-auth-required]").forEach((el) => {
      el.style.display = authed ? "" : "none";
    });

    document.querySelectorAll("[data-auth-anonymous]").forEach((el) => {
      el.style.display = authed ? "none" : "";
    });

    // Actualizar enlaces de login/perfil en la navegación
    const navLinks = document.querySelectorAll(".pro-links a");
    navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (
        href.includes("procv.prosolutions.page") ||
        href.includes("/login")
      ) {
        if (authed) {
          link.textContent = link.dataset.authedLabel || "Mi Perfil";
          link.onclick = (e) => {
            e.preventDefault();
            window.location.href = `/profile.html?user=${encodeURIComponent(
              userProfile?.email || "",
            )}`;
          };
        } else {
          link.textContent = link.dataset.anonLabel || "Iniciar sesión";
          link.onclick = (e) => {
            e.preventDefault();
            window.proJobsAuth.login();
          };
        }
      }
    });

    // Postular siempre debe permitir continuar a la oferta pública. Si hay sesión,
    // registramos la intención de continuar en el sitio externo sin bloquear el enlace.
    document.querySelectorAll("[data-action='apply']").forEach((btn) => {
      btn.onclick = async (e) => {
        const rawUrl = btn.dataset.jobUrl || btn.getAttribute("href") || "";
        let destination;
        try {
          destination = new URL(rawUrl, window.location.href);
          if (!["https:", "http:"].includes(destination.protocol)) throw new Error("Invalid protocol");
        } catch {
          e.preventDefault();
          alert("El enlace de esta oferta no es válido.");
          return;
        }

        if (!authed) return; // El enlace nativo abre la oferta sin exigir una cuenta.

        e.preventDefault();
        const jobId = btn.dataset.jobId || "";
        const jobTitle = btn.dataset.jobTitle || "";
        const company = btn.dataset.company || "";
        try {
          const response = await fetch(`${PROJOBS_API_URL}/api/applications`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              jobId,
              jobUrl: destination.toString(),
              jobTitle,
              company,
            }),
          });
          if (response.status === 401) {
            clearStoredToken();
            accessToken = null;
            userProfile = null;
            updateAuthUI();
          }
        } catch {
          // El registro es secundario: un fallo de API no debe impedir postularse.
        }
        window.location.assign(destination.toString());
      };
    });

    // Guardar una oferta sí es una función personal y requiere una sesión válida.
    document.querySelectorAll("[data-action='save-job']").forEach((btn) => {
      btn.onclick = async (e) => {
        e.preventDefault();
        if (!authed) {
          window.proJobsAuth.login();
          return;
        }
        const jobId = btn.dataset.jobId || "";
        const jobUrl = btn.dataset.jobUrl || "";
        const jobTitle = btn.dataset.jobTitle || "";
        const company = btn.dataset.company || "";
        const originalLabel = btn.textContent;
        btn.setAttribute("aria-busy", "true");
        btn.disabled = true;
        try {
          const response = await fetch(`${PROJOBS_API_URL}/api/saved-jobs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ jobId, jobUrl, jobTitle, company }),
          });
          const data = await response.json().catch(() => ({}));
          if (response.status === 401) {
            clearStoredToken();
            window.location.reload();
            return;
          }
          if (!response.ok) throw new Error(data.message || "Save failed");
          btn.textContent = document.documentElement.lang === "en" ? "✓ Saved" : "✓ Guardado";
          btn.setAttribute("aria-pressed", "true");
        } catch (error) {
          alert(document.documentElement.lang === "en" ? "Could not save this job. Please try again." : "No se pudo guardar el empleo. Intenta de nuevo.");
          btn.textContent = originalLabel;
        } finally {
          btn.disabled = false;
          btn.removeAttribute("aria-busy");
        }
      };
    });
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
  } else {
    initAuth();
  }
})();
