/** @type {import('jest').Config} */
module.exports = {
  displayName: 'pickup-app',
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  rootDir: '.',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/*.test.tsx',
    '<rootDir>/src/**/__tests__/**/*.ts',
    '<rootDir>/src/**/__tests__/**/*.tsx',
  ],
  moduleNameMapper: {
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '^react/jsx-runtime$': '<rootDir>/node_modules/react/jsx-runtime',
    '^react/jsx-dev-runtime$': '<rootDir>/node_modules/react/jsx-dev-runtime',
    '^pi-kiosk-shared/clientLogRedaction$':
      '<rootDir>/../shared/src/clientLogRedaction.ts',
    '^pi-kiosk-shared/crossTab$': '<rootDir>/../shared/src/crossTab/index.ts',
    '^pi-kiosk-shared/sentry/captureRateLimitBreadcrumb$':
      '<rootDir>/../shared/src/sentry/captureRateLimitBreadcrumb.ts',
    '^pi-kiosk-shared/sentry/captureConflictBreadcrumb$':
      '<rootDir>/../shared/src/sentry/captureConflictBreadcrumb.ts',
    '^pi-kiosk-shared/sentry$': '<rootDir>/../shared/src/sentry/initSentry.ts',
    '^pi-kiosk-shared$': '<rootDir>/../shared/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js)$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.json' }],
  },
  transformIgnorePatterns: ['node_modules/(?!(pi-kiosk-shared)/)'],
};