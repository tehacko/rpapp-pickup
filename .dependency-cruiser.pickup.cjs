/** @type {import('dependency-cruiser').IConfiguration} */

module.exports = {
  forbidden: [
    {
      name: 'shared-not-to-features',
      severity: 'error',
      comment: 'shared/** must not depend on features/** (pickup boundary hygiene)',
      from: { path: '^src/shared' },
      to: { path: '^src/features' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
  },
};
