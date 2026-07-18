/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Kill-switch: show persistent Force refresh control in PickupPwaLifecycle. */
  readonly VITE_PWA_FORCE_UPDATE?: string;
  /** Optional app version label for More drawer / build chrome. */
  readonly VITE_APP_VERSION?: string;
  /** Optional build id when version is unset. */
  readonly VITE_BUILD_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
