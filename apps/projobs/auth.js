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
    "https://projobs-api-0clw.onrender.com";
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
    window.dispatchEvent(new CustomEvent("projobs:auth-ready"));
  }

  function displayUserName(user) {
    if (!user) return "";
    const fullName = [
      user.firstName || user.first_name,
      user.lastName || user.last_name,
    ].filter(Boolean).join(" ").trim();
    const candidate = user.fullName || user.full_name || user.displayName ||
      user.display_name || user.name || fullName;
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (typeof user.email === "string" && user.email.includes("@")) {
      return user.email.split("@")[0];
    }
    return "";
  }

  function updateAuthUI() {
    const authed = !!userProfile;

    // Unified avatar dropdown: profile details and sign-out live in one place.
    const nav = document.querySelector(".pro-links");
    let profileMenu = nav?.querySelector("[data-projobs-profile-menu]");
    if (nav && !profileMenu) {
      profileMenu = document.createElement("details");
      profileMenu.dataset.projobsProfileMenu = "true";
      profileMenu.className = "projobs-profile-menu";
      profileMenu.style.cssText = "position:relative;display:inline-flex;align-items:center;";
      const summary = document.createElement("summary");
      summary.style.cssText = "display:inline-flex;align-items:center;gap:8px;min-height:40px;max-width:220px;padding:4px 12px 4px 4px;border:1px solid #cbd5e1;border-radius:999px;cursor:pointer;list-style:none;font:inherit;font-size:13px;font-weight:650;color:inherit;";
      summary.setAttribute("aria-label", document.documentElement.lang === "en" ? "Open profile menu" : "Abrir menú de perfil");
      const avatar = document.createElement("span");
      avatar.dataset.profileAvatar = "true";
      avatar.style.cssText = "display:inline-flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:999px;background:#e0e7ff;color:#3730a3;font-weight:800;flex:none;";
      const name = document.createElement("span");
      name.dataset.profileName = "true";
      name.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      const caret = document.createElement("span");
      caret.setAttribute("aria-hidden", "true");
      caret.textContent = "⌄";
      summary.append(avatar, name, caret);
      const menu = document.createElement("div");
      menu.dataset.profileDropdown = "true";
      menu.style.cssText = "position:absolute;right:0;top:calc(100% + 8px);z-index:1000;width:260px;padding:8px;border:1px solid #cbd5e1;border-radius:16px;background:#fff;color:#0f172a;box-shadow:0 16px 40px rgba(15,23,42,.18);";
      const identity = document.createElement("div");
      identity.dataset.profileIdentity = "true";
      identity.style.cssText = "padding:10px 12px;border-bottom:1px solid #e2e8f0;margin-bottom:4px;";
      const profileName = document.createElement("p");
      profileName.dataset.profileFullName = "true";
      profileName.style.cssText = "font-size:14px;font-weight:700;overflow-wrap:anywhere;";
      const profileEmail = document.createElement("p");
      profileEmail.dataset.profileEmail = "true";
      profileEmail.style.cssText = "margin-top:4px;font-size:12px;color:#64748b;overflow-wrap:anywhere;";
      identity.append(profileName, profileEmail);
      const accountLink = document.createElement("a");
      accountLink.href = "/mi-cuenta.html";
      accountLink.dataset.profileAccount = "true";
      accountLink.style.cssText = "display:block;padding:10px 12px;border-radius:10px;color:inherit;text-decoration:none;font-size:13px;";
      const signOut = document.createElement("button");
      signOut.type = "button";
      signOut.dataset.projobsLogout = "true";
      signOut.style.cssText = "display:block;width:100%;text-align:left;padding:10px 12px;border:0;border-radius:10px;background:transparent;color:#dc2626;font:inherit;font-size:13px;font-weight:650;cursor:pointer;";
      signOut.addEventListener("click", () => {
        if (window.proJobsAuth?.logout) window.proJobsAuth.logout();
      });
      menu.append(identity, accountLink, signOut);
      profileMenu.append(summary, menu);
      nav.appendChild(profileMenu);
      document.addEventListener("click", (event) => {
        if (profileMenu.open && !profileMenu.contains(event.target)) profileMenu.open = false;
      });
    }
    if (profileMenu) {
      profileMenu.hidden = !authed;
      const name = displayUserName(userProfile);
      const email = typeof userProfile?.email === "string" ? userProfile.email : "";
      const avatar = profileMenu.querySelector("[data-profile-avatar]");
      const shortName = profileMenu.querySelector("[data-profile-name]");
      const fullName = profileMenu.querySelector("[data-profile-full-name]");
      const profileEmail = profileMenu.querySelector("[data-profile-email]");
      const accountLink = profileMenu.querySelector("[data-profile-account]");
      const signOut = profileMenu.querySelector("[data-projobs-logout]");
      if (avatar) avatar.textContent = name ? name.charAt(0).toLocaleUpperCase() : "U";
      if (shortName) shortName.textContent = name || (document.documentElement.lang === "en" ? "My account" : "Mi cuenta");
      if (fullName) fullName.textContent = name || (document.documentElement.lang === "en" ? "Signed in" : "Sesión iniciada");
      if (profileEmail) profileEmail.textContent = email;
      if (accountLink) accountLink.textContent = document.documentElement.lang === "en" ? "My profile" : "Mi perfil";
      if (signOut) signOut.textContent = document.documentElement.lang === "en" ? "Sign out" : "Cerrar sesión";
    }

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
      if (!href.includes("/login")) return;
      link.hidden = authed;
      if (!authed) {
        link.textContent = link.dataset.anonLabel || "Iniciar sesión";
        link.onclick = (e) => {
          e.preventDefault();
          window.proJobsAuth.login();
        };
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

  // Dynamic job cards are recreated after filtering or changing language.
  // Rebind save/apply handlers whenever that happens.
  window.addEventListener("projobs:jobs-rendered", updateAuthUI);

  // Inicializar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
  } else {
    initAuth();
  }
})();
