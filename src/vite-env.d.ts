/// <reference types="vite/client" />

interface Window {
  /** Playwright chaos probe — set via `addInitScript`; never via `?e2eThrow=` alone. */
  __RPAPP_E2E_THROW__?: string;
}

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
