import fs from 'node:fs';
import path from 'node:path';

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readPackageVersion(appRoot) {
  try {
    const raw = fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed.version === 'string' && parsed.version.trim().length > 0
      ? parsed.version.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

/** @param {string} appRoot @param {Record<string, string>} env */
export function buildAppVersionDefine(appRoot, env) {
  const appVersion = firstNonEmpty(
    env.VITE_APP_VERSION,
    env.REACT_APP_VERSION,
    process.env.VITE_APP_VERSION,
    process.env.REACT_APP_VERSION,
    readPackageVersion(appRoot),
  );

  const buildId = firstNonEmpty(
    env.VITE_BUILD_ID,
    env.REACT_APP_BUILD_ID,
    env.VITE_BUILD_VERSION,
    env.REACT_APP_BUILD_VERSION,
    process.env.VITE_BUILD_ID,
    process.env.REACT_APP_BUILD_ID,
    process.env.VITE_BUILD_VERSION,
    process.env.REACT_APP_BUILD_VERSION,
    process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7),
    process.env.GITHUB_SHA?.slice(0, 7),
    process.env.SOURCE_VERSION?.slice(0, 7),
  );

  const define = {};
  if (appVersion !== undefined) {
    define['import.meta.env.VITE_APP_VERSION'] = JSON.stringify(appVersion);
  }
  if (buildId !== undefined) {
    define['import.meta.env.VITE_BUILD_ID'] = JSON.stringify(buildId);
  }
  return define;
}
