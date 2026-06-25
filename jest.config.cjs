/** @type {import('jest').Config} */
module.exports = {
  displayName: 'pickup-app',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/*.ts',
  ],
  moduleNameMapper: {
    '^pi-kiosk-shared/clientLogRedaction$':
      '<rootDir>/../shared/src/clientLogRedaction.ts',
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
};
