/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROJOBS_API_URL?: string;
  readonly VITE_IDENTITY_API_URL?: string;
  readonly VITE_CORE_URL?: string;
  readonly VITE_PROCV_URL?: string;
  readonly VITE_PROJOBS_URL?: string;
  readonly VITE_ADSENSE_CLIENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
