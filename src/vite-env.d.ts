/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Kill-switch: show persistent Force refresh control in PickupPwaLifecycle. */
  readonly VITE_PWA_FORCE_UPDATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
