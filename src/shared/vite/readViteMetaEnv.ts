export function readViteMetaEnv(key: keyof ImportMetaEnv): string | undefined {
  const raw = import.meta.env[key];
  return typeof raw === 'string' ? raw : undefined;
}
