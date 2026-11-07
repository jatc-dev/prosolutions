/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IDENTITY_API_URL?: string;
  readonly VITE_PROCV_URL?: string;
  readonly VITE_PROJOBS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
