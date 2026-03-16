/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  clearMocks: true,
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/**/*.d.ts',
    '!lib/**/__tests__/**',
  ],
  coverageThreshold: {
    // Gate critical business logic with per-file thresholds.
    // These are intentionally ratcheted from current baselines to prevent regressions
    // while keeping CI green for a legacy codebase.
    './lib/subscription/feature-gate-service.ts': {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './lib/invitations/service.ts': {
      branches: 15,
      functions: 25,
      lines: 32,
      statements: 32,
    },
  },
};

module.exports = config;
