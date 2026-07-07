/** @type {import('jest').Config} */
export default {
  displayName: 'pickup-app',
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/shared/ui/**/*.{ts,tsx}',
    '!src/shared/ui/**/*.d.ts',
    '!src/shared/ui/**/*.test.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // MFE-v3-G-COV-PICKUP (V1-49): measured baseline via D-08 integration tests exercising
  // ScreenState through ScanScreenView + QueueScreenView (mirrors MFE-v3-G-COV-KIOSK pattern).
  coverageThreshold: {
    './src/shared/ui/': {
      statements: 70,
      branches: 0,
      functions: 60,
      lines: 70,
    },
  },

  moduleNameMapper: {
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '^react/jsx-runtime$': '<rootDir>/node_modules/react/jsx-runtime',
    '^react/jsx-dev-runtime$': '<rootDir>/node_modules/react/jsx-dev-runtime',
    '^pi-kiosk-shared/ui$': '<rootDir>/../shared/src/ui/index.ts',
    '^pi-kiosk-shared/clientLogRedaction$':
      '<rootDir>/../shared/src/clientLogRedaction.ts',
    '^pi-kiosk-shared/sentry/captureRateLimitBreadcrumb$':
      '<rootDir>/../shared/src/sentry/captureRateLimitBreadcrumb.ts',
    '^pi-kiosk-shared/sentry/captureConflictBreadcrumb$':
      '<rootDir>/../shared/src/sentry/captureConflictBreadcrumb.ts',
    '^pi-kiosk-shared/sentry$': '<rootDir>/../shared/src/sentry/initSentry.ts',
    '^pi-kiosk-shared/crossTab$': '<rootDir>/../shared/src/crossTab/index.ts',
    '^pi-kiosk-shared$': '<rootDir>/../shared/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(pi-kiosk-shared|@marsidev)/)',
  ],
  transform: {
    '^.+\\.(ts|tsx|js)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
        },
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 10000,
};
