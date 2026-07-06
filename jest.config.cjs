/** @type {import('jest').Config} */
module.exports = {
  displayName: 'pickup-app',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/*.test.tsx',
    '<rootDir>/src/**/__tests__/**/*.ts',
    '<rootDir>/src/**/__tests__/**/*.tsx',
  ],
  moduleNameMapper: {
    '^pi-kiosk-shared/clientLogRedaction$':
      '<rootDir>/../shared/src/clientLogRedaction.ts',
    '^pi-kiosk-shared/sentry/captureRateLimitBreadcrumb$':
      '<rootDir>/../shared/src/sentry/captureRateLimitBreadcrumb.ts',
    '^pi-kiosk-shared/sentry/captureConflictBreadcrumb$':
      '<rootDir>/../shared/src/sentry/captureConflictBreadcrumb.ts',
    '^pi-kiosk-shared/sentry$': '<rootDir>/../shared/src/sentry/initSentry.ts',
    '^pi-kiosk-shared$': '<rootDir>/../shared/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          isolatedModules: true,
        },
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(pi-kiosk-shared)/)'],
};
