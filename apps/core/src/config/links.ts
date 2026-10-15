const env = import.meta.env;

export const LINKS = {
  procv: env.VITE_PROCV_URL ?? "https://procv-platform.onrender.com",
  projobs: env.VITE_PROJOBS_URL ?? "https://projobs.prosolutions.page",
  projobsPrivacy: env.VITE_PROJOBS_URL
    ? `${env.VITE_PROJOBS_URL}/privacidad.html`
    : "https://projobs.prosolutions.page/privacidad.html",
  jatcDev: env.VITE_JATC_URL ?? "https://github.com/jatc-dev",
} as const;
