export function readViteMetaEnv(key: keyof ImportMetaEnv): string | undefined {
  const raw = import.meta.env[key];
  return typeof raw === 'string' ? raw : undefined;
}

/** Vite dev-mode flag (`import.meta.env.DEV`). Jest shim returns `false`. */
export function isViteDev(): boolean {
  return import.meta.env.DEV;
}
