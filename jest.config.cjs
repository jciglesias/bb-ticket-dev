module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(convex)/)'
  ],
  collectCoverageFrom: [
    'convex/blackbox.ts',
    'convex/api.ts',
    'convex/development.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/_generated/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@convex/(.*)$': '<rootDir>/convex/$1'
  },
  testTimeout: 30000,
  verbose: true,
  extensionsToTreatAsEsm: ['.ts']
};
