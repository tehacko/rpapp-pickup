/** Display build/version for More drawer — prefer Vite inject, else package version. */
export const PICKUP_BUILD_LABEL: string = (() => {
  const fromEnv = import.meta.env.VITE_APP_VERSION;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  const fromBuild = import.meta.env.VITE_BUILD_ID;
  if (typeof fromBuild === 'string' && fromBuild.trim().length > 0) {
    return fromBuild.trim();
  }
  return '0.1.0';
})();
