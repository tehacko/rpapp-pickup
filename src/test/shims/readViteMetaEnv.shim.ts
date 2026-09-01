/**
 * Jest shim for `shared/vite/readViteMetaEnv.ts` — no `import.meta` (see jest.config.cjs).
 */
export function readViteMetaEnv(_key: string): string | undefined {
  return undefined;
}

export function isViteDev(): boolean {
  return false;
}
