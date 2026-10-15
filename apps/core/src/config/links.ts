const env = import.meta.env;

const procvUrl = env.VITE_PROCV_URL ?? "https://procv.prosolutions.page";

export const LINKS = {
  procv: procvUrl,
  procvLogin: `${procvUrl.replace(/\/+$/, "")}/login`,
  projobs: env.VITE_PROJOBS_URL ?? "https://projobs.prosolutions.page",
  projobsPrivacy: env.VITE_PROJOBS_URL
    ? `${env.VITE_PROJOBS_URL}/privacidad.html`
    : "https://projobs.prosolutions.page/privacidad.html",
  jatcDev: env.VITE_JATC_URL ?? "https://github.com/jatc-dev",
} as const;
